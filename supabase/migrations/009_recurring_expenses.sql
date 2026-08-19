-- Couple OS — Budget OS Phase 2: recurring (fixed) expenses
-- Ref: docs/budgeting/specs.md §3.7, §4.5 — docs/budgeting/roadmap.md Phase 2
--
-- Rent, utilities and subscriptions are declared once and post themselves.
-- Idempotency is guaranteed by a unique index, not by application logic: the
-- cron and the app-open catch-up may both run any number of times.

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────

do $$ begin
  create type recurrence_freq as enum
    ('WEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type expense_source as enum ('MANUAL', 'RECURRING');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────
-- RECURRING EXPENSES
-- ─────────────────────────────────────────

create table public.recurring_expenses (
    id                  uuid primary key default gen_random_uuid(),
    couple_id           uuid not null references public.couples(id) on delete cascade,
    label               text not null,
    amount              numeric(12,2) not null check (amount > 0),
    category_id         uuid not null references public.expense_categories(id) on delete restrict,
    paid_by_member_id   uuid references public.household_members(id) on delete set null,
    frequency           recurrence_freq not null default 'MONTHLY',
    day_of_month        integer check (day_of_month is null or day_of_month between -1 and 31),
    day_of_week         integer check (day_of_week is null or day_of_week between 0 and 6),
    start_date          date not null,
    end_date            date,
    auto_post           boolean not null default true,
    variable_amount     boolean not null default false,
    active              boolean not null default true,
    note                text,
    last_posted_occurrence date,
    pending_occurrence     date,   -- occurrence waiting for the user to confirm
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create index recurring_expenses_couple_idx
    on public.recurring_expenses (couple_id, active, frequency);

create trigger set_updated_at before update on public.recurring_expenses
  for each row execute function public.set_updated_at();

-- A variable amount always needs a human confirmation.
create or replace function public.normalize_recurring_flags()
returns trigger
language plpgsql
as $$
begin
    if new.variable_amount then
        new.auto_post := false;
    end if;
    return new;
end;
$$;

create trigger normalize_recurring_flags
    before insert or update on public.recurring_expenses
    for each row execute function public.normalize_recurring_flags();

-- ─────────────────────────────────────────
-- EXPENSES: where an expense comes from, and which period it belongs to
-- ─────────────────────────────────────────

alter table public.expenses
    add column if not exists source               expense_source not null default 'MANUAL',
    add column if not exists recurring_expense_id uuid references public.recurring_expenses(id) on delete set null,
    add column if not exists occurrence_date      date,
    add column if not exists period_key           date;

-- Idempotency anchor. The specs key it on `period_key`; it is keyed on the
-- occurrence date instead so that a WEEKLY recurrence can post more than once
-- inside the same budget month. For every other frequency the two coincide.
create unique index expenses_recurring_occurrence_unique
    on public.expenses (recurring_expense_id, occurrence_date)
    where recurring_expense_id is not null;

-- Accrual month: the month of `date` unless explicitly overridden
-- (a December utility bill paid in January).
create or replace function public.set_expense_period_key()
returns trigger
language plpgsql
as $$
begin
    new.period_key := coalesce(new.period_key, date_trunc('month', new.date)::date);
    return new;
end;
$$;

create trigger set_expense_period_key
    before insert or update on public.expenses
    for each row execute function public.set_expense_period_key();

update public.expenses
   set period_key = date_trunc('month', date)::date
 where period_key is null;

create index if not exists expenses_period_category_idx
    on public.expenses (couple_id, period_key, category_id);

-- ─────────────────────────────────────────
-- DUE DATES
-- ─────────────────────────────────────────

create or replace function public.recurrence_step_months(p_freq recurrence_freq)
returns integer
language sql
immutable
as $$
    select case p_freq
        when 'MONTHLY'    then 1
        when 'BIMONTHLY'  then 2
        when 'QUARTERLY'  then 3
        when 'SEMIANNUAL' then 6
        when 'ANNUAL'     then 12
        else 0                      -- WEEKLY is handled separately
    end;
$$;

-- Day 31 in February resolves to the last day of the month; -1 means
-- explicitly "the last day".
create or replace function public.resolve_due_date(p_period date, p_day integer)
returns date
language sql
immutable
as $$
    select case
        when p_day is null or p_day = 0 then date_trunc('month', p_period)::date
        when p_day = -1 then (date_trunc('month', p_period) + interval '1 month - 1 day')::date
        else (
            date_trunc('month', p_period)
            + (least(
                   p_day,
                   extract(day from (date_trunc('month', p_period) + interval '1 month - 1 day'))::int
               ) - 1) * interval '1 day'
        )::date
    end;
$$;

-- Every occurrence of a recurrence up to `p_up_to`.
create or replace function public.recurring_occurrences(p_recurring_id uuid, p_up_to date)
returns setof date
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    r        public.recurring_expenses;
    v_date   date;
    v_period date;
    v_step   int;
begin
    select * into r from public.recurring_expenses where id = p_recurring_id;
    if not found or not r.active then
        return;
    end if;

    if r.frequency = 'WEEKLY' then
        v_date := r.start_date;
        if r.day_of_week is not null then
            v_date := v_date + ((r.day_of_week - extract(dow from v_date)::int + 7) % 7);
        end if;
        while v_date <= p_up_to loop
            exit when r.end_date is not null and v_date > r.end_date;
            return next v_date;
            v_date := v_date + 7;
        end loop;
        return;
    end if;

    v_step   := public.recurrence_step_months(r.frequency);
    v_period := date_trunc('month', r.start_date)::date;

    loop
        v_date := public.resolve_due_date(
            v_period,
            coalesce(r.day_of_month, extract(day from r.start_date)::int)
        );
        exit when v_date > p_up_to;
        exit when r.end_date is not null and v_date > r.end_date;

        if v_date >= r.start_date then
            return next v_date;
        end if;

        v_period := (v_period + (v_step || ' months')::interval)::date;
    end loop;
end;
$$;

-- ─────────────────────────────────────────
-- POSTING
-- Idempotent: run it three times, it posts once.
-- ─────────────────────────────────────────

create or replace function public.post_due_recurring(
    p_couple_id uuid,
    p_up_to     date default current_date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    r          record;
    v_occ      date;
    v_posted   int := 0;
    v_inserted int;
begin
    if auth.uid() is not null and p_couple_id is distinct from public.get_couple_id() then
        raise exception 'This household is not yours';
    end if;

    for r in
        select * from public.recurring_expenses
        where couple_id = p_couple_id and active and start_date <= p_up_to
    loop
        for v_occ in select * from public.recurring_occurrences(r.id, p_up_to) loop

            if r.auto_post then
                insert into public.expenses (
                    couple_id, amount, category_id, note, date, period_key,
                    paid_by_member_id, source, recurring_expense_id, occurrence_date
                )
                values (
                    r.couple_id, r.amount, r.category_id, r.label, v_occ,
                    date_trunc('month', v_occ)::date,
                    r.paid_by_member_id, 'RECURRING', r.id, v_occ
                )
                on conflict (recurring_expense_id, occurrence_date)
                    where recurring_expense_id is not null do nothing;

                get diagnostics v_inserted = row_count;
                v_posted := v_posted + v_inserted;

                if v_inserted > 0 then
                    update public.recurring_expenses
                       set last_posted_occurrence = greatest(coalesce(last_posted_occurrence, v_occ), v_occ)
                     where id = r.id;
                end if;

            else
                -- Needs confirmation: keep the oldest unconfirmed occurrence.
                if not exists (
                    select 1 from public.expenses e
                    where e.recurring_expense_id = r.id and e.occurrence_date = v_occ
                ) then
                    update public.recurring_expenses
                       set pending_occurrence = least(coalesce(pending_occurrence, v_occ), v_occ)
                     where id = r.id;
                end if;
            end if;
        end loop;
    end loop;

    return v_posted;
end;
$$;

-- Confirm a pending occurrence (variable amount, or manual posting).
create or replace function public.confirm_recurring_occurrence(
    p_recurring_id uuid,
    p_amount       numeric default null,
    p_occurrence   date    default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    r          public.recurring_expenses;
    v_occ      date;
    v_expense  uuid;
begin
    select * into r from public.recurring_expenses where id = p_recurring_id;
    if not found then
        raise exception 'Recurring expense not found';
    end if;
    perform public.assert_member_can_write(r.couple_id);

    v_occ := coalesce(p_occurrence, r.pending_occurrence);
    if v_occ is null then
        raise exception 'Nothing to confirm on this recurring expense';
    end if;

    insert into public.expenses (
        couple_id, amount, category_id, note, date, period_key,
        paid_by_member_id, source, recurring_expense_id, occurrence_date
    )
    values (
        r.couple_id, coalesce(p_amount, r.amount), r.category_id, r.label, v_occ,
        date_trunc('month', v_occ)::date,
        r.paid_by_member_id, 'RECURRING', r.id, v_occ
    )
    on conflict (recurring_expense_id, occurrence_date)
        where recurring_expense_id is not null do update
        set amount = excluded.amount
    returning id into v_expense;

    update public.recurring_expenses
       set pending_occurrence     = null,
           last_posted_occurrence = greatest(coalesce(last_posted_occurrence, v_occ), v_occ),
           amount                 = case when r.variable_amount then coalesce(p_amount, r.amount) else r.amount end
     where id = r.id;

    return v_expense;
end;
$$;

-- Skip one occurrence without posting it.
create or replace function public.skip_recurring_occurrence(
    p_recurring_id uuid,
    p_occurrence   date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    r     public.recurring_expenses;
    v_occ date;
begin
    select * into r from public.recurring_expenses where id = p_recurring_id;
    if not found then
        raise exception 'Recurring expense not found';
    end if;
    perform public.assert_member_can_write(r.couple_id);

    v_occ := coalesce(p_occurrence, r.pending_occurrence);
    if v_occ is null then
        return;
    end if;

    update public.recurring_expenses
       set pending_occurrence     = null,
           last_posted_occurrence = greatest(coalesce(last_posted_occurrence, v_occ), v_occ)
     where id = r.id;
end;
$$;

-- Next due date of a recurrence, for the UI.
create or replace function public.next_recurring_due(p_recurring_id uuid)
returns date
language sql
stable
security definer
set search_path = public
as $$
    select min(d)
    from public.recurring_occurrences(
             p_recurring_id,
             (current_date + interval '1 year')::date
         ) d
    where d > coalesce(
        (select last_posted_occurrence from public.recurring_expenses where id = p_recurring_id),
        current_date - 1
    );
$$;

-- ─────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────

alter table public.recurring_expenses enable row level security;

create policy "recurring_expenses: own couple"
  on public.recurring_expenses for all
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());

-- ─────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────

alter publication supabase_realtime add table public.recurring_expenses;
