# Budget OS — Design decisions report

> Why the module is designed this way, what I rejected, and the conditions under which each decision should be revisited.
> Related documents: [`specs.md`](./specs.md), [`roadmap.md`](./roadmap.md).

---

## 1. The real starting point

Before designing anything I read the code. Two things do not match what the documentation claims, and both of them change the project.

### 1.1 The documented stack is not the implemented stack

`plan.md` and `dashboard.md` describe a monorepo with three apps — `apps/api` (Fastify + Prisma), `apps/web` (Next.js) and `apps/mobile` — and declare the API and web "complete". `instructions.md` tells you to check `apps/api/src/routes/` before writing code.

The repository contains only `apps/mobile`, `packages/shared` and `supabase/`. There is no `apps/api`, no `apps/web`, no Prisma schema. The real implementation is **Supabase accessed directly from the client**: components call `supabase.from("expenses").select(...)` and authorisation is delegated to the RLS policies in `002_rls.sql`.

This is not a detail: it changes where logic lives. With a Fastify backend I would have put the calculation engine in an application service. Without one, the only two options are the client or the database — and for money, the client is the wrong choice (§2.1).

**I designed against the real stack.** Correcting the three documents is an explicit task in Phase 7.4: leaving them divergent means the next working session will start from the wrong premise.

### 1.2 The finance module already exists, and has three structural defects

There are `expenses`, `budgets`, `financial_goals` and three working tabs. I was not starting from zero. But the existing code has three problems that are not missing polish — they are defects that would compound if built upon.

**Categories are defined three times, with two incompatible vocabularies.** `packages/shared/src/index.ts` exports `EXPENSE_CATEGORIES = ["Affitto", "Bollette", "Spesa", …]`, which **no component imports**. `ExpensesTab.tsx` and `BudgetTab.tsx` each declare a local `CATEGORIES = ["casa", "cibo", "trasporti", …]`, identical and duplicated. The `expenses.category` column is free text, so production data can hold values from both vocabularies — plus anything typed by hand. This is also why migrating categories (§4.4) is the most delicate part of the project.

**The partner is inferred from data rather than from a roster.** In `ExpensesTab.tsx`:

```ts
expenses.find((e) => e.paid_by_id !== user.id)?.paid_by_id ?? ""
```

The other person's identity is derived from the first expense the current user did not pay. Until the partner has recorded at least one expense, this expression returns an empty string — and it is used both to compute the balance and, in `addExpense()`, as the `paid_by_id` of a new expense attributed to the partner. The correct value is already available from `useCouple()`, which exposes `partner`, but it is not passed to the component for that purpose.

With N members this approach cannot be patched: there is no "the other one". It needs an explicit roster of participants, which is Phase 0.

**Money is calculated in the client, twice.** `ExpensesTab.tsx` has `computeBalance()`, which downloads every expense of the month and reduces it in JavaScript. `BudgetTab.tsx` downloads the same expenses again and re-aggregates them with a different `reduce`. Two independent implementations of the same idea, both in floating-point arithmetic.

---

## 2. The two principles that drive everything else

### 2.1 Money is calculated in Postgres

Every aggregation, split and balance is produced by SQL views or functions. The client receives numbers that are already computed.

**Precision.** `numeric(12,2)` in Postgres is exact decimal arithmetic. `number` in JavaScript is binary IEEE-754: `0.1 + 0.2 !== 0.3`. On a single expense this is invisible; across a sum of three hundred expenses, or a three-way division, it produces cents that don't add up. And a budgeting app that gets cents wrong loses the user's trust in everything else — including the numbers that are correct.

**Consistency.** One implementation of the split rule, callable from any screen. Today there are two, and they can drift.

**Volume.** `get_budget_overview` returns one row per category. The current code downloads every expense of the month to compute six totals — and does it twice, once per tab.

