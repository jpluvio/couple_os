-- Couple OS — Budget OS Phase 1: customisable categories
-- Ref: docs/budgeting/specs.md §3.4, §6 — docs/budgeting/roadmap.md Phase 1
--
-- Categories stop being constants scattered across the code and become data.
-- Historical `expenses.category` values are mapped explicitly: nothing is
-- silently reassigned to "Other", and the migration aborts if any expense is
-- left without a category.

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────

do $$ begin
  create type expense_kind as enum ('FIXED', 'VARIABLE');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────
-- CATEGORIES
-- couple_id null = system preset: readable by everyone, writable by no one.
-- ─────────────────────────────────────────

create table public.expense_categories (
    id          uuid primary key default gen_random_uuid(),
    couple_id   uuid references public.couples(id) on delete cascade,
    slug        text not null,
    label       text not null,
    emoji       text,
    color       text,
    kind        expense_kind not null default 'VARIABLE',
    archived    boolean not null default false,
    sort_order  integer not null default 100,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create unique index expense_categories_slug_unique
    on public.expense_categories (coalesce(couple_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

create index expense_categories_couple_idx
    on public.expense_categories (couple_id, archived, sort_order);

create trigger set_updated_at before update on public.expense_categories
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────
-- SYSTEM PRESETS
-- ─────────────────────────────────────────

insert into public.expense_categories (couple_id, slug, label, emoji, color, kind, sort_order) values
    (null, 'rent',          'Rent / Mortgage',   '🏠', '#0ea5e9', 'FIXED',    10),
    (null, 'utilities',     'Utilities',         '💡', '#f59e0b', 'FIXED',    20),
    (null, 'subscriptions', 'Subscriptions',     '📺', '#8b5cf6', 'FIXED',    30),
    (null, 'insurance',     'Insurance',         '🛡️', '#64748b', 'FIXED',    40),
    (null, 'groceries',     'Groceries',         '🛒', '#10b981', 'VARIABLE', 50),
    (null, 'dining',        'Eating out',        '🍕', '#ef4444', 'VARIABLE', 60),
    (null, 'transport',     'Transport',         '🚗', '#3b82f6', 'VARIABLE', 70),
    (null, 'health',        'Health',            '💊', '#ec4899', 'VARIABLE', 80),
    (null, 'entertainment', 'Fun',               '🎉', '#f97316', 'VARIABLE', 90),
    (null, 'shopping',      'Shopping',          '👕', '#a855f7', 'VARIABLE', 100),
    (null, 'home',          'Home & upkeep',     '🔧', '#14b8a6', 'VARIABLE', 110),
    (null, 'other',         'Other',             '📦', '#9ca3af', 'VARIABLE', 120);

-- Clone the presets for a household.
create or replace function public.clone_preset_categories(p_couple_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
    insert into public.expense_categories (couple_id, slug, label, emoji, color, kind, sort_order)
    select p_couple_id, slug, label, emoji, color, kind, sort_order
    from public.expense_categories
    where couple_id is null
    on conflict do nothing;
$$;

create or replace function public.seed_household_on_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    perform public.clone_preset_categories(new.id);
    return new;
end;
$$;

create trigger seed_household_on_couple
    after insert on public.couples
    for each row execute function public.seed_household_on_couple();

-- Existing households get their own copy too.
do $$
declare v_couple record;
begin
    for v_couple in select id from public.couples loop
        perform public.clone_preset_categories(v_couple.id);
    end loop;
end $$;

-- ─────────────────────────────────────────
-- LINK EXPENSES AND BUDGETS TO CATEGORIES
-- ─────────────────────────────────────────

alter table public.expenses
    add column if not exists category_id uuid references public.expense_categories(id) on delete restrict;

alter table public.budgets
    add column if not exists category_id uuid references public.expense_categories(id) on delete cascade,
    add column if not exists updated_at  timestamptz not null default now();

create trigger set_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();

create index if not exists expenses_couple_category_idx
    on public.expenses (couple_id, category_id, date desc);

-- ─────────────────────────────────────────
-- DATA MIGRATION — explicit mapping of the historical vocabularies
-- ─────────────────────────────────────────

create temporary table legacy_category_map (legacy text primary key, slug text not null);

insert into legacy_category_map (legacy, slug) values
    ('casa', 'home'),
    ('cibo', 'groceries'),
    ('trasporti', 'transport'),
    ('intrattenimento', 'entertainment'),
    ('salute', 'health'),
    ('altro', 'other'),
    ('Affitto', 'rent'),
    ('Bollette', 'utilities'),
    ('Spesa', 'groceries'),
    ('Ristoranti', 'dining'),
    ('Trasporti', 'transport'),
    ('Salute', 'health'),
    ('Intrattenimento', 'entertainment'),
    ('Altro', 'other');

-- Unmapped values become a category of the household, keeping the original
-- label. No historical data is lost or arbitrarily reassigned.
insert into public.expense_categories (couple_id, slug, label, kind, sort_order)
select distinct on (src.couple_id, src.slug)
       src.couple_id,
       src.slug,
       src.label,
       'VARIABLE'::expense_kind,
       500
from (
    select e.couple_id,
           regexp_replace(lower(trim(e.category)), '[^a-z0-9]+', '_', 'g') as slug,
           trim(e.category)                                               as label
    from public.expenses e
    where e.category is not null
      and trim(e.category) <> ''
      and not exists (select 1 from legacy_category_map m where m.legacy = e.category)

    union all

    select b.couple_id,
           regexp_replace(lower(trim(b.category)), '[^a-z0-9]+', '_', 'g'),
           trim(b.category)
    from public.budgets b
    where b.category is not null
      and trim(b.category) <> ''
      and not exists (select 1 from legacy_category_map m where m.legacy = b.category)
) src
where src.slug <> ''
order by src.couple_id, src.slug
on conflict do nothing;

-- Mapped values
update public.expenses e
   set category_id = c.id
from legacy_category_map m
join public.expense_categories c on c.slug = m.slug
where m.legacy = e.category
  and c.couple_id = e.couple_id
  and e.category_id is null;

update public.budgets b
   set category_id = c.id
from legacy_category_map m
join public.expense_categories c on c.slug = m.slug
where m.legacy = b.category
  and c.couple_id = b.couple_id
  and b.category_id is null;

-- Generated categories
update public.expenses e
   set category_id = c.id
from public.expense_categories c
where c.couple_id = e.couple_id
  and c.slug = regexp_replace(lower(trim(e.category)), '[^a-z0-9]+', '_', 'g')
  and e.category_id is null;

update public.budgets b
   set category_id = c.id
from public.expense_categories c
where c.couple_id = b.couple_id
  and c.slug = regexp_replace(lower(trim(b.category)), '[^a-z0-9]+', '_', 'g')
  and b.category_id is null;

-- Last resort for empty/null legacy values: the household's "other".
update public.expenses e
   set category_id = c.id
from public.expense_categories c
where c.couple_id = e.couple_id
  and c.slug = 'other'
  and e.category_id is null;

update public.budgets b
   set category_id = c.id
from public.expense_categories c
where c.couple_id = b.couple_id
  and c.slug = 'other'
  and b.category_id is null;

-- Final assertion — the whole migration rolls back if anything is orphaned.
do $$
declare v_orphans int;
begin
    select count(*) into v_orphans from public.expenses where category_id is null;
    if v_orphans > 0 then
        raise exception 'Migration 008 aborted: % expenses without a category', v_orphans;
    end if;

    select count(*) into v_orphans from public.budgets where category_id is null;
    if v_orphans > 0 then
        raise exception 'Migration 008 aborted: % budgets without a category', v_orphans;
    end if;
end $$;

drop table legacy_category_map;

-- ─────────────────────────────────────────
-- LEGACY SYNC — `expenses.category` and `budgets.category` stay populated
-- until Phase 7, so the pre-Budget-OS components keep working.
-- ─────────────────────────────────────────

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

    if new.category_id is not null then
        select c.slug into new.category
        from public.expense_categories c where c.id = new.category_id;
    elsif new.category is not null then
        select c.id into new.category_id
        from public.expense_categories c
        where c.couple_id = new.couple_id and c.slug = new.category;

        if new.category_id is null then
            select c.id into new.category_id
            from public.expense_categories c
            where c.couple_id = new.couple_id and c.slug = 'other';
        end if;
    end if;

    return new;
end;
$$;

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
    return new;
end;
$$;

create trigger sync_legacy_budget_fields
    before insert or update on public.budgets
    for each row execute function public.sync_legacy_budget_fields();

-- ─────────────────────────────────────────
-- A category with data attached is archived, never deleted.
-- ─────────────────────────────────────────

create or replace function public.guard_category_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
    if old.couple_id is null then
        raise exception 'System preset categories cannot be deleted';
    end if;

    select count(*) into v_count from public.expenses where category_id = old.id;
    if v_count > 0 then
        raise exception 'This category has % expenses attached — archive it instead', v_count;
    end if;
    return old;
end;
$$;

create trigger guard_category_delete
    before delete on public.expense_categories
    for each row execute function public.guard_category_delete();

-- ─────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────

alter table public.expense_categories enable row level security;

create policy "expense_categories: read system or own"
  on public.expense_categories for select
  using (couple_id is null or couple_id = public.get_couple_id());

create policy "expense_categories: insert own couple"
  on public.expense_categories for insert
  with check (couple_id = public.get_couple_id());

create policy "expense_categories: update own couple"
  on public.expense_categories for update
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());

create policy "expense_categories: delete own couple"
  on public.expense_categories for delete
  using (couple_id = public.get_couple_id());

-- ─────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────

alter publication supabase_realtime add table public.expense_categories;
alter publication supabase_realtime add table public.budgets;
alter publication supabase_realtime add table public.financial_goals;
