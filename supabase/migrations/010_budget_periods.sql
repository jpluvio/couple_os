-- Couple OS — Budget OS Phase 3: the monthly budget
-- Ref: docs/budgeting/specs.md §3.8, §3.9, §4.2, §4.3 — roadmap Phase 3
--
-- A budget month becomes a first-class row (`budget_periods`), budget lines
-- hang off it, and the whole overview is computed in one round trip.

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────

do $$ begin
  create type budget_period_status as enum ('DRAFT', 'ACTIVE', 'CLOSED');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────
-- BUDGET PERIODS
-- ─────────────────────────────────────────

create table public.budget_periods (
    id               uuid primary key default gen_random_uuid(),
    couple_id        uuid not null references public.couples(id) on delete cascade,
    period_key       date not null,          -- always the 1st of the month
    expected_income  numeric(12,2) not null default 0,
    status           budget_period_status not null default 'ACTIVE',
    rollover_enabled boolean not null default false,
    note             text,
    closed_at        timestamptz,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    unique (couple_id, period_key)
);

create trigger set_updated_at before update on public.budget_periods
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────
-- BUDGET LINES
-- ─────────────────────────────────────────

alter table public.budgets
    add column if not exists budget_period_id uuid references public.budget_periods(id) on delete cascade,
    add column if not exists period_key       date,
    add column if not exists rollover_enabled boolean not null default false,
    add column if not exists carried_amount   numeric(12,2) not null default 0;

-- month/year become derived legacy columns
alter table public.budgets alter column month drop not null;
alter table public.budgets alter column year  drop not null;
alter table public.budgets alter column category drop not null;

-- Existing budget rows get their period
insert into public.budget_periods (couple_id, period_key)
select distinct b.couple_id, make_date(b.year, b.month, 1)
from public.budgets b
where b.month is not null and b.year is not null
on conflict (couple_id, period_key) do nothing;

update public.budgets b
   set budget_period_id = p.id,
       period_key       = p.period_key
from public.budget_periods p
where p.couple_id = b.couple_id
  and p.period_key = make_date(b.year, b.month, 1)
  and b.budget_period_id is null;

alter table public.budgets drop constraint if exists budgets_couple_id_category_month_year_key;
drop index if exists budgets_couple_id_category_month_year_key;

create unique index if not exists budgets_period_category_unique
    on public.budgets (budget_period_id, category_id);

-- Keep the legacy month/year/category columns populated until Phase 7.
create or replace function public.sync_legacy_budget_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.category_id is not null then
        select c.slug into new.category
        from public.expense_categories c where c.id = new.category_id;
    elsif new.category is not null then
        select c.id into new.category_id
        from public.expense_categories c
        where c.couple_id = new.couple_id and c.slug = new.category;
    end if;

    if new.period_key is null and new.budget_period_id is not null then
        select bp.period_key into new.period_key
        from public.budget_periods bp where bp.id = new.budget_period_id;
    end if;

    if new.period_key is null and new.month is not null and new.year is not null then
        new.period_key := make_date(new.year, new.month, 1);
    end if;

    if new.period_key is not null then
        new.month := extract(month from new.period_key)::int;
        new.year  := extract(year  from new.period_key)::int;
    end if;

    return new;
end;
$$;

-- ─────────────────────────────────────────
-- ACTUAL SPEND PER PERIOD AND CATEGORY
-- ─────────────────────────────────────────

create or replace view public.v_period_category_spend
with (security_invoker = true)
as
select e.couple_id,
       e.period_key,
       e.category_id,
       sum(e.amount)                                        as total,
       count(*)                                             as expense_count,
       coalesce(sum(e.amount) filter (where e.source = 'RECURRING'), 0) as fixed_total,
       coalesce(sum(e.amount) filter (where e.source = 'MANUAL'), 0)    as variable_total
from public.expenses e
group by e.couple_id, e.period_key, e.category_id;

-- ─────────────────────────────────────────
-- RPCs
-- ─────────────────────────────────────────

-- Get (or create) the period row of a month.
create or replace function public.ensure_budget_period(p_period date)
returns public.budget_periods
language plpgsql
security definer
set search_path = public
as $$
declare
    v_couple uuid := public.get_couple_id();
    v_key    date := date_trunc('month', p_period)::date;
    v_row    public.budget_periods;