**The cost:** logic ends up in SQL, which is less familiar than TypeScript, more awkward to test, and has no type-checking shared with the client. That is a real cost, which I accept because in a monetary domain correctness outweighs convenience. The critical functions have dedicated tests ([`specs.md` §11](./specs.md#11-tests)).

### 2.2 Guarantees belong in the database, not in application code

Wherever an invariant can be expressed as a constraint, I express it as a constraint.

- No duplicate recurring expenses → a unique index on `(recurring_expense_id, period_key)`, not an `if` before the insert
- One automatic contribution per goal per period → a partial unique index
- A category with linked expenses cannot be deleted → `on delete restrict` + trigger
- The shares of a customised expense sum exactly → a validation trigger

The reason is that three independent writers touch the same data: the mobile client, the daily cron, and the catch-up on app open. An application-level check has to be replicated in all three and can fail under concurrency. A database constraint holds for all of them, always.

---

## 3. The three decisions you made, and how I translated them

### 3.1 A household of N members

You chose "N members of the household (family/flatmates)" over two partners.

The tension with the second decision ("extend and evolve") is obvious: N members appears to require replacing `couple_id` with `household_id` everywhere — meaning a migration of the other eight Couple OS features for the sake of one. The resolution is in §4.1.

### 3.2 Extend the existing module

You chose to evolve `expenses`, `budgets` and `financial_goals` rather than rewrite them.

I agree, and the main reason is not saved effort: the existing data is already in those tables, and a rewrite still requires a migration — so you pay for the migration *and* the rewrite. Extending means every phase is shippable, the three current tabs keep working throughout the transition, and if the project stalls halfway the app is still usable.

The cost: **transition debt**. For several phases, `expenses.category` (text) coexists with `expenses.category_id` (FK), and `paid_by_id` with `paid_by_member_id`. That is duplication, and it is confusing to read. I manage it with triggers that keep the legacy columns aligned, and with an explicit removal phase (7.1). **The debt is acceptable only because it has an expiry date written into the roadmap** — without one, it would sit there for years.

### 3.3 Essential scope, plus goals linked to the budget

You asked for the essential scope, plus the ability to create goals like "Bali trip" and direct part of the budget towards them.

I treated this as a modelling requirement rather than a bolt-on feature: **a goal is a budget line, just like a spending category**. Details in §4.5.

---

## 4. The technical choices

### 4.1 N members without rewriting tenancy

**Choice:** `couple_id` stays the tenancy key; the participants in expenses live in a `household_members` table separate from `users`.

I considered three routes.

*Rename `couples` to `households` and propagate everywhere.* Semantically clean. But it touches every table, every RLS policy, every index and every component across all eight Couple OS features — including board, memories and check-in, which are intrinsically built for two people (a check-in has `user1_id`, `user2_id`, `mood1`, `mood2`). Enormous risk, benefit confined to the finance module.

*Add a parallel `household_id` to the finance tables only.* Two tenancy keys in the same database, two RLS helpers, two possible sources of truth about who belongs to what. Permanent confusion.

*Keep `couple_id` and add a roster of participants.* This is the one I chose.

The key insight is that `users.couple_id` **already admits N users on the same household** — it is a plain foreign key, not a cardinality constraint. The two-person limit is an assumption in the application code, not in the schema. Tenancy does not need to change: what needs to change is the assumption that there are exactly two members.

The choice brought a benefit I was not looking for. By separating `household_members` from `users`, a participant can have no account: `user_id` is nullable. That covers a flatmate who doesn't use the app, a child, a parent who contributes to expenses — realistic cases in a household, where not everyone will install a couples app. **It separates who has access from who participates in expenses**, which really are two different things. It also fixes the defect in §1.2: `paid_by_member_id` is always resolvable from the roster, with no inference from data.

The cost is legibility: in the database, tenancy is called `couple_id` while in the domain it is called a household. A name that doesn't match its concept is permanent cognitive debt. I accepted it because the alternative is a global rename, and I mitigated it with an explicit glossary ([`specs.md` §12](./specs.md#12-glossary)).

**When to revisit:** if Couple OS ever decides to support non-couple households as a first-class case — families, flatshares as a product — then the global rename becomes justified, and it should be done as a dedicated operation, not inside the finance module.

### 4.2 Categories as data, with cloned system presets

**Choice:** an `expense_categories` table, system presets with `couple_id is null`, cloned for each household at creation.

The alternative was keeping the presets as shared read-only rows and allowing additions only. Simpler, but it prevents renaming "Entertainment" to "Fun" or changing its emoji — and the requirement was *customisable* categories. Cloning costs 12 rows per household, an irrelevant amount, and makes every category editable with no special cases in the code: there is no "system" category the client has to treat differently.

**`kind` (FIXED/VARIABLE) is an attribute of the category, not of the individual expense.** I considered putting it on the expense, which would be more flexible. But in practice a category is fixed or variable by nature — rent does not become a variable expense — and putting it on the expense means asking the user for one more decision on every entry, on the path I want to be the fastest of all. The distinction exists to serve the "how much of our budget is non-negotiable" statistic, and at that level aggregating by category is sufficient.

**Categories are archived, not deleted.** Deleting a category with linked expenses means either losing the historical classification or reassigning it arbitrarily to "Other" — which falsifies statistics silently, the worst kind of error. `archived = true` removes it from pickers and leaves it in history.

**No subcategories in v1.** They are the most requested feature in every budgeting app, and I excluded them anyway: they double the complexity of every aggregation query (rolling children up into the parent), of every chart, and of the management interface. With twelve well-chosen categories, most households don't need them. The schema does not preclude them: adding `parent_id` later is an additive migration.

### 4.3 Fixed expenses: cron plus catch-up, both idempotent

**Choice:** two generation mechanisms, with idempotency guaranteed by a unique index.

A daily cron alone fails at the edges: a household created after the run, a failed run, an app opened after months of inactivity. A catch-up on app open alone fails if nobody opens the app — and the "expense recorded" notifications would never fire.

Both call the same `post_due_recurring()` function, and they can run in any order and any number of times: the unique index on `(recurring_expense_id, period_key)` makes double generation impossible at the database level. This is the most important application of the §2.2 principle: if idempotency depended on an application check, two concurrent writers (the cron and a client opening the app, at 09:00 on a Monday) could both pass it.

**`variable_amount` is a feature, not an edge case.** The electricity bill has a predictable date and an unpredictable amount. A system that automatically generates the wrong amount is worse than one that generates nothing: it introduces false data the user has to notice and correct. With `variable_amount = true` the system proposes the previous occurrence's amount and waits for confirmation — it knows the date, you know the figure.

### 4.4 Migrating categories: map, don't normalise

The riskiest step in the project. `expenses.category` is free text and can hold values from two vocabularies (§1.2).

**Choice:** an explicit mapping for known values; for every unknown value, create a household category carrying the original label.

The shortcut would be to send anything unrecognised to "Other". That is unacceptable: it falsifies history silently and irreversibly, and the user discovers months later that their statistics don't add up — with no way to reconstruct the data. Better to end up with a few extra categories to tidy by hand than with wrong data and no way to notice.

The migration ends with an assertion inside its transaction: if even one expense is left without a `category_id`, the whole migration fails and is not applied. **A partial migration on monetary data is worse than a failed one.**

### 4.5 A goal is a budget line

Your request: create "Bali trip" and direct part of the budget towards it.

**Choice:** `monthly_allocation` on the goal enters the budget equation alongside the spending categories.

```
Available = expected income − fixed budgets − variable budgets − goal allocations
```

The alternative modelling was a special "Savings" category with a budget, linked to the goal. It works, but it conflates two concepts: a spending category records money that left, a goal accumulates money set aside. If "Bali" were a category, it would appear in the spending donut next to "Eating out", and the question "how much did we spend this month" would have an ambiguous answer.

Keeping them separate but summing them into the available calculation yields the property that actually matters: **savings compete with spending for the same money**. If you direct €200 a month to Bali, that's €200 you cannot spend elsewhere, and the budget tells you before you spend it — not at the end of the month.

**`goal_contributions` instead of just `saved_amount`.** The `saved_amount` column already exists and is used by `GoalsTab.tsx`. Adding a contributions table gives you history ("where did this €1,400 come from"), the distinction between manual deposits and automatic allocations, and attribution to the member who paid in. `saved_amount` remains as a denormalised value maintained by trigger: the existing component keeps working unchanged, but stops being the source of truth.

The partial unique index on `(goal_id, budget_period_id) where source = 'BUDGET_ALLOCATION'` prevents a double period-close from doubling the savings. Same principle as the recurring expenses.

### 4.6 Charting library

**Choice:** `victory-native` XL with `@shopify/react-native-skia`.

`plan.md` already names Victory Native, but neither library is installed. Victory Native XL requires Skia, which adds a few MB to the bundle but is well supported on Expo 55 and RN 0.83, and is the same foundation the serious alternatives would use.

Alternatives considered: `react-native-gifted-charts` (lighter, no Skia, but less styling control and a less stable API) and hand-rolled SVG with `react-native-svg` (total control, no new dependency, but donuts and line charts with axes and tooltips are more work than they look).

**A decision to verify in Phase 4**, by measuring the real bundle impact. If Skia turns out to be disproportionate for four charts, the chosen chart types (donut, line, bars, gauge) are all achievable with `react-native-svg` — a change confined to `components/finance/charts/`, which I isolated in a dedicated directory for exactly this reason.

### 4.7 Roles enforced in RPCs, not in RLS

**Choice:** `member_role` (OWNER/MEMBER/VIEWER) is checked inside the RPC functions, not by RLS policies.

Expressing roles in RLS would mean one policy per operation per table, each with a subquery against `household_members` in every `using` and every `with check` — multiplying the policies and adding a join to every row read. RLS becomes the place where permissions go wrong in ways that are hard to diagnose.

Because **every write in the module goes through an RPC** (a consequence of the §2.1 principle), a role check at the top of each function is sufficient and lives in one place. RLS keeps doing the one thing it must do absolutely: **isolate households from one another**. That is the real security guarantee; roles are a product rule.

**Validity condition:** this holds as long as no write bypasses the RPCs by going straight to `supabase.from(...).insert()`. It needs checking in code review, and it is why Phase 6.3 includes an explicit test that a `VIEWER` cannot write through any path.

### 4.8 Rollover off by default

**Choice:** `rollover_enabled = false` by default, enabled per category.

Rollover is useful on categories with irregular spending — if you did no maintenance this month, the €100 unspent reasonably stays available next month. It is misleading on regular categories: if €30 is left over on transport every month, after a year the budget shows €360 of headroom that reflects no real intention, and the progress bar stops meaning anything.

Off by default, enabled where it helps, with the remainder (positive or negative) in a distinct `carried_amount` column — so the user always sees "budget €500 + €80 carried" rather than a mysterious €580.

### 4.9 Integer-cent arithmetic for splits

A three-way split of €100 has no exact solution in two-decimal currency. Rounding each share independently gives 33.33 × 3 = €99.99: one cent short, and across a month of shared expenses the missing cents become tens.

`split_expense_cents()` converts to integer cents, computes the integer parts, and distributes the remainders one at a time to the members with the largest fraction (largest remainder method), with a stable tie-break. **The shares sum to exactly the amount** — not to an acceptable approximation. With `n = 2` it degenerates to the current behaviour, so it introduces no regression.

### 4.10 Settling up with min cash flow

With three members, balances can require A to pay B who pays C. The greedy algorithm (iteratively match the largest debtor to the largest creditor) produces at most N−1 transfers.

It is not the theoretical optimum — finding the absolute minimum number of transactions is NP-hard — but for households of 2–6 people the difference is zero or one transfer, and the algorithm is deterministic, explainable and instant. For N=2 it returns exactly the current message ("Anna owes Marco €42.50").

Settlements are recorded as rows, not as a zeroing of balances. History matters: "we settled up on 3 August" is something the user wants to be able to revisit, and without a trace the balance would start growing again with no explanation.

---

## 5. What we excluded, and why

Consistent with the "essential" scope you chose. Every exclusion is a decision, not an oversight.

| Excluded | Reason | Cost of adding it later |
|---|---|---|
| **CSV import / open banking** | A project in itself: parsing heterogeneous bank formats, deduplication, automatic category matching. Only worth it once manual entry is in steady state and you know which categories you actually use. | Low — additive, no schema change |
| **End-of-month forecasting** | Without months of history it produces arbitrary numbers. With the Phase 4 statistics in hand you can design something grounded. | Low — reads existing data |
| **Debt and instalments** | A different model: principal, interest, amortisation schedule. An instalment can be modelled as a recurring expense with an `end_date`, which covers the practical case. | Medium — new tables |
| **Receipt photos** | Requires storage (already present for memories) and a capture flow. Useful, but it doesn't change the ability to budget. | Low — column + upload |
| **Multi-currency** | Changes every calculation: every amount would need a currency and a rate at the date. High cost for a household that spends in one currency. | **High** — touches the whole schema |
| **Subcategories** | §4.2 | Medium — rollups in every query |
| **Investments and net worth** | A different domain: valuations that change over time, returns; not "how much did we spend". | High — separate module |

Multi-currency is the only one whose later addition would be genuinely expensive. It is worth deciding deliberately now: **if the household straddles two countries or part of the spending is in a foreign currency, it should be addressed before Phase 3**, not after. In every other case, excluding it is the right call.

---

## 6. How the roadmap is ordered

Four criteria, in priority order when they conflict.

**Biggest risk first.** Migrating categories is the step where data can be lost. It is in Phase 1, while historical data is still sparse. Every month of delay makes it riskier.

**Foundations before what rests on them.** Phase 0 produces nothing visible — it is the phase a demo-driven plan would cut. But without a member roster and a split engine, every later phase would reimplement pieces of both, and Phase 6 would become a rewrite instead of an addition.

**Daily value early.** Categories (Phase 1) and fixed expenses (Phase 2) change real usage the most. Fixed expenses in particular remove the greatest friction: re-entering rent and utilities by hand every month is the main reason people stop using a budgeting app.

**Every phase shippable.** No phase leaves the module broken. If the project stops after Phase 3, what exists works and is useful.

**Why N-member splits sit in Phase 6 and not earlier**, given that it is the feature you explicitly asked for: the foundations (Phase 0) already make it correct under the hood from the start — expenses, budgets and statistics work with N members immediately. Phase 6 exposes the *controls* over the split to the user and adds settling up, which only makes sense once there is a history of expenses to settle. Bringing it forward would mean building the interface for a feature with no data to operate on.

---

## 7. About these documents

**Why `docs/budgeting/` and not the repository root.** The root already contains a `roadmap.md` — the Couple OS mobile roadmap, tracking the state of all eight features. Writing the budget module's roadmap over it would have destroyed that document. The three files live in a dedicated subdirectory; the main roadmap should be updated (Phase 7.4) with a line pointing here.

**What needs verifying before starting Phase 1.** Two things the code cannot tell you:

1. **Which values actually exist in `expenses.category` in production.** The mapping table in [`specs.md` §6](./specs.md#6-migrating-existing-data) covers the two vocabularies present in the code, but only a `select distinct category from expenses` against the real database will say whether there are others. Do this before writing migration `008`.
2. **Whether `budgets` and `financial_goals` were added to the realtime publication.** They are not in `002_rls.sql`, but that file itself warns that the publication also has to be configured from the dashboard. If they weren't, two members currently don't see each other's budget and goal changes in real time.
