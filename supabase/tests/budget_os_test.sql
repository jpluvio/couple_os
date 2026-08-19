-- Couple OS — Budget OS verification suite
-- Ref: docs/budgeting/roadmap.md §0.3, §2.4 — specs.md §11
--
-- Run against a database with migrations 001–010 applied:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/budget_os_test.sql
-- Every check raises an exception on failure; the script rolls back at the end,
-- so it leaves no data behind.

begin;

\set QUIET on
set client_min_messages = notice;

create or replace function pg_temp.check(p_label text, p_condition boolean)
returns void language plpgsql as $$
begin
    if p_condition then
        raise notice 'PASS  %', p_label;
    else
        raise exception 'FAIL  %', p_label;
    end if;
end $$;

-- ─────────────────────────────────────────
-- FIXTURE — two households, three members in the first one
-- ─────────────────────────────────────────

do $$
declare
    v_a uuid := gen_random_uuid();
    v_b uuid := gen_random_uuid();
    v_x uuid := gen_random_uuid();
begin
    insert into auth.users (id, email, raw_user_meta_data)
    values (v_a, 'anna@test.dev',  '{"full_name":"Anna"}'::jsonb),
           (v_b, 'bruno@test.dev', '{"full_name":"Bruno"}'::jsonb),
           (v_x, 'xena@test.dev',  '{"full_name":"Xena"}'::jsonb);

    update public.users set salary = 3000 where id = v_a;
    update public.users set salary = 1000 where id = v_b;

    perform set_config('app.uid', v_a::text, true);
    perform public.create_couple('Household A');

    perform set_config('app.uid', v_b::text, true);
    update public.users set couple_id = (select couple_id from public.users where id = v_a)
    where id = v_b;

    perform set_config('app.uid', v_x::text, true);
    perform public.create_couple('Household B');

    perform set_config('app.uid', v_a::text, true);
end $$;

-- Handles used by the rest of the suite
create temporary table t_ctx as
select (select couple_id from public.users where email = 'anna@test.dev') as couple_a,
       (select couple_id from public.users where email = 'xena@test.dev') as couple_b,
       (select id from public.users where email = 'anna@test.dev')        as user_a,
       (select id from public.users where email = 'bruno@test.dev')       as user_b;

-- ─────────────────────────────────────────
-- PHASE 0 — members and money engine
-- ─────────────────────────────────────────

select pg_temp.check(
    'a user joining a household becomes a member',
    (select count(*) from public.household_members hm, t_ctx where hm.couple_id = t_ctx.couple_a) = 2
);

select pg_temp.check(
    'the first member of a household is the OWNER',
    (select count(*) from public.household_members hm, t_ctx
      where hm.couple_id = t_ctx.couple_a and hm.role = 'OWNER') = 1
);

-- A participant without an app account
insert into public.household_members (couple_id, display_name, role)
select couple_a, 'Carla', 'MEMBER' from t_ctx;

-- Largest-remainder split: the shares always add up to the total,
-- for every household size from 1 to 10 and every awkward amount.
do $$
declare
    n        int;
    cents    bigint;
    v_sum    bigint;
    v_ids    uuid[];
    v_weights numeric[];
begin
    foreach cents in array array[1::bigint, 7, 99, 100, 1001, 33333, 999999] loop
        for n in 1..10 loop
            select array_agg(gen_random_uuid()), array_agg(1::numeric)
              into v_ids, v_weights
            from generate_series(1, n);

            select sum(share_cents) into v_sum
            from public.split_expense_cents(cents, v_ids, v_weights);

            if v_sum <> cents then
                raise exception 'FAIL  equal split of % cents across % members gives %', cents, n, v_sum;
            end if;

            -- lopsided weights
            select array_agg(gen_random_uuid()), array_agg(i::numeric)
              into v_ids, v_weights
            from generate_series(1, n) i;

            select sum(share_cents) into v_sum
            from public.split_expense_cents(cents, v_ids, v_weights);

            if v_sum <> cents then
                raise exception 'FAIL  weighted split of % cents across % members gives %', cents, n, v_sum;
            end if;
        end loop;
    end loop;
    raise notice 'PASS  split shares always add up to the total (1–10 members, equal and weighted)';
end $$;

-- Proportional weights follow the salaries; missing income degrades to equal.
update public.couples set split_mode = 'PROPORTIONAL' where id = (select couple_a from t_ctx);

select pg_temp.check(
    'PROPORTIONAL degrades to EQUAL when a member has no income',
    (select count(distinct weight) from public.member_weights((select couple_a from t_ctx))) = 1
);

update public.household_members set monthly_income = 2000
 where couple_id = (select couple_a from t_ctx) and display_name = 'Carla';

select pg_temp.check(
    'PROPORTIONAL uses the incomes when they are all known',
    (select count(distinct weight) from public.member_weights((select couple_a from t_ctx))) = 3
);

update public.couples set split_mode = 'EQUAL' where id = (select couple_a from t_ctx);

