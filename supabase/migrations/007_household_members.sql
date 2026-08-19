-- Couple OS — Budget OS Phase 0: household members + money engine
-- Ref: docs/budgeting/specs.md §3.3, §4.1 — docs/budgeting/roadmap.md Phase 0
--
-- Nothing changes visually: this migration teaches the database who the members
-- of a household are and how to split an amount without losing cents.

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────

do $$ begin
  create type member_role as enum ('OWNER', 'MEMBER', 'VIEWER');
exception when duplicate_object then null; end $$;

-- 'CUSTOM' split mode. New enum values cannot be used in the same transaction
-- that adds them, so nothing below references it as a literal outside a
-- function body (function bodies are only parsed at call time).
alter type split_mode add value if not exists 'CUSTOM';

-- ─────────────────────────────────────────
-- HOUSEHOLD MEMBERS
-- A member is whoever takes part in the household expenses.
-- `user_id` is null for participants without an app account.
-- ─────────────────────────────────────────

create table public.household_members (
    id             uuid primary key default gen_random_uuid(),
    couple_id      uuid not null references public.couples(id) on delete cascade,
    user_id        uuid references public.users(id) on delete set null,
    display_name   text not null,
    avatar_emoji   text,
    color          text,
    role           member_role not null default 'MEMBER',
    monthly_income numeric(12,2),
    custom_share   numeric(6,5) check (custom_share is null or (custom_share >= 0 and custom_share <= 1)),
    active         boolean not null default true,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

create unique index household_members_user_unique
    on public.household_members (couple_id, user_id)
    where user_id is not null;

create index household_members_couple_active_idx
    on public.household_members (couple_id, active);

create trigger set_updated_at before update on public.household_members
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────
-- EXPENSES: point at members instead of users
-- ─────────────────────────────────────────

alter table public.expenses
    add column if not exists paid_by_member_id uuid references public.household_members(id) on delete restrict,
    add column if not exists updated_at timestamptz not null default now();

-- A member without an account cannot be written to the legacy users FK.
alter table public.expenses alter column paid_by_id drop not null;

create index if not exists expenses_couple_member_date_idx
    on public.expenses (couple_id, paid_by_member_id, date desc);

create trigger set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────
-- EXPENSE SHARES — per-expense split override.
-- No rows = split by the household rule.
-- ─────────────────────────────────────────

create table public.expense_shares (
    expense_id   uuid not null references public.expenses(id) on delete cascade,
    member_id    uuid not null references public.household_members(id) on delete cascade,
    share_amount numeric(12,2) not null check (share_amount >= 0),
    primary key (expense_id, member_id)
);

create index expense_shares_member_idx on public.expense_shares (member_id);

-- ─────────────────────────────────────────
-- MONEY ENGINE
-- ─────────────────────────────────────────

-- Split `p_amount_cents` across `p_members` proportionally to `p_weights`,
-- using the largest-remainder method: the shares always add up to the total,
-- by construction. Integer cents only — no floating point anywhere.
create or replace function public.split_expense_cents(
    p_amount_cents bigint,
    p_members      uuid[],
    p_weights      numeric[]
)
returns table (member_id uuid, share_cents bigint)
language sql
immutable
as $$
    with input as (
        select m.member_id,
               greatest(coalesce(w.weight, 0), 0) as weight
        from unnest(p_members) with ordinality as m(member_id, ord)
        left join unnest(p_weights) with ordinality as w(weight, ord)
               on w.ord = m.ord
    ),
    totals as (
        select sum(weight) as weight_sum, count(*) as member_count from input
    ),
    normalized as (
        select i.member_id,
               case
                   when t.weight_sum > 0 then i.weight / t.weight_sum
                   else 1::numeric / t.member_count
               end as share
        from input i cross join totals t
    ),
    exact as (
        select member_id,
               floor(p_amount_cents * share)::bigint            as base_cents,
               p_amount_cents * share - floor(p_amount_cents * share) as frac
        from normalized
    ),
    ranked as (
        select member_id,
               base_cents,
               row_number() over (order by frac desc, member_id)  as rn,
               p_amount_cents - sum(base_cents) over ()           as remainder
        from exact
    )
    select member_id,
           base_cents + case when rn <= remainder then 1 else 0 end
    from ranked;
$$;

-- Split weights of a household, per its split rule.
-- PROPORTIONAL degrades to EQUAL when incomes are missing or add up to zero;
-- CUSTOM degrades to EQUAL when the custom shares do not add up to 1.
create or replace function public.member_weights(p_couple_id uuid)
returns table (member_id uuid, weight numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_mode        text;
    v_income_sum  numeric;
    v_income_null int;
    v_share_sum   numeric;
begin
    select c.split_mode::text into v_mode
    from public.couples c where c.id = p_couple_id;

    if v_mode = 'PROPORTIONAL' then
        select coalesce(sum(coalesce(hm.monthly_income, u.salary)), 0),
               count(*) filter (where coalesce(hm.monthly_income, u.salary) is null)
          into v_income_sum, v_income_null
        from public.household_members hm
        left join public.users u on u.id = hm.user_id
        where hm.couple_id = p_couple_id and hm.active;

        if v_income_sum > 0 and v_income_null = 0 then
            return query
            select hm.id, coalesce(hm.monthly_income, u.salary)::numeric
            from public.household_members hm
            left join public.users u on u.id = hm.user_id
            where hm.couple_id = p_couple_id and hm.active;
            return;
        end if;

    elsif v_mode = 'CUSTOM' then
        select coalesce(sum(hm.custom_share), 0) into v_share_sum
        from public.household_members hm
        where hm.couple_id = p_couple_id and hm.active;

        if abs(v_share_sum - 1) <= 0.00001 then
            return query
            select hm.id, hm.custom_share::numeric
            from public.household_members hm
            where hm.couple_id = p_couple_id and hm.active;
            return;
        end if;
    end if;

    -- EQUAL, and fallback for every degraded case above
    return query
    select hm.id, 1::numeric
    from public.household_members hm
    where hm.couple_id = p_couple_id and hm.active;
end;
$$;

-- Same weights, packed as two aligned arrays — one call per expense in views.
create or replace function public.member_split_arrays(
    p_couple_id uuid,
    out member_ids uuid[],
    out weights    numeric[]
)
language sql
stable
security definer
set search_path = public
as $$
    select array_agg(mw.member_id order by mw.member_id),
           array_agg(mw.weight    order by mw.member_id)
    from public.member_weights(p_couple_id) mw;
$$;

-- The share owed by each member on each expense: the override when it exists,
-- the household rule otherwise.
create or replace view public.v_expense_member_shares
with (security_invoker = true)
as
select e.id        as expense_id,
       e.couple_id,
       e.date,
       e.amount    as expense_amount,
       s.member_id,
       s.share_amount
from public.expenses e
cross join lateral (
    select es.member_id, es.share_amount
    from public.expense_shares es
    where es.expense_id = e.id

    union all

    select sc.member_id, (sc.share_cents::numeric / 100)
    from public.member_split_arrays(e.couple_id) a
    cross join lateral public.split_expense_cents(
        round(e.amount * 100)::bigint, a.member_ids, a.weights
    ) sc
    where not exists (select 1 from public.expense_shares es2 where es2.expense_id = e.id)
) s;

-- Custom shares must add up to 1 across the active members.
create or replace function public.validate_custom_shares(p_couple_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_sum numeric;
begin
    select coalesce(sum(custom_share), 0) into v_sum
    from public.household_members
    where couple_id = p_couple_id and active;

    if abs(v_sum - 1) > 0.00001 then
        raise exception 'Custom shares must add up to 100%%, they currently add up to %', round(v_sum * 100, 2);
    end if;
end;
$$;

-- ─────────────────────────────────────────
-- CONSISTENCY TRIGGERS
-- ─────────────────────────────────────────

-- The overrides of an expense must add up to its amount.
create or replace function public.validate_expense_shares()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_expense_id uuid := coalesce(new.expense_id, old.expense_id);
    v_amount     numeric;
    v_sum        numeric;
    v_count      int;
begin
    select amount into v_amount from public.expenses where id = v_expense_id;
    if v_amount is null then
        return null;  -- the expense is gone: cascade delete, nothing to check
    end if;

    select coalesce(sum(share_amount), 0), count(*)
      into v_sum, v_count
    from public.expense_shares where expense_id = v_expense_id;

    if v_count > 0 and abs(v_sum - v_amount) > 0.005 then
        raise exception 'Split shares (%) must add up to the expense amount (%)', v_sum, v_amount;
    end if;
    return null;
end;
$$;

create constraint trigger validate_expense_shares
    after insert or update or delete on public.expense_shares
    deferrable initially deferred
    for each row execute function public.validate_expense_shares();

-- A user joining a household becomes a member of it.
create or replace function public.sync_member_on_user_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_is_first boolean;
begin
    if new.couple_id is null then
        return new;
    end if;

    select not exists (
        select 1 from public.household_members where couple_id = new.couple_id
    ) into v_is_first;

    insert into public.household_members (couple_id, user_id, display_name, monthly_income, role)
    values (
        new.couple_id,
        new.id,
        coalesce(nullif(new.name, ''), new.email),
        new.salary,
        case when v_is_first then 'OWNER'::member_role else 'MEMBER'::member_role end
    )
    on conflict (couple_id, user_id) where user_id is not null
    do update set display_name   = excluded.display_name,
                  monthly_income = coalesce(household_members.monthly_income, excluded.monthly_income),
                  updated_at     = now();

    return new;
end;
$$;

create trigger sync_member_on_user_couple
    after insert or update of couple_id on public.users
    for each row execute function public.sync_member_on_user_couple();

-- Keep the legacy `expenses.paid_by_id` in sync with `paid_by_member_id`,
-- in both directions, so the pre-Budget-OS components keep working.
-- Removed in Phase 7 together with the legacy columns.
create or replace function public.sync_legacy_expense_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.paid_by_member_id is not null then
        select hm.user_id into new.paid_by_id
        from public.household_members hm where hm.id = new.paid_by_member_id;
    elsif new.paid_by_id is not null then
        select hm.id into new.paid_by_member_id
        from public.household_members hm
        where hm.couple_id = new.couple_id and hm.user_id = new.paid_by_id;
    end if;
    return new;
end;
$$;

create trigger sync_legacy_expense_fields
    before insert or update on public.expenses
    for each row execute function public.sync_legacy_expense_fields();

-- A VIEWER can read but never write. Enforced in the RPCs, not in the RLS
-- policies (see docs/budgeting/report.md §4.7). Service-role callers such as
-- the daily cron have no auth.uid() and are always allowed.
create or replace function public.assert_member_can_write(p_couple_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_role member_role;
begin
    if auth.uid() is null then
        return;
    end if;

    if p_couple_id is distinct from public.get_couple_id() then
        raise exception 'This household is not yours';
    end if;

    select hm.role into v_role
    from public.household_members hm
    where hm.couple_id = p_couple_id and hm.user_id = auth.uid();

    if v_role = 'VIEWER' then
        raise exception 'Your role is read-only';
    end if;
end;
$$;

-- ─────────────────────────────────────────
-- BACKFILL — existing households
-- ─────────────────────────────────────────

insert into public.household_members (couple_id, user_id, display_name, monthly_income, role, created_at)
select u.couple_id,
       u.id,
       coalesce(nullif(u.name, ''), u.email),
       u.salary,
       case
           when row_number() over (partition by u.couple_id order by u.created_at, u.id) = 1
           then 'OWNER'::member_role
           else 'MEMBER'::member_role
       end,
       u.created_at
from public.users u
where u.couple_id is not null
on conflict do nothing;

update public.expenses e
   set paid_by_member_id = hm.id
from public.household_members hm
where hm.couple_id = e.couple_id
  and hm.user_id  = e.paid_by_id
  and e.paid_by_member_id is null;

-- ─────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────

alter table public.household_members enable row level security;

create policy "household_members: own couple"
  on public.household_members for all
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());

alter table public.expense_shares enable row level security;

create policy "expense_shares: via own expense"
  on public.expense_shares for all
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_shares.expense_id
        and e.couple_id = public.get_couple_id()
    )
  )
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_shares.expense_id
        and e.couple_id = public.get_couple_id()
    )
  );

-- ─────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────

alter publication supabase_realtime add table public.household_members;
alter publication supabase_realtime add table public.expense_shares;
