# Budget OS — Design roadmap

> Development phases for the household budgeting module of Couple OS.
> Related documents: [`specs.md`](./specs.md) (technical specification), [`report.md`](./report.md) (reasoned choices).

---

## How the phases were designed

1. **Every phase is shippable.** At the end of each one the app works: no phase leaves the module broken or half-built.
2. **No regressions during the transition.** The existing components (`ExpensesTab`, `BudgetTab`, `GoalsTab`) keep working until they are replaced. Legacy columns stay populated until Phase 6.
3. **Database first, then calculation, then interface.** Each phase builds the layer the next one rests on.
4. **Value arrives early.** Customisable categories (Phase 1) and fixed expenses (Phase 2) are the two features that change daily use the most, so they come first.
5. **The riskiest thing is tackled immediately.** Migrating historical category data is the most delicate step in the project, and it sits in the first phase, while there is little data.

---

## Overview

| Phase | Theme | Migrations | Release |
|---|---|---|---|
| 0 | Foundations: household members and the calculation layer | `007` | Internal |
| 1 | Customisable categories | `008` | ✅ User |
| 2 | Recurring fixed expenses | `009` | ✅ User |
| 3 | Complete monthly budget | `010` | ✅ User |
| 4 | Statistics | `011` | ✅ User |
| 5 | Goals linked to the budget | `012` | ✅ User |
| 6 | N-member splits and settling up | `013` | ✅ User |
| 7 | Polish, cleanup, integration | `014` | ✅ User |

---

## Phase 0 — Foundations

**Goal:** make household members a first-class entity and build the monetary calculation engine, without changing anything visible.

**Why this comes first:** `expenses.paid_by_id` points at `users`, which makes it impossible to record an expense for a participant without an account and forces the current code to infer the partner with `expenses.find(e => e.paid_by_id !== user.id)` — which returns an empty string until the partner has entered at least one expense. Everything else rests on this.

### 0.1 — Household members
- [ ] Migration `007`: `member_role` enum, `CUSTOM` value on `split_mode`
- [ ] `household_members` table with a partial unique index on `(couple_id, user_id)`
- [ ] `sync_member_on_user_couple` trigger: creates the member row when a user joins the household
- [ ] Backfill members for existing households (`display_name`, `monthly_income` from `users.salary`, `OWNER` for the first)
- [ ] `expenses.paid_by_member_id` column + backfill from `paid_by_id`
- [ ] `sync_legacy_expense_fields` trigger to keep legacy columns populated
- [ ] RLS on `household_members`, added to the realtime publication

### 0.2 — Calculation engine
- [ ] `split_expense_cents()` using the largest remainder method
- [ ] `member_weights(p_couple_id)`: weights per split mode, degrading to `EQUAL` when incomes are missing
- [ ] `expense_shares` table + sum-validation trigger
- [ ] `v_expense_member_shares` view
- [ ] `validate_custom_shares()` for the sum of custom shares

### 0.3 — Verification
- [ ] Test: shares sum to the total for N from 1 to 10, in all three modes
- [ ] RLS test: `household_members` isolation between households
- [ ] Regression check: `ExpensesTab` and `BudgetTab` behave exactly as before

**Deliverable:** nothing visible changes. The database knows who the members are and can divide an amount without losing cents.

---

## Phase 1 — Customisable categories

**Goal:** categories become data, not constants scattered through the code.

**The problem it solves.** Categories are currently defined in three places with two different vocabularies: `EXPENSE_CATEGORIES` in `packages/shared/src/index.ts` (`"Affitto"`, `"Bollette"`, …) which no component imports, and an identical `CATEGORIES` array duplicated in `ExpensesTab.tsx` and `BudgetTab.tsx` (`"casa"`, `"cibo"`, …). Adding a category means editing three files, and historical data may contain either vocabulary.