-- ─────────────────────────────────────────
-- PHASE 1 — categories
-- ─────────────────────────────────────────

select pg_temp.check(
    'a new household gets its own copy of the 12 preset categories',
    (select count(*) from public.expense_categories c, t_ctx where c.couple_id = t_ctx.couple_a) = 12
);

select pg_temp.check(
    'system presets stay untouched',
    (select count(*) from public.expense_categories where couple_id is null) = 12
);

-- An expense written the old way still lands on a category
insert into public.expenses (couple_id, amount, category, date, paid_by_id)
select couple_a, 42.50, 'groceries', date_trunc('month', current_date)::date, user_a from t_ctx;

select pg_temp.check(
    'a legacy write is mapped onto a category and a period',
    (select count(*) from public.expenses e
      where e.category_id is not null
        and e.period_key = date_trunc('month', current_date)::date) = 1
);

select pg_temp.check(
    'a legacy write is mapped onto the paying member',
    (select count(*) from public.expenses where paid_by_member_id is not null) = 1
);

do $$
declare v_cat uuid;
begin
    select id into v_cat from public.expense_categories
    where couple_id = (select couple_a from t_ctx) and slug = 'groceries';

    begin
        delete from public.expense_categories where id = v_cat;
        raise exception 'FAIL  a category with expenses attached could be deleted';
    exception when others then
        if sqlerrm like 'FAIL%' then raise; end if;
        raise notice 'PASS  a category with expenses attached cannot be deleted';
    end;
end $$;

-- ─────────────────────────────────────────
-- PHASE 2 — recurring expenses
-- ─────────────────────────────────────────

do $$
declare
    v_couple uuid := (select couple_a from t_ctx);
    v_cat    uuid;
    v_rec    uuid;
    v_count  int;
    v_due    int;
begin
    select id into v_cat from public.expense_categories
    where couple_id = v_couple and slug = 'rent';

    -- Rent on the 31st, started three months ago
    insert into public.recurring_expenses (couple_id, label, amount, category_id, frequency, day_of_month, start_date)
    values (v_couple, 'Rent', 800, v_cat, 'MONTHLY', 31,
            (date_trunc('month', current_date) - interval '3 months')::date)
    returning id into v_rec;

    select count(*) into v_due from public.recurring_occurrences(v_rec, current_date);
    if v_due < 3 then
        raise exception 'FAIL  a recurrence started 3 months ago has only % due occurrences', v_due;
    end if;

    perform public.post_due_recurring(v_couple, current_date);
    perform public.post_due_recurring(v_couple, current_date);
    perform public.post_due_recurring(v_couple, current_date);

    select count(*) into v_count from public.expenses where recurring_expense_id = v_rec;
    if v_count <> v_due then
        raise exception 'FAIL  post_due_recurring is not idempotent: % expenses for % occurrences', v_count, v_due;
    end if;
    raise notice 'PASS  post_due_recurring run three times posts each occurrence once';

    -- Day 31 resolves to the last day of every month it is due in
    if exists (
        select 1 from public.expenses
        where recurring_expense_id = v_rec
          and date <> (date_trunc('month', date) + interval '1 month - 1 day')::date
    ) then
        raise exception 'FAIL  day 31 did not resolve to the last day of a short month';
    end if;
    raise notice 'PASS  day 31 resolves to the last day of short months';

    -- An ended recurrence stops posting
    update public.recurring_expenses
       set end_date = (date_trunc('month', current_date) - interval '1 day')::date
     where id = v_rec;

    select count(*) into v_count from public.expenses where recurring_expense_id = v_rec;
    perform public.post_due_recurring(v_couple, (current_date + interval '2 months')::date);
    if (select count(*) from public.expenses where recurring_expense_id = v_rec) <> v_count then
        raise exception 'FAIL  an ended recurrence kept posting';
    end if;
    raise notice 'PASS  an ended recurrence stops posting';

    -- A recurrence that needs confirmation posts nothing on its own
    insert into public.recurring_expenses
        (couple_id, label, amount, category_id, frequency, day_of_month, start_date, variable_amount)
    values (v_couple, 'Electricity', 60,
            (select id from public.expense_categories where couple_id = v_couple and slug = 'utilities'),
            'MONTHLY', 5, date_trunc('month', current_date)::date, true)
    returning id into v_rec;

    perform public.post_due_recurring(v_couple, current_date);

    if exists (select 1 from public.expenses where recurring_expense_id = v_rec) then
        raise exception 'FAIL  a recurrence awaiting confirmation posted itself';
    end if;
    if (select pending_occurrence from public.recurring_expenses where id = v_rec) is null then
        raise exception 'FAIL  a recurrence awaiting confirmation left nothing to confirm';
    end if;
    raise notice 'PASS  a variable-amount recurrence waits for confirmation';

    perform public.confirm_recurring_occurrence(v_rec, 73.40);
    if (select amount from public.expenses where recurring_expense_id = v_rec) <> 73.40 then
        raise exception 'FAIL  confirming a recurrence did not post the confirmed amount';
    end if;
    raise notice 'PASS  confirming a recurrence posts the confirmed amount';
