# Budget OS — Technical and functional specification

> Household budgeting module for Couple OS.
> Specification version 1.0 — August 2026.
> Related documents: [`roadmap.md`](./roadmap.md) (design phases), [`report.md`](./report.md) (reasoned choices).

---

## 1. Goal and scope

### 1.1 What it does

Budget OS manages the money of a **household**: creating and calculating monthly budgets, tracking fixed and variable expenses, splitting costs between members, producing per-category statistics, and feeding savings goals with a share of the budget.

The five things it must do well:

1. **Monthly budget** — plan how much to spend per category, compare planned against actual, carry leftovers into the next month.
2. **Fixed expenses** — declare rent, utilities and subscriptions once; the system records them automatically every period with no re-entry.
3. **Variable expenses** — quick entry (amount, category, who paid) in under five seconds.
4. **Statistics** — where the money goes, how it changes over time, who paid for what, how closely the budget is respected.
5. **Savings goals** — a goal ("Bali trip") absorbs a monthly share of the budget exactly like a spending category, and grows automatically every period.

### 1.2 What it does not do (v1)

Deliberate exclusions, justified in [`report.md` §5](./report.md#5-what-we-excluded-and-why):

- Bank statement import (CSV/OFX) or banking connections (PSD2/open banking)
- Predictive end-of-month forecasting
- Debt, loan and instalment repayment plans
- Receipt attachments or photos
- Multi-currency and exchange rate conversion
- Nested subcategories
- Investments and net worth

### 1.3 Project constraints

| Constraint | Implication |
|---|---|
| Must integrate into Couple OS | Same monorepo, same stack, same tenancy, same design system |
| The `finance` module already exists and holds data | Incremental evolution through migrations, no destructive rewrite |
| Household of N members (not just 2 partners) | Splits and balances generalised to N, explicit members table |
| Mobile-first, offline-tolerant | Deterministic server-side calculation, client-side cache |

---

## 2. Architecture

### 2.1 The stack as it actually is

> ⚠️ **Alignment note.** `plan.md` and `dashboard.md` in the repository root describe a Fastify + Prisma backend with `apps/api` and `apps/web` marked "complete". Those directories **do not exist** in the repository: the real implementation is Supabase accessed directly from the client, with RLS as the authorisation layer. This specification describes the real stack. See [`report.md` §1](./report.md#1-the-real-starting-point).

| Layer | Technology | Notes |
|---|---|---|
| Database | PostgreSQL (Supabase) | SQL migrations in `supabase/migrations/` |
| Authorisation | Row Level Security | `public.get_couple_id()` helper already present |
| Calculation logic | SQL functions + RPCs (`security definer` where needed) | No intermediate application server |
| Scheduled jobs | Supabase Edge Functions + Cron | `daily-cron` already running at 09:00 |
| Realtime | Supabase Realtime (`supabase_realtime` publication) | |
| Client | Expo 55 / React Native 0.83 / Expo Router 5 | `apps/mobile` |
| Server state | TanStack Query v5 | With AsyncStorage persister |
| Styling | NativeWind v4 | Finance module colour: `#10b981` |
| Forms | React Hook Form + Zod | Schemas in `packages/shared` |
| Charts | `victory-native` XL + `@shopify/react-native-skia` | To be installed — see [`report.md` §4.6](./report.md#46-charting-library) |

### 2.2 The load-bearing architectural principle

**Money is calculated in Postgres, not in JavaScript.**

Every aggregation, split and balance is produced by SQL views or functions. The client receives numbers that are already computed and displays them. Three reasons:

1. **Precision** — `numeric(12,2)` in Postgres is exact decimal arithmetic; `number` in JavaScript is binary IEEE-754 and accumulates error across repeated sums.
2. **Consistency** — the same split rule should not be reimplemented in every component. Today `ExpensesTab.tsx` computes the balance client-side and `BudgetTab.tsx` re-aggregates expenses client-side, two independent implementations of the same idea.
3. **Volume** — the client currently downloads every expense of the month to compute six totals. A view returns six rows.

### 2.3 Tenancy model

Tenancy stays anchored to `couple_id`: it is the key already used by every RLS policy, every index and all eight other Couple OS features. Changing it would mean migrating the entire application for the sake of one feature.

Support for N members comes from a **`household_members`** table listing the household's financial participants. A participant can be:

- **linked to a user** (`user_id` populated) — has an account, signs into the app, sees the data;
- **unlinked** (`user_id` null) — purely an accounting entity: a flatmate who doesn't use the app, a child, a parent who contributes.

This separates *who has access* from *who participates in expenses*. Extended reasoning in [`report.md` §4.1](./report.md#41-n-members-without-rewriting-tenancy).

```
couples (tenancy — unchanged)
   │
   ├── users (who has an account; RLS anchored here)
   │
   └── household_members (who participates in expenses, N rows)
            │  user_id → users.id  (nullable)
            │
            └── referenced by expenses.paid_by_member_id,
                expense_shares, settlements, recurring_expenses
```

---

## 3. Data model

### 3.1 What already exists

| Table | Relevant columns | Fate |
|---|---|---|
| `expenses` | `amount`, `category` (free text), `note`, `date`, `paid_by_id`, `couple_id` | Extended |
| `budgets` | `category` (text), `amount`, `month`, `year`, `couple_id` — unique `(couple_id, category, month, year)` | Extended |
| `financial_goals` | `title`, `target_amount`, `saved_amount`, `couple_id` | Extended |
| `couples` | `split_mode` enum `EQUAL`/`PROPORTIONAL` | Extended (`CUSTOM`) |
| `users` | `salary numeric(12,2)` | Unchanged, read by `household_members` |

### 3.2 New enums

```sql
create type expense_kind        as enum ('FIXED', 'VARIABLE');
create type expense_source      as enum ('MANUAL', 'RECURRING');
create type member_role         as enum ('OWNER', 'MEMBER', 'VIEWER');
create type recurrence_freq     as enum ('WEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL');
create type budget_period_status as enum ('DRAFT', 'ACTIVE', 'CLOSED');
create type goal_status         as enum ('ACTIVE', 'REACHED', 'PAUSED', 'ARCHIVED');
create type contribution_source as enum ('MANUAL', 'BUDGET_ALLOCATION');

-- Extension of the existing enum
alter type split_mode add value 'CUSTOM';
```

### 3.3 `household_members` — household participants

```sql
create table public.household_members (
    id            uuid primary key default gen_random_uuid(),
    couple_id     uuid not null references public.couples(id) on delete cascade,
    user_id       uuid references public.users(id) on delete set null,
    display_name  text not null,
    avatar_emoji  text,
    color         text,                       -- visual identity in charts
    role          member_role not null default 'MEMBER',
    monthly_income numeric(12,2),             -- for PROPORTIONAL split
    custom_share  numeric(6,5),               -- for CUSTOM split, 0..1
    active        boolean not null default true,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create unique index household_members_user_unique
    on public.household_members (couple_id, user_id)
    where user_id is not null;

create index on public.household_members (couple_id, active);
```

**Rules:**
- Every household user has exactly one row with `user_id` populated (created automatically by trigger, §3.12).
- `custom_share` is validated only when `couples.split_mode = 'CUSTOM'`: the shares of active members must sum to 1 ± 0.00001. Validation lives in `validate_custom_shares()`, invoked by the save RPC.
- `monthly_income` overrides `users.salary` when present; it allows declaring an income for a participant with no account.
- Deactivating a member (`active = false`) excludes them from future splits while preserving history.

### 3.4 `expense_categories` — customisable categories

```sql
create table public.expense_categories (
    id          uuid primary key default gen_random_uuid(),
    couple_id   uuid references public.couples(id) on delete cascade,  -- null = system preset
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

create index on public.expense_categories (couple_id, archived, sort_order);
```

**Rules:**
- `couple_id is null` identifies **system presets**, readable by everyone and editable by no one. When a household is created they are cloned as that household's own categories (trigger §3.12), so each household can rename or delete them without touching the presets.
- `slug` is the stable key used for migrating historical data and for references in code; `label` is what the user sees and can freely change.
- `kind` distinguishes **fixed** from **variable**. It is an attribute of the category, not of the individual expense: it exists to produce the "how much of our budget is non-negotiable" statistic.
- **A category with linked expenses is never deleted**: it is archived (`archived = true`). It disappears from pickers and remains in history and statistics. Attempting to `delete` one with linked expenses is blocked by the foreign key (`on delete restrict`).

**Seeded system presets:**

| slug | label | emoji | kind |
|---|---|---|---|
| `rent` | Rent / Mortgage | 🏠 | FIXED |
| `utilities` | Utilities | 💡 | FIXED |
| `subscriptions` | Subscriptions | 📺 | FIXED |
| `insurance` | Insurance | 🛡️ | FIXED |
| `groceries` | Groceries | 🛒 | VARIABLE |
| `dining` | Eating out | 🍕 | VARIABLE |
| `transport` | Transport | 🚗 | VARIABLE |
| `health` | Health | 💊 | VARIABLE |
| `entertainment` | Entertainment | 🎉 | VARIABLE |
| `shopping` | Shopping | 👕 | VARIABLE |
| `home` | Home and maintenance | 🔧 | VARIABLE |
| `other` | Other | 📦 | VARIABLE |

### 3.5 `expenses` — extension

```sql
alter table public.expenses
    add column category_id           uuid references public.expense_categories(id) on delete restrict,
    add column paid_by_member_id     uuid references public.household_members(id) on delete restrict,
    add column source                expense_source not null default 'MANUAL',
    add column recurring_expense_id  uuid references public.recurring_expenses(id) on delete set null,
    add column period_key            date,          -- first day of the accounting month
    add column updated_at            timestamptz not null default now();

-- Accounting period: normally the month of `date`, but overridable
-- (e.g. a December utility bill paid in January)
create index on public.expenses (couple_id, period_key, category_id);
create index on public.expenses (couple_id, paid_by_member_id, date desc);
create unique index expenses_recurring_period_unique
    on public.expenses (recurring_expense_id, period_key)
    where recurring_expense_id is not null;
```

`category` (text) and `paid_by_id` (uuid → users) stay in the table throughout the transition and are populated in parallel by triggers so existing code keeps working. Removal is scheduled for Phase 7.

The unique index on `(recurring_expense_id, period_key)` is the **idempotency** guarantee for recurring generation: the cron job and the catch-up can run as often as they like without duplicating.

### 3.6 `expense_shares` — non-standard splits

```sql
create table public.expense_shares (
    expense_id  uuid not null references public.expenses(id) on delete cascade,
    member_id   uuid not null references public.household_members(id) on delete cascade,
    share_amount numeric(12,2) not null check (share_amount >= 0),
    primary key (expense_id, member_id)
);
```

**No rows = split according to the household rule.** Rows exist only when the user customises the division of a single expense (a dinner split between two of three flatmates). A trigger verifies that `sum(share_amount) = expenses.amount` for any expense that has at least one row.

### 3.7 `recurring_expenses` — fixed expenses

```sql
create table public.recurring_expenses (
    id                  uuid primary key default gen_random_uuid(),
    couple_id           uuid not null references public.couples(id) on delete cascade,
    label               text not null,
    amount              numeric(12,2) not null check (amount > 0),
    category_id         uuid not null references public.expense_categories(id) on delete restrict,
    paid_by_member_id   uuid references public.household_members(id) on delete set null,
    frequency           recurrence_freq not null default 'MONTHLY',
    day_of_month        integer check (day_of_month between -1 and 31),  -- -1 = last day
    day_of_week         integer check (day_of_week between 0 and 6),     -- WEEKLY only
    start_date          date not null,
    end_date            date,
    auto_post           boolean not null default true,
    variable_amount     boolean not null default false,
    active              boolean not null default true,
    note                text,
    last_posted_period  date,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create index on public.recurring_expenses (couple_id, active, frequency);
```

**Flag semantics:**

- `auto_post = true` → the expense is created automatically on the due date.
- `auto_post = false` → the system creates a **proposal** for the user to confirm (useful for amounts that change).
- `variable_amount = true` → forces `auto_post = false` and proposes the previous occurrence's amount as an editable default. This is the electricity bill case: the date is certain, the amount is not.

**Handling impossible days:** `day_of_month = 31` in February resolves to the last day of the month. The `resolve_due_date(period, day_of_month)` function applies `least(day_of_month, days_in_month)`; `-1` explicitly means "last day".

### 3.8 `budget_periods` — the budget month

```sql
create table public.budget_periods (
    id                uuid primary key default gen_random_uuid(),
    couple_id         uuid not null references public.couples(id) on delete cascade,
    period_key        date not null,              -- always the 1st of the month
    expected_income   numeric(12,2) not null default 0,
    status            budget_period_status not null default 'ACTIVE',
    rollover_enabled  boolean not null default false,
    note              text,
    closed_at         timestamptz,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    unique (couple_id, period_key)
);
```

`period_key` as a `date` normalised to the first of the month replaces the `(month, year)` pair: it is sortable, comparable with `date_trunc('month', expenses.date)`, and supports native range queries.

### 3.9 `budgets` — per-category budget lines

```sql
alter table public.budgets
    add column category_id       uuid references public.expense_categories(id) on delete cascade,
    add column budget_period_id  uuid references public.budget_periods(id) on delete cascade,
    add column period_key        date,
    add column rollover_enabled  boolean not null default false,
    add column carried_amount    numeric(12,2) not null default 0,
    add column updated_at        timestamptz not null default now();

drop index if exists budgets_couple_id_category_month_year_key;
create unique index budgets_period_category_unique
    on public.budgets (budget_period_id, category_id);
```

- `amount` = the amount planned for the period.
- `carried_amount` = the remainder carried over from the previous period (positive if under budget, negative if over). Computed when the previous period is closed, never in real time.
- **Effective budget** = `amount + carried_amount`.

### 3.10 `financial_goals` — extension and the link to the budget

```sql
alter table public.financial_goals
    add column target_date        date,
    add column monthly_allocation numeric(12,2) not null default 0,
    add column emoji              text,
    add column color              text,
    add column status             goal_status not null default 'ACTIVE',
    add column priority           integer not null default 100;

create table public.goal_contributions (
    id                uuid primary key default gen_random_uuid(),
    goal_id           uuid not null references public.financial_goals(id) on delete cascade,
    couple_id         uuid not null references public.couples(id) on delete cascade,
    amount            numeric(12,2) not null,
    date              date not null default current_date,
    member_id         uuid references public.household_members(id) on delete set null,
    source            contribution_source not null default 'MANUAL',
    budget_period_id  uuid references public.budget_periods(id) on delete set null,
    note              text,
    created_at        timestamptz not null default now()
);

create index on public.goal_contributions (goal_id, date desc);
create unique index goal_contributions_period_unique
    on public.goal_contributions (goal_id, budget_period_id)
    where source = 'BUDGET_ALLOCATION';
```

**The goal ↔ budget link.** `monthly_allocation` is the share of budget the goal absorbs each month. In the budget equation a goal behaves exactly like a spending category:

```
Available = expected_income
          − Σ(fixed budgets)
          − Σ(variable budgets)
          − Σ(monthly_allocation of ACTIVE goals)
```

When the period closes (or the month rolls over) a `goal_contribution` with `source = 'BUDGET_ALLOCATION'` is created for every active goal with a non-zero allocation. The partial unique index guarantees **one automatic contribution per goal per period**.

`saved_amount` on `financial_goals` becomes a denormalised value maintained by trigger (`sum(goal_contributions.amount)`): it stays readable by the existing `GoalsTab.tsx` without changes, but stops being the source of truth.

When `saved_amount >= target_amount` a trigger moves `status` to `REACHED` and raises a notification.

### 3.11 `settlements` — settling up

```sql
create table public.settlements (
    id            uuid primary key default gen_random_uuid(),
    couple_id     uuid not null references public.couples(id) on delete cascade,
    from_member_id uuid not null references public.household_members(id) on delete restrict,
    to_member_id   uuid not null references public.household_members(id) on delete restrict,
    amount        numeric(12,2) not null check (amount > 0),
    date          date not null default current_date,
    note          text,
    created_at    timestamptz not null default now(),
    check (from_member_id <> to_member_id)
);

create index on public.settlements (couple_id, date desc);
```

Records an actual reimbursement between two members. A member's balance is:

```
balance(m) = Σ(paid by m) − Σ(share owed by m) − Σ(reimbursements paid by m) + Σ(reimbursements received by m)
```

### 3.12 Provisioning and consistency triggers

| Trigger | On | Effect |
|---|---|---|
| `seed_household_on_couple` | `after insert on couples` | Clones the 12 system presets as household categories |
| `sync_member_on_user_couple` | `after insert or update of couple_id on users` | Creates/updates the user's `household_members` row |
| `sync_legacy_expense_fields` | `before insert or update on expenses` | Populates `category` (text) and `paid_by_id` from the new fields, for compatibility |
| `set_expense_period_key` | `before insert or update on expenses` | `period_key := coalesce(period_key, date_trunc('month', date))` |
| `validate_expense_shares` | `after insert/update/delete on expense_shares` | Verifies `sum(share_amount) = expenses.amount` |
| `refresh_goal_saved_amount` | `after insert/update/delete on goal_contributions` | Recomputes `financial_goals.saved_amount`, promotes to `REACHED` |
| `guard_category_delete` | `before delete on expense_categories` | Blocks deletion when linked expenses or budgets exist |
| `set_updated_at` | all new tables | Pattern already established in `003_triggers.sql` |

---

## 4. Calculation engine

### 4.1 Splitting an expense

Given an expense of amount `A` and active members `M₁…Mₙ`:

| Mode | Share of `Mᵢ` |
|---|---|
| `EQUAL` | `A / n` |
| `PROPORTIONAL` | `A × incomeᵢ / Σ incomes` — if an income is missing or the sum is 0, degrades to `EQUAL` |
| `CUSTOM` | `A × custom_shareᵢ` |
| Override | `expense_shares.share_amount` when rows exist for that expense |

**Rounding — largest remainder method.** Shares are not rounded independently, because `n` separate roundings do not reconstitute the total (€100 across 3 people → 33.33 × 3 = €99.99). The algorithm:

1. Convert everything to integer cents.
2. Compute each member's exact share and take the integer part.
3. Distribute the leftover cents, one each, to the members with the largest fractional part; ties broken by a stable order on `household_members.id`.

Implemented exactly once in `split_expense_cents(p_amount_cents bigint, p_members uuid[], p_weights numeric[])`. **The shares always sum to exactly the amount, by construction.**

### 4.2 Views

```sql
-- Actual spend per period and category
create view public.v_period_category_spend as
select
    e.couple_id,
    e.period_key,
    e.category_id,
    sum(e.amount)                                    as total,
    count(*)                                         as expense_count,
    sum(e.amount) filter (where e.source = 'RECURRING') as fixed_total,
    sum(e.amount) filter (where e.source = 'MANUAL')    as variable_total
from public.expenses e
group by e.couple_id, e.period_key, e.category_id;

-- Share owed by each member (override when present, otherwise the household rule)
create view public.v_expense_member_shares as ...

-- Balance per member
create view public.v_member_balances as ...
```

### 4.3 RPCs exposed to the client

| Function | Input | Output |
|---|---|---|
| `get_budget_overview(p_period date)` | month | Per category: `planned`, `carried`, `spent`, `remaining`, `progress_ratio`, `status` (`OK`/`WARNING`/`OVER`) + totals + goal allocations + available |
| `get_category_stats(p_from date, p_to date)` | range | Total, share of overall total, monthly average, expense count, change vs previous period |
| `get_monthly_trend(p_months int)` | number of months | Time series: total, fixed, variable, budget, income |
| `get_member_balances(p_from date, p_to date)` | range | Per member: `paid`, `owed`, `settled`, `balance` |
| `suggest_settlements()` | — | Minimal list of transfers that zeroes every balance |
| `close_budget_period(p_period date)` | month | Computes rollovers, creates goal contributions, marks `CLOSED`, opens the next period |
| `create_next_period(p_period date, p_copy_from date)` | month | Creates the period, copying budget lines from the previous one |
| `post_due_recurring(p_couple_id uuid, p_up_to date)` | — | Generates due recurring expenses (idempotent) |
| `upsert_category(...)`, `archive_category(...)` | — | Category management with validation |

All are `security definer` with `search_path = public`, and each verifies `couple_id = public.get_couple_id()` as its first statement.

### 4.4 Settlement algorithm (min cash flow)

With N members, zeroing balances with the fewest transfers:

1. Split members into creditors (`balance > 0`) and debtors (`balance < 0`).
2. Sort both by absolute value, descending.
3. Iteratively match the largest debtor to the largest creditor, transferring `min(|debt|, credit)`.
4. Repeat until every balance is below one cent.

Produces at most `N−1` transfers. For N=2 it degenerates to the current behaviour ("Anna owes Marco €42.50").

### 4.5 Generating recurring expenses

Two mechanisms, both idempotent thanks to the unique index on `(recurring_expense_id, period_key)`:

1. **Daily cron** — `daily-cron` (already scheduled at 09:00) calls `post_due_recurring()` for every active household.
2. **Catch-up on app open** — the `useRecurringCatchUp()` hook calls the same RPC for the current household. This covers households created after the last cron run, and cron failures.

For `auto_post = false` the function creates no expense but a row in `recurring_expenses` with `pending_since`, which the client surfaces as a "To confirm" card at the top of the expense list.

---

## 5. Security (RLS)

Every new table follows the pattern already established in `002_rls.sql`.

```sql
alter table public.expense_categories enable row level security;

-- System presets read-only + own household's categories
create policy "expense_categories: read system or own"
  on public.expense_categories for select
  using (couple_id is null or couple_id = public.get_couple_id());

create policy "expense_categories: write own couple"
  on public.expense_categories for insert
  with check (couple_id = public.get_couple_id());

create policy "expense_categories: update own couple"
  on public.expense_categories for update
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());
```

Likewise for `household_members`, `recurring_expenses`, `budget_periods`, `goal_contributions`, `settlements` (all `for all using (couple_id = public.get_couple_id())`), and `expense_shares` with an `exists` check against the linked expense — the same pattern as `recipe_ingredients`.

**Roles.** `member_role` is enforced at the RPC level, not in RLS: a `VIEWER` can read, but write RPCs reject with `raise exception` when the caller has the `VIEWER` role. Reasoning in [`report.md` §4.7](./report.md#47-roles-enforced-in-rpcs-not-in-rls).

**Realtime.** Add to the publication: `budgets`, `budget_periods`, `expense_categories`, `recurring_expenses`, `financial_goals`, `goal_contributions`, `settlements`, `household_members`. (`expenses` is already there.)

---

## 6. Migrating existing data

The main risk: `expenses.category` is free text, and **two incompatible vocabularies** coexist in the code.

- `packages/shared/src/index.ts` exports `EXPENSE_CATEGORIES` = `["Affitto", "Bollette", "Spesa", …]` — **imported by no component**.
- `ExpensesTab.tsx` and `BudgetTab.tsx` each define their own local array `CATEGORIES` = `["casa", "cibo", "trasporti", "intrattenimento", "salute", "altro"]`.

Real data therefore holds values from the second vocabulary, and potentially from the first. (The historical values below are Italian because that is what is stored in the database today.)

**Procedure (migration `008`):**

1. Create the system categories and clone them for every existing household.
2. Apply an explicit mapping table:

   | historical value | target slug |
   |---|---|
   | `casa` | `home` |
   | `cibo` | `groceries` |
   | `trasporti` | `transport` |
   | `intrattenimento` | `entertainment` |
   | `salute` | `health` |
   | `altro` | `other` |
   | `Affitto` | `rent` |
   | `Bollette` | `utilities` |
   | `Spesa` | `groceries` |
   | `Ristoranti` | `dining` |
   | `Trasporti` | `transport` |
   | `Salute` | `health` |
   | `Intrattenimento` | `entertainment` |
   | `Altro` | `other` |

3. Any unmapped value produces a household category with `label` = the original value, `slug` = a slugified version, `kind = 'VARIABLE'`. **No data is lost or arbitrarily reassigned to "Other".**
4. Create a `household_members` row for every user with a non-null `couple_id`, `display_name = coalesce(users.name, email)`, `monthly_income = users.salary`, role `OWNER` for the household's first created member.
5. Populate `expenses.paid_by_member_id` from `paid_by_id`, and `expenses.period_key` from `date`.
6. Create one `budget_periods` row per distinct `(couple_id, month, year)` present in `budgets` and link the rows.
7. Final check: `select count(*) from expenses where category_id is null` must return 0. The migration fails inside its transaction if it does not.

The legacy `expenses.category` and `expenses.paid_by_id` columns stay populated by triggers until Phase 7, so the current components keep working throughout the transition.

---

## 7. Mobile interface

### 7.1 Structure

The Finance tab grows from 3 to 4 sections. `app/(app)/finance/index.tsx` keeps its existing segmented control:

```
app/(app)/finance/
├── index.tsx              # Segmented control: Expenses · Budget · Statistics · Goals
├── categories.tsx         # Category management (pushed from Budget)
├── recurring.tsx          # Fixed-expense management (pushed from Budget)
├── members.tsx            # Household members and split rule
└── settle.tsx             # Settling up (pushed from Expenses)
```

```
components/finance/
├── ExpensesTab.tsx        # existing — refactored onto RPCs
├── BudgetTab.tsx          # existing — refactored onto get_budget_overview
├── StatsTab.tsx           # new
├── GoalsTab.tsx           # existing — extended with monthly allocation
├── CategoryPicker.tsx     # new — the single picker, replacing the 3 hardcoded arrays
├── CategoryChip.tsx
├── ExpenseSheet.tsx       # create/edit expense bottom sheet
├── RecurringCard.tsx
├── PendingRecurringBanner.tsx
├── BudgetLineRow.tsx
├── GoalCard.tsx
├── GoalAllocationSheet.tsx
├── MemberAvatar.tsx
├── SettlementCard.tsx
└── charts/
    ├── CategoryDonut.tsx
    ├── TrendLine.tsx
    ├── MonthCompareBars.tsx
    └── BudgetGauge.tsx
```

### 7.2 Budget screen

```
┌─────────────────────────────────────┐
│  ‹ August 2026 ›            ⚙️      │  month navigation
├─────────────────────────────────────┤
│  Expected income       € 3,200.00   │
│  Planned               € 2,850.00   │
│  Spent                 € 1,940.50   │
│  ████████████░░░░░░░  68%           │
│  Available               € 350.00   │
├─────────────────────────────────────┤
│  FIXED                   € 980.00   │
│  🏠 Rent         800 / 800    100%  │
│  💡 Utilities    180 / 200     90%  │
│                                     │
│  VARIABLE              € 1,520.00   │
│  🛒 Groceries    480 / 500  ▓▓▓░ 96%│
│  🍕 Eating out   210 / 150  ▓▓▓▓ ⚠ │
│  🚗 Transport     95 / 120  ▓▓░░ 79%│
│                                     │
│  GOALS                   € 350.00   │
│  🏝️ Bali          200 /month ✓      │
│  🚗 New car       150 /month ✓      │
└─────────────────────────────────────┘
```

Interactions: tap a row → edit the amount; long-press → remove the budget; `⚙️` → categories, fixed expenses, members, split rule; horizontal swipe or arrows → change month; a "Copy from previous month" action when the period is empty.

### 7.3 Statistics screen

A range picker (current month · 3 months · 6 months · year · custom), then:

1. **Category donut** with legend and percentages; tap a slice → category detail
2. **Top 5 categories** with change versus the previous period (`↑ +12%`)
3. **Monthly trend** — a line chart with three series: total, fixed, variable
4. **Month-over-month comparison** — side-by-side bars
5. **Fixed vs variable** — stacked bar with the share of non-negotiable spend
6. **Budget adherence** — how many closed months came in under budget
7. **Who paid** — breakdown per member and current balance

### 7.4 Quick expense entry

The app's most frequent path, optimised for speed:

- FAB → bottom sheet with the numeric keypad open and focus on the amount
- Category: chips in a single scrollable row, **ordered by the household's recent usage frequency**
- "Paid by": defaults to the current user, member avatars in a row
- Date: defaults to today, with a "Yesterday" shortcut and a picker
- Note: optional, last field
- **Exactly one required tap beyond the amount** (the category); everything else has a sensible default

### 7.5 Interface states

| State | Treatment |
|---|---|
| Loading | Skeleton loader, never a spinner over structured content |
| Empty — no expenses | Illustration + CTA "Add your first expense" |
| Empty — no budget | Two CTAs: "Create budget" / "Copy from last month" |
| Budget above 80% | Amber row |
| Budget exceeded | Red row, full bar, excess badge |
| Recurring to confirm | Banner at the top of the expense list with inline confirmation |
| Goal reached | Card with confetti and a "Mark as complete" CTA |
| Network error | Toast + retry; cached data stays visible |

### 7.6 TanStack Query keys

```ts
['finance', 'overview', coupleId, periodKey]
['finance', 'expenses', coupleId, periodKey]
['finance', 'categories', coupleId]
['finance', 'recurring', coupleId]
['finance', 'stats', coupleId, from, to]
['finance', 'balances', coupleId, from, to]
['finance', 'goals', coupleId]
['finance', 'members', coupleId]
```

`staleTime`: 5 minutes for lists and statistics, 1 minute for the budget overview. Cascading invalidation on an expense mutation: `overview`, `expenses`, `stats`, `balances`.

Optimistic updates on: adding an expense, confirming a recurring expense, editing a budget amount.

---

## 8. Shared schemas

New files in `packages/shared/src/`, following the existing pattern (one schema per file, named exports, re-exported from `index.ts`):

```ts
export const CreateCategorySchema = z.object({
  label: z.string().min(1, "Name is required").max(60),
  emoji: z.string().max(8).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  kind: z.enum(["FIXED", "VARIABLE"]).default("VARIABLE"),
});

export const CreateRecurringExpenseSchema = z.object({
  label: z.string().min(1).max(120),
  amount: z.number().positive("Amount must be positive"),
  category_id: z.string().uuid(),
  paid_by_member_id: z.string().uuid().optional(),
  frequency: z.enum(["WEEKLY","MONTHLY","BIMONTHLY","QUARTERLY","SEMIANNUAL","ANNUAL"]).default("MONTHLY"),
  day_of_month: z.number().int().min(-1).max(31).optional(),
  start_date: z.string(),
  end_date: z.string().optional(),
  auto_post: z.boolean().default(true),
  variable_amount: z.boolean().default(false),
});

export const CreateGoalSchema = z.object({           // extended
  title: z.string().min(1, "Title is required").max(200),
  target_amount: z.number().positive("Target must be positive"),
  target_date: z.string().optional(),
  monthly_allocation: z.number().min(0).default(0),
  emoji: z.string().max(8).optional(),
});
```

`EXPENSE_CATEGORIES` is **deprecated** and replaced by `DEFAULT_EXPENSE_CATEGORIES` (the 12 presets with slug, label, emoji, kind), used only for seeding and as an offline fallback.

> Validation messages and category labels are written here in English. The shipping app is Italian, so these strings pass through the localisation layer; the English text is the source copy, not what the user reads.

---

## 9. Notifications

The `notify_partner()` trigger in `005_notifications.sql` selects **a single** recipient (`limit 1`) — correct for two partners, wrong for N members. It must be generalised to an `insert … select` across all members other than the actor.

New events:

| Event | Recipients | Copy |
|---|---|---|
| Budget at 80% | All members | "Groceries budget: 80% used, €100 left" |
| Budget exceeded | All members | "Eating out budget exceeded by €60" |
| Recurring posted | All members | "Rent — €800 recorded automatically" |
| Recurring to confirm | All members | "Electricity bill: confirm this month's amount" |
| Goal reached | All members | "🏝️ Bali trip: goal reached!" |
| Month-close reminder | All members | "The August budget closes tomorrow" |

Budget thresholds are evaluated by an `after insert on expenses` trigger, with an anti-repeat guard: a threshold notification is emitted only once per `(budget_period_id, category_id, threshold)`.

---

## 10. Non-functional requirements

| Requirement | Target |
|---|---|
| Finance tab open (cached data) | < 300 ms to first frame |
| `get_budget_overview` | < 150 ms at 5,000 expenses |
| Expense save (optimistic) | Immediate feedback, confirmation < 1 s |
| Monetary precision | Zero error: `numeric` arithmetic in SQL, integer cents in splits |
| Offline behaviour | Reads from the persisted cache; writes queued with retry |
| Recurring idempotency | Guaranteed by a unique index, not by application logic |
| Isolation between households | RLS on every table, verified by dedicated tests |
| Accessibility | AA contrast; information is never carried by colour alone (always paired with text or an icon) |
| Localisation | User-facing strings kept in constants; currency formatted via `Intl.NumberFormat('it-IT')` |

---

## 11. Tests

Tests are required **only** where an error produces wrong numbers without being visible:

1. **`split_expense_cents`** — shares always sum to the total, for every N from 1 to 10 and every split mode
2. **Rollover** — a positive and a negative remainder both propagate correctly to the next period
3. **Recurring idempotency** — `post_due_recurring` run three times produces one expense
4. **Min cash flow** — resulting balances are all zero and transfers are at most N−1
5. **RLS** — a user of household A can neither read nor write anything of household B (one assertion per table)
6. **Migration** — on a dump containing both category vocabularies, no expense is left orphaned

SQL tests with `pgTAP`, or verification scripts run against the staging database.

---

## 12. Glossary

| Term | Meaning |
|---|---|
| **Household** | The set of people sharing the budget. Identified by `couple_id`. |
| **Member** | A participant in expenses. May have an account (`user_id`) or be purely an accounting entity. |
| **Period** | A budget month, identified by `period_key` (the 1st of the month). |
| **Fixed expense** | A predictable recurring expense, defined in `recurring_expenses` and materialised into `expenses`. |
| **Variable expense** | A manually entered expense. |
| **Rollover** | Carrying a category's budget remainder into the next period. |
| **Share** | The portion of an expense attributed to a member. |
| **Balance** | The difference between what a member paid and what they owed. |
| **Settlement** | A money transfer that reduces a balance. |
| **Allocation** | The monthly share of budget assigned to a savings goal. |