### 1.1 — Schema and data migration
- [ ] Migration `008`: `expense_kind` enum, `expense_categories` table
- [ ] Seed the 12 system presets (`couple_id is null`)
- [ ] `seed_household_on_couple` trigger: clones the presets for every new household
- [ ] Clone presets for households that already exist
- [ ] `expenses.category_id` and `budgets.category_id` columns
- [ ] **Map historical values** per the table in [`specs.md` §6](./specs.md#6-migrating-existing-data)
- [ ] Unmapped values → household category keeping the original label, never reassigned to "Other"
- [ ] End-of-migration assertion: zero expenses with a null `category_id`, otherwise roll back
- [ ] `guard_category_delete` trigger: blocks deletion when data is linked
- [ ] RLS + realtime

### 1.2 — Shared schemas
- [ ] `CreateCategorySchema` in `packages/shared`
- [ ] `DEFAULT_EXPENSE_CATEGORIES` with slug, label, emoji, kind
- [ ] Deprecate `EXPENSE_CATEGORIES` (comment now, removal in Phase 7)

### 1.3 — Interface
- [ ] `hooks/useCategories.ts` with TanStack Query caching
- [ ] `components/finance/CategoryPicker.tsx` — the **single** picker, replacing all three arrays
- [ ] `components/finance/CategoryChip.tsx`
- [ ] `app/(app)/finance/categories.tsx` screen: list, reorder, create, edit, archive
- [ ] Emoji and colour picker
- [ ] Fixed/Variable toggle on the category
- [ ] Remove the `CATEGORIES` arrays from `ExpensesTab.tsx` and `BudgetTab.tsx`

**Deliverable:** the user creates, renames, colours and archives their own categories. No historical data lost.

---

## Phase 2 — Recurring fixed expenses

**Goal:** rent, utilities and subscriptions are declared once and record themselves.

### 2.1 — Schema
- [ ] Migration `009`: `recurrence_freq` and `expense_source` enums
- [ ] `recurring_expenses` table
- [ ] `expenses.source`, `recurring_expense_id`, `period_key` columns
- [ ] **Unique index `(recurring_expense_id, period_key)`** — the idempotency guarantee
- [ ] `set_expense_period_key` trigger
- [ ] RLS + realtime

### 2.2 — Generation
- [ ] `resolve_due_date(period, day_of_month)` handling short months and `-1` (last day)
- [ ] `post_due_recurring(p_couple_id, p_up_to)` — idempotent
- [ ] Extend the existing `daily-cron` Edge Function with a call per active household
- [ ] `hooks/useRecurringCatchUp.ts`: catch-up when the app opens
- [ ] Handle `auto_post = false`: create a proposal instead of an expense
- [ ] Handle `variable_amount`: propose the previous occurrence's amount

### 2.3 — Interface
- [ ] `app/(app)/finance/recurring.tsx` screen
- [ ] `RecurringCard.tsx` showing next due date and amount
- [ ] Create/edit form with frequency and day-of-month pickers
- [ ] `PendingRecurringBanner.tsx` at the top of the expense list, with inline confirmation
- [ ] "auto" badge on generated expenses, to distinguish them from manual ones
- [ ] "Skip this month" action on a single occurrence

### 2.4 — Verification
- [ ] Test: `post_due_recurring` run three times produces one expense
- [ ] Test: a recurring expense on day 31 generates correctly in February
- [ ] Test: an ended recurring expense (past `end_date`) generates nothing further

**Deliverable:** the household's non-negotiable expenses record themselves. This is the phase that removes the most daily friction.

---

## Phase 3 — Complete monthly budget

**Goal:** plan the month, not just report on it.

### 3.1 — Schema
- [ ] Migration `010`: `budget_period_status` enum, `budget_periods` table
- [ ] Columns on `budgets`: `budget_period_id`, `period_key`, `rollover_enabled`, `carried_amount`
- [ ] Replace the `(couple_id, category, month, year)` unique constraint with `(budget_period_id, category_id)`
- [ ] Migrate existing budget rows into their periods
- [ ] RLS + realtime

### 3.2 — Calculation
- [ ] `v_period_category_spend` view
- [ ] `get_budget_overview(p_period)` RPC — planned, carried, spent, remaining, status per category
- [ ] `create_next_period(p_period, p_copy_from)` RPC
- [ ] `close_budget_period(p_period)` RPC: computes rollovers and opens the next period
- [ ] Rollover logic: positive and negative remainders, only when `rollover_enabled`

### 3.3 — Interface
- [ ] Rewrite `BudgetTab.tsx` onto `get_budget_overview` (one RPC instead of two queries plus a client-side reduce)
- [ ] Month navigation (arrows + swipe)
- [ ] Expected income field for the period
- [ ] Separate Fixed / Variable sections with subtotals
- [ ] Budget row with bar and colour thresholds (green / amber above 80% / red above 100%)
- [ ] "Copy from previous month" action on empty periods
- [ ] Rollover toggle per budget row
- [ ] Summary header: income, planned, spent, available

### 3.4 — Notifications
- [ ] Budget threshold triggers at 80% and 100%, with an anti-repeat guard
- [ ] Generalise `notify_partner()` to every household member (it currently picks one with `limit 1`)

**Deliverable:** the monthly budget can be planned, compared, and carries its leftovers forward.

---

## Phase 4 — Statistics

**Goal:** answer "where does the money go" and "is this getting better or worse".

### 4.1 — Calculation
- [ ] Migration `011`: views and supporting indexes
- [ ] `get_category_stats(p_from, p_to)` RPC with change versus the previous period
- [ ] `get_monthly_trend(p_months)` RPC with total / fixed / variable / budget series
- [ ] Performance check against a 5,000-expense dataset

### 4.2 — Charts
- [ ] Install `victory-native` XL and `@shopify/react-native-skia`
- [ ] `charts/CategoryDonut.tsx`
- [ ] `charts/TrendLine.tsx`
- [ ] `charts/MonthCompareBars.tsx`
- [ ] `charts/BudgetGauge.tsx`
- [ ] Palette derived from category colours, with a fallback for colourless categories
- [ ] Every chart pairs colour with a text label (accessibility)

### 4.3 — Interface
- [ ] `StatsTab.tsx` as the fourth section of the Finance tab
- [ ] Range picker: month · 3 months · 6 months · year · custom
- [ ] Top 5 categories with percentage change
- [ ] Fixed / variable ratio
- [ ] Budget adherence across closed periods
- [ ] Breakdown per member
- [ ] Drill-down: tap a category → filtered expense list

**Deliverable:** the per-category statistics that were asked for, with historical depth.

---

## Phase 5 — Goals linked to the budget

**Goal:** a savings goal absorbs a monthly share of the budget and grows by itself.

### 5.1 — Schema
- [ ] Migration `012`: `goal_status` and `contribution_source` enums
- [ ] Columns on `financial_goals`: `target_date`, `monthly_allocation`, `emoji`, `color`, `status`, `priority`
- [ ] `goal_contributions` table
- [ ] **Partial unique index** `(goal_id, budget_period_id) where source = 'BUDGET_ALLOCATION'`
- [ ] `refresh_goal_saved_amount` trigger: keeps `saved_amount` in sync and promotes to `REACHED`
- [ ] Backfill: existing `saved_amount` becomes an initial `MANUAL` contribution
- [ ] RLS + realtime

### 5.2 — Budget integration
- [ ] `get_budget_overview` includes goal allocations in the available calculation
- [ ] `close_budget_period` creates `BUDGET_ALLOCATION` contributions for active goals
- [ ] Warning when total allocations exceed what is available
- [ ] Goal-reached notification

### 5.3 — Interface
- [ ] Extend `GoalsTab.tsx`: monthly allocation, target date, emoji
- [ ] `GoalAllocationSheet.tsx` with a "at this rate, reached by <month>" projection
- [ ] Warning when the target date is unreachable at the current allocation
- [ ] Goals section on the Budget screen showing the period's allocations
- [ ] Contribution history on the goal card
- [ ] Extra manual contribution
- [ ] Pause / archive states

**Deliverable:** "Bali trip" is a line in the monthly budget that funds itself.

---

## Phase 6 — N-member splits and settling up

**Goal:** make households of more than two people work correctly.

**Why it sits here:** the earlier phases already work with N members thanks to the Phase 0 foundations. This phase exposes the split controls to the user and closes the loop with settling up — which only makes sense once expenses, budgets and statistics are in steady state.

### 6.1 — Schema and calculation
- [ ] Migration `013`: `settlements` table
- [ ] `v_member_balances` view
- [ ] `get_member_balances(p_from, p_to)` RPC
- [ ] `suggest_settlements()` RPC — min cash flow, at most N−1 transfers
- [ ] Enforce the `VIEWER` role in every write RPC
- [ ] RLS + realtime

### 6.2 — Interface
- [ ] `app/(app)/finance/members.tsx` screen: member list, invitations, roles
- [ ] Adding a participant without an account
- [ ] Split rule picker: Equal / Proportional / Custom
- [ ] Custom share editor with 100% sum validation
- [ ] Per-expense split override (selecting which members are involved)
- [ ] Replace the client-side balance calculation in `ExpensesTab.tsx` with the RPC
- [ ] `app/(app)/finance/settle.tsx` screen with the suggested transfers
- [ ] Recording a reimbursement
- [ ] `MemberAvatar.tsx` with a per-member colour used in charts

### 6.3 — Verification
- [ ] Test: balances after the suggested settlements are all zero
- [ ] Test: transfer count ≤ N−1
- [ ] Test: a `VIEWER` cannot write through any RPC

**Deliverable:** a household of three flatmates manages expenses and settles up correctly.

---

## Phase 7 — Polish, cleanup, integration

**Goal:** remove the transition debt and integrate the module with the rest of Couple OS.

### 7.1 — Clearing the debt
- [ ] Drop `expenses.category` (text) and `expenses.paid_by_id`
- [ ] Drop the `sync_legacy_expense_fields` trigger
- [ ] Drop `budgets.category`, `budgets.month`, `budgets.year`
- [ ] Remove `EXPENSE_CATEGORIES` from `packages/shared`
- [ ] Regenerate `apps/mobile/types/database.ts`
- [ ] Check: no remaining references to the dropped columns

### 7.2 — Integration with other features
- [ ] From the shopping list (completed `shopping_items`) → quick expense creation in the `groceries` category
- [ ] A fixed expense's due date → an event in the shared calendar
- [ ] End-of-month summary as an automatic post on the board
- [ ] Deep links from finance notifications to the right screen

### 7.3 — Polish
- [ ] Centralised currency formatting with `Intl.NumberFormat('it-IT')`
- [ ] Skeleton loaders on every screen in the module
- [ ] Haptic feedback on adding an expense and confirming a recurring one
- [ ] Empty states with illustration and CTA
- [ ] Accessibility pass: contrast, tap target sizes, information never carried by colour alone
- [ ] CSV export of a period's expenses

### 7.4 — Documentation update
- [ ] Fix `plan.md` and `dashboard.md`, which describe a non-existent Fastify/Prisma backend
- [ ] Update `instructions.md`: the "Finance categorie → fixed `EXPENSE_CATEGORIES` array" row in the gap table no longer holds
- [ ] Update the tracking table in the root `roadmap.md`

**Deliverable:** a complete module, free of transition debt, integrated with the other features.

---

## Tracking

| Area | Schema | Calculation | Interface |
|---|---|---|---|
| Household members | ⬜ | ⬜ | ⬜ |
| Customisable categories | ⬜ | — | ⬜ |
| Fixed expenses | ⬜ | ⬜ | ⬜ |
| Variable expenses | ✅ | ⬜ | 🚧 |
| Monthly budget | 🚧 | ⬜ | 🚧 |
| Rollover | ⬜ | ⬜ | ⬜ |
| Statistics | — | ⬜ | ⬜ |
| Goals | 🚧 | ⬜ | 🚧 |
| Goal allocations | ⬜ | ⬜ | ⬜ |
| N-member splits | ⬜ | ⬜ | ⬜ |
| Settling up | ⬜ | ⬜ | ⬜ |
| Finance notifications | 🚧 | ⬜ | ⬜ |

**Legend:** ✅ complete · 🚧 partial (exists but needs evolving) · ⬜ to do · — not applicable

---

## Phase dependencies

```
Phase 0 (members + calculation engine)
   │
   ├──> Phase 1 (categories) ──> Phase 2 (fixed expenses) ──┐
   │                                                         │
   │                                                         v
   │                                                 Phase 3 (budget)
   │                                                         │
   │                                       ┌─────────────────┼──────────────┐
   │                                       v                 v              │
   │                              Phase 4 (statistics)  Phase 5 (goals)     │
   │                                       │                 │              │
   └──> Phase 6 (N-member splits) <────────┴─────────────────┘              │
                    │                                                       │
                    └──────────> Phase 7 (cleanup + integration) <──────────┘
```

Phases 4 and 5 are independent of each other and can proceed in parallel once Phase 3 is done. Phase 6 depends only on Phase 0 technically, but ships after Phase 3 so that splits are not exposed before the budget is in steady state.

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Losing or misassigning historical categories | High — silently falsified data | Explicit mapping, generated categories for unknown values, end-of-migration assertion inside the transaction |
| Double generation of recurring expenses | High — falsified budget | Unique index on `(recurring_expense_id, period_key)`: the guarantee lives in the database, not the code |
| Rounding errors in splits | Medium — cents that don't add up, loss of trust in the app | Integer-cent arithmetic, largest remainder method, tests for N from 1 to 10 |
| Breaking existing components during the transition | Medium | Legacy columns maintained by triggers until Phase 7 |
| Realtime not enabled on the new tables | Low — data not syncing between members | An explicit checklist item in every phase; `budgets` and `financial_goals` are already outside the publication today |
| Skia's weight on the bundle | Low | Assess in Phase 4; SVG alternative documented in [`report.md` §4.6](./report.md#46-charting-library) |
| Documentation drifting from the code | Low, but already the case | Phase 7.4 realigns `plan.md`, `dashboard.md` and `instructions.md` |