begin
    if v_couple is null then
        raise exception 'You do not belong to a household yet';
    end if;

    select * into v_row from public.budget_periods
    where couple_id = v_couple and period_key = v_key;

    if not found then
        perform public.assert_member_can_write(v_couple);
        insert into public.budget_periods (couple_id, period_key)
        values (v_couple, v_key)
        returning * into v_row;
    end if;

    return v_row;
end;
$$;

-- Everything the Budget screen needs, in one call.
create or replace function public.get_budget_overview(p_period date default current_date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_couple uuid := public.get_couple_id();
    v_key    date := date_trunc('month', p_period)::date;
    v_period public.budget_periods;
    v_lines  jsonb;
    v_result jsonb;
begin
    if v_couple is null then
        raise exception 'You do not belong to a household yet';
    end if;

    select * into v_period from public.budget_periods
    where couple_id = v_couple and period_key = v_key;

    select coalesce(jsonb_agg(line order by line->>'kind' asc, (line->>'planned')::numeric desc, line->>'label'), '[]'::jsonb)
      into v_lines
    from (
        select jsonb_build_object(
            'category_id',    c.id,
            'slug',           c.slug,
            'label',          c.label,
            'emoji',          c.emoji,
            'color',          c.color,
            'kind',           c.kind,
            'budget_id',      b.id,
            'planned',        coalesce(b.amount, 0),
            'carried',        coalesce(b.carried_amount, 0),
            'effective',      coalesce(b.amount, 0) + coalesce(b.carried_amount, 0),
            'rollover_enabled', coalesce(b.rollover_enabled, false),
            'spent',          coalesce(s.total, 0),
            'expense_count',  coalesce(s.expense_count, 0),
            'remaining',      coalesce(b.amount, 0) + coalesce(b.carried_amount, 0) - coalesce(s.total, 0),
            'progress_ratio', case
                                  when coalesce(b.amount, 0) + coalesce(b.carried_amount, 0) > 0
                                  then round(coalesce(s.total, 0) / (b.amount + coalesce(b.carried_amount, 0)), 4)
                                  else null
                              end,
            'status',         case
                                  when b.id is null then 'UNPLANNED'
                                  when coalesce(s.total, 0) > b.amount + coalesce(b.carried_amount, 0) then 'OVER'
                                  when coalesce(s.total, 0) >= 0.8 * (b.amount + coalesce(b.carried_amount, 0)) then 'WARNING'
                                  else 'OK'
                              end
        ) as line
        from public.expense_categories c
        left join public.budgets b
               on b.category_id = c.id
              and b.budget_period_id = v_period.id
        left join public.v_period_category_spend s
               on s.category_id = c.id
              and s.couple_id   = v_couple
              and s.period_key  = v_key
        where c.couple_id = v_couple
          and (b.id is not null or coalesce(s.total, 0) <> 0 or not c.archived)
    ) lines;

    select jsonb_build_object(
        'period_key',      v_key,
        'period_id',       v_period.id,
        'status',          coalesce(v_period.status::text, 'ACTIVE'),
        'expected_income', coalesce(v_period.expected_income, 0),
        'planned',         coalesce((select sum(amount + carried_amount) from public.budgets where budget_period_id = v_period.id), 0),
        'spent',           coalesce((select sum(total) from public.v_period_category_spend where couple_id = v_couple and period_key = v_key), 0),
        'fixed_spent',     coalesce((select sum(fixed_total) from public.v_period_category_spend where couple_id = v_couple and period_key = v_key), 0),
        'variable_spent',  coalesce((select sum(variable_total) from public.v_period_category_spend where couple_id = v_couple and period_key = v_key), 0),
        'lines',           v_lines
    ) into v_result;

    return v_result
        || jsonb_build_object(
               'available',
               coalesce(v_period.expected_income, 0)
               - coalesce((select sum(amount + carried_amount) from public.budgets where budget_period_id = v_period.id), 0)
           );
end;
$$;

-- Set (or clear) the planned amount of a category for a month.
create or replace function public.set_budget_amount(
    p_period      date,
    p_category_id uuid,
    p_amount      numeric,
    p_rollover    boolean default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_couple uuid := public.get_couple_id();
    v_period public.budget_periods;
    v_id     uuid;
begin
    perform public.assert_member_can_write(v_couple);
    v_period := public.ensure_budget_period(p_period);

    if p_amount is null or p_amount <= 0 then
        delete from public.budgets
        where budget_period_id = v_period.id and category_id = p_category_id;
        return null;
    end if;

    insert into public.budgets (couple_id, category_id, amount, budget_period_id, period_key, rollover_enabled)
    values (v_couple, p_category_id, p_amount, v_period.id, v_period.period_key, coalesce(p_rollover, false))
    on conflict (budget_period_id, category_id) do update
        set amount           = excluded.amount,
            rollover_enabled = coalesce(p_rollover, budgets.rollover_enabled)
    returning id into v_id;

    return v_id;
end;
$$;

create or replace function public.set_expected_income(p_period date, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_period public.budget_periods;
begin
    perform public.assert_member_can_write(public.get_couple_id());
    v_period := public.ensure_budget_period(p_period);
    update public.budget_periods
       set expected_income = greatest(coalesce(p_amount, 0), 0)
     where id = v_period.id;
end;
$$;

-- Create a month by copying the budget lines of another one.
create or replace function public.create_next_period(
    p_period    date,
    p_copy_from date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_couple uuid := public.get_couple_id();
    v_target public.budget_periods;
    v_source public.budget_periods;
begin
    perform public.assert_member_can_write(v_couple);
    v_target := public.ensure_budget_period(p_period);

    select * into v_source from public.budget_periods
    where couple_id = v_couple
      and period_key = date_trunc('month', coalesce(p_copy_from, p_period - interval '1 month'))::date;

    if not found then
        return v_target.id;
    end if;

    insert into public.budgets (couple_id, category_id, amount, budget_period_id, period_key, rollover_enabled)
    select v_couple, b.category_id, b.amount, v_target.id, v_target.period_key, b.rollover_enabled
    from public.budgets b
    where b.budget_period_id = v_source.id
    on conflict (budget_period_id, category_id) do nothing;

    update public.budget_periods
       set expected_income = v_source.expected_income
     where id = v_target.id and expected_income = 0;

    return v_target.id;
end;
$$;

-- Close a month: compute the rollovers, open the next one.
create or replace function public.close_budget_period(p_period date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_couple uuid := public.get_couple_id();
    v_key    date := date_trunc('month', p_period)::date;
    v_next   date := (date_trunc('month', p_period) + interval '1 month')::date;
    v_period public.budget_periods;
    v_target uuid;
    b        record;
begin
    perform public.assert_member_can_write(v_couple);

    select * into v_period from public.budget_periods
    where couple_id = v_couple and period_key = v_key;

    if not found then
        raise exception 'No budget for this month';
    end if;
    if v_period.status = 'CLOSED' then
        return v_period.id;
    end if;

    v_target := public.create_next_period(v_next, v_key);

    -- Rollover: leftover carried forward, overspend carried as a debt.
    for b in
        select bu.category_id,
               bu.amount + bu.carried_amount - coalesce(s.total, 0) as leftover
        from public.budgets bu
        left join public.v_period_category_spend s
               on s.category_id = bu.category_id
              and s.couple_id   = v_couple
              and s.period_key  = v_key
        where bu.budget_period_id = v_period.id
          and bu.rollover_enabled
    loop
        update public.budgets
           set carried_amount = b.leftover
         where budget_period_id = v_target and category_id = b.category_id;
    end loop;

    update public.budget_periods
       set status = 'CLOSED', closed_at = now()
     where id = v_period.id;

    return v_period.id;
end;
$$;

-- ─────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────

-- Every member of the household gets notified, not just "the partner".
create or replace function public.notify_partner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type       text := tg_argv[0];
  v_actor      uuid := auth.uid();
  v_row        jsonb := to_jsonb(new);
  v_couple_id  uuid;
  v_actor_name text;
  v_title      text;
  v_body       text;
begin
  if v_row ? 'couple_id' then
    v_couple_id := (v_row->>'couple_id')::uuid;
  elsif v_row ? 'list_id' then
    select couple_id into v_couple_id
    from public.todo_lists where id = (v_row->>'list_id')::uuid;
  end if;

  if v_couple_id is null then
    return new;
  end if;

  select coalesce(name, 'Your partner') into v_actor_name
  from public.users where id = v_actor;
  v_actor_name := coalesce(v_actor_name, 'Someone');

  if v_type = 'post' then
    v_title := 'New post';
    v_body  := v_actor_name || ' shared something on the board';
  elsif v_type = 'event' then
    v_title := 'New event';
    v_body  := v_actor_name || ' added "' || coalesce(v_row->>'title', '') || '" to the calendar';
  elsif v_type = 'expense' then
    v_title := 'New expense';
    v_body  := v_actor_name || ' logged an expense of €' || coalesce(v_row->>'amount', '');
  elsif v_type = 'todo' then
    v_title := 'New to-do';
    v_body  := v_actor_name || ' added "' || coalesce(v_row->>'title', '') || '"';
  else
    v_title := 'Update';
    v_body  := v_actor_name || ' added something';
  end if;

  insert into public.notifications (couple_id, recipient_id, actor_id, type, entity_id, title, body)
  select v_couple_id, u.id, v_actor, v_type, (v_row->>'id')::uuid, v_title, v_body
  from public.users u
  where u.couple_id = v_couple_id
    and u.id is distinct from v_actor;

  return new;
end;
$$;

-- One alert per budget line per threshold, ever.
create table public.budget_threshold_alerts (
    budget_id  uuid not null references public.budgets(id) on delete cascade,
    threshold  integer not null check (threshold in (80, 100)),
    created_at timestamptz not null default now(),
    primary key (budget_id, threshold)
);

alter table public.budget_threshold_alerts enable row level security;

create policy "budget_threshold_alerts: own couple"
  on public.budget_threshold_alerts for select
  using (
    exists (
      select 1 from public.budgets b
      where b.id = budget_threshold_alerts.budget_id
        and b.couple_id = public.get_couple_id()
    )
  );

create or replace function public.notify_budget_threshold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_budget    record;
    v_spent     numeric;
    v_effective numeric;
    v_ratio     numeric;
    v_threshold int;
    v_label     text;
    v_title     text;
    v_body      text;
begin
    if new.category_id is null then
        return new;
    end if;

    select b.*, c.label into v_budget
    from public.budgets b
    join public.expense_categories c on c.id = b.category_id
    where b.couple_id  = new.couple_id
      and b.category_id = new.category_id
      and b.period_key = new.period_key;

    if not found then
        return new;
    end if;

    v_effective := v_budget.amount + v_budget.carried_amount;
    if v_effective <= 0 then
        return new;
    end if;

    select coalesce(sum(amount), 0) into v_spent
    from public.expenses
    where couple_id = new.couple_id
      and category_id = new.category_id
      and period_key = new.period_key;

    v_ratio := v_spent / v_effective;
    v_label := v_budget.label;

    if v_ratio > 1 then
        v_threshold := 100;
        v_title := 'Budget exceeded';
        v_body  := v_label || ' is over budget by €' || to_char(v_spent - v_effective, 'FM999999990.00');
    elsif v_ratio >= 0.8 then
        v_threshold := 80;
        v_title := 'Budget almost spent';
        v_body  := v_label || ': ' || round(v_ratio * 100) || '% used, €'
                   || to_char(v_effective - v_spent, 'FM999999990.00') || ' left';
    else
        return new;
    end if;

    -- FOUND is false when the alert row already existed: this threshold has
    -- already been announced for this budget line, so stay quiet.
    insert into public.budget_threshold_alerts (budget_id, threshold)
    values (v_budget.id, v_threshold)
    on conflict do nothing;

    if not found then
        return new;
    end if;

    insert into public.notifications (couple_id, recipient_id, actor_id, type, entity_id, title, body)
    select new.couple_id, u.id, auth.uid(), 'expense', new.id, v_title, v_body
    from public.users u
    where u.couple_id = new.couple_id;

    return new;
end;
$$;

create trigger notify_budget_threshold
    after insert on public.expenses
    for each row execute function public.notify_budget_threshold();

-- ─────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────

alter table public.budget_periods enable row level security;

create policy "budget_periods: own couple"
  on public.budget_periods for all
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());

-- ─────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────

alter publication supabase_realtime add table public.budget_periods;