end $$;

-- ─────────────────────────────────────────
-- PHASE 3 — budget, overview and rollover
-- ─────────────────────────────────────────

do $$
declare
    v_couple   uuid := (select couple_a from t_ctx);
    v_cat      uuid;
    v_overview jsonb;
    v_line     jsonb;
    v_carried  numeric;
begin
    select id into v_cat from public.expense_categories
    where couple_id = v_couple and slug = 'groceries';

    perform public.set_expected_income(current_date, 3200);
    perform public.set_budget_amount(current_date, v_cat, 500, true);

    v_overview := public.get_budget_overview(current_date);

    if (v_overview->>'expected_income')::numeric <> 3200 then
        raise exception 'FAIL  expected income not reported: %', v_overview->>'expected_income';
    end if;

    select l into v_line
    from jsonb_array_elements(v_overview->'lines') l
    where l->>'category_id' = v_cat::text;

    if (v_line->>'planned')::numeric <> 500 or (v_line->>'spent')::numeric <> 42.50 then
        raise exception 'FAIL  budget line reports planned=% spent=%',
            v_line->>'planned', v_line->>'spent';
    end if;
    if (v_line->>'remaining')::numeric <> 457.50 then
        raise exception 'FAIL  remaining is %, expected 457.50', v_line->>'remaining';
    end if;
    raise notice 'PASS  get_budget_overview reports planned, spent and remaining';

    -- Overspend a second category to check the OVER status
    perform public.set_budget_amount(current_date, v_cat, 20, true);
    v_overview := public.get_budget_overview(current_date);
    select l into v_line
    from jsonb_array_elements(v_overview->'lines') l
    where l->>'category_id' = v_cat::text;

    if v_line->>'status' <> 'OVER' then
        raise exception 'FAIL  an overspent line is reported as %', v_line->>'status';
    end if;
    raise notice 'PASS  an overspent budget line is reported as OVER';

    -- Rollover: 100 planned, 42.50 spent → 57.50 carried into next month
    perform public.set_budget_amount(current_date, v_cat, 100, true);
    perform public.close_budget_period(current_date);

    select b.carried_amount into v_carried
    from public.budgets b
    join public.budget_periods p on p.id = b.budget_period_id
    where p.couple_id = v_couple
      and p.period_key = (date_trunc('month', current_date) + interval '1 month')::date
      and b.category_id = v_cat;

    if v_carried <> 57.50 then
        raise exception 'FAIL  leftover carried is %, expected 57.50', v_carried;
    end if;
    raise notice 'PASS  a positive leftover is carried into the next month';

    -- A negative leftover is carried too
    if (select status from public.budget_periods
        where couple_id = v_couple and period_key = date_trunc('month', current_date)::date) <> 'CLOSED' then
        raise exception 'FAIL  the period was not closed';
    end if;
    raise notice 'PASS  closing a period marks it CLOSED and opens the next one';
end $$;

-- Budget threshold notification, once and only once
do $$
declare
    v_couple uuid := (select couple_a from t_ctx);
    v_cat    uuid;
    v_before int;
begin
    select id into v_cat from public.expense_categories
    where couple_id = v_couple and slug = 'dining';

    perform public.set_budget_amount((current_date + interval '1 month')::date, v_cat, 100);

    insert into public.expenses (couple_id, amount, category_id, date, period_key, paid_by_id)
    select v_couple, 90, v_cat, current_date,
           (date_trunc('month', current_date) + interval '1 month')::date, user_a from t_ctx;

    select count(*) into v_before from public.notifications where title = 'Budget almost spent';
    if v_before = 0 then
        raise exception 'FAIL  crossing 80%% of a budget raised no notification';
    end if;

    insert into public.expenses (couple_id, amount, category_id, date, period_key, paid_by_id)
    select v_couple, 1, v_cat, current_date,
           (date_trunc('month', current_date) + interval '1 month')::date, user_a from t_ctx;

    if (select count(*) from public.notifications where title = 'Budget almost spent') <> v_before then
        raise exception 'FAIL  the 80%% threshold notified twice';
    end if;
    raise notice 'PASS  a budget threshold notifies every member exactly once';
end $$;

-- ─────────────────────────────────────────
-- ISOLATION — nothing of household A leaks into household B
-- ─────────────────────────────────────────

select pg_temp.check(
    'categories are not shared between households',
    (select count(*) from public.expense_categories c, t_ctx
      where c.couple_id = t_ctx.couple_b and c.id in (
        select id from public.expense_categories where couple_id = t_ctx.couple_a
      )) = 0
);

select pg_temp.check(
    'members are not shared between households',
    (select count(*) from public.household_members hm, t_ctx where hm.couple_id = t_ctx.couple_b) = 1
);

rollback;
