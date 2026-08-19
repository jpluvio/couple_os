# Deployment

## Web (Vercel)

The web build is the Expo web export of `apps/mobile`, served as a single-page
app.

**The Vercel project's Root Directory must be the repository root**, not
`apps/mobile`. `apps/mobile/package.json` depends on `@couple-os/shared`, which
only exists as an npm workspace at the root: installing from inside
`apps/mobile` makes npm look for `@couple-os/shared` on the public registry and
fail with `E404 '@couple-os/shared@*' is not in this registry`. That was the
cause of the failing deployments.

`vercel.json` at the root pins the rest:

| Setting | Value | Why |
|---|---|---|
| `installCommand` | `npm install` | Installs the whole workspace from the root |
| `buildCommand` | `npm run build` | `turbo build` — builds `@couple-os/shared` before the app that imports it |
| `outputDirectory` | `apps/mobile/dist` | Where `expo export --platform web` writes |
| `rewrites` | everything → `/index.html` | Expo Router is a client-side router |

To reproduce a deployment locally:

```bash
npm install
npm run build          # packages/shared → dist, apps/mobile → dist
npx serve apps/mobile/dist
```

## Database (Supabase)

Migrations live in `supabase/migrations/` and are applied in order. They are
plain SQL: run them through the Supabase CLI, or paste them into the SQL editor
in order.

After applying `007`–`011`, run the verification suite against the database:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/budget_os_test.sql
```

Every check prints `PASS`; the first failure aborts the script, and the whole
run is wrapped in a transaction that rolls back, so it leaves no data behind.

## Scheduled jobs

`supabase/functions/daily-cron` runs at 09:00 (Dashboard → Edge Functions →
daily-cron → Schedule `0 9 * * *`). Besides the pantry, memories and to-do
reminders it calls `post_due_recurring()` for every household. The same RPC runs
on app open (`useRecurringCatchUp`); both are idempotent.
