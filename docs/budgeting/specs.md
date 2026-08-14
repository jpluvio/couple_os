# Budget OS — Specifiche tecniche e funzionali

> Modulo di budgeting domestico per Couple OS.
> Versione 1.0 delle specifiche — agosto 2026.
> Documenti collegati: [`roadmap.md`](./roadmap.md) (fasi di progettazione), [`report.md`](./report.md) (scelte motivate).

---

## 1. Obiettivo e perimetro

### 1.1 Cosa fa

Budget OS gestisce il denaro di un **nucleo domestico**: creare e calcolare budget mensili, tracciare spese fisse e variabili, ripartire i costi tra i membri, generare statistiche per categoria e alimentare obiettivi di risparmio con una quota del budget.

Le cinque cose che deve fare bene:

1. **Budget mensile** — pianificare quanto spendere per categoria, confrontare pianificato vs reale, riportare gli avanzi al mese successivo.
2. **Spese fisse** — dichiarare una volta affitto, bollette e abbonamenti; il sistema li registra automaticamente ogni periodo senza reinserimento manuale.
3. **Spese variabili** — inserimento rapido (importo, categoria, chi ha pagato) in meno di cinque secondi.
4. **Statistiche** — dove finiscono i soldi, come cambia nel tempo, chi ha pagato cosa, quanto si rispetta il budget.
5. **Obiettivi di risparmio** — un obiettivo ("Vacanza a Bali") assorbe una quota mensile del budget esattamente come una categoria di spesa, e cresce automaticamente ogni periodo.

### 1.2 Cosa non fa (v1)

Esclusioni deliberate, motivate in [`report.md` §5](./report.md#5-cosa-abbiamo-escluso-e-perché):

- Import di estratti conto (CSV/OFX) o connessioni bancarie (PSD2/open banking)
- Previsioni e proiezioni predittive di fine mese
- Gestione di debiti, prestiti e piani di rientro rateali
- Allegati/foto degli scontrini
- Multivaluta e conversione cambi
- Sottocategorie annidate
- Investimenti e patrimonio netto

### 1.3 Vincoli di progetto

| Vincolo | Implicazione |
|---|---|
| Deve integrarsi in Couple OS | Stesso monorepo, stesso stack, stessa tenancy, stesso design system |
| Il modulo `finance` esiste già e contiene dati | Evoluzione incrementale via migrazioni, nessuna riscrittura distruttiva |
| Nucleo di N membri (non solo 2 partner) | Split e saldi generalizzati a N, tabella membri esplicita |
| Mobile-first, offline-tollerante | Calcoli deterministici lato server, cache lato client |

---

## 2. Architettura

### 2.1 Stato reale dello stack

> ⚠️ **Nota di allineamento.** `plan.md` e `dashboard.md` nella root descrivono un backend Fastify + Prisma con `apps/api` e `apps/web` "completi". Nel repository quelle directory **non esistono**: l'implementazione reale è Supabase acceduto direttamente dal client, con RLS come livello di autorizzazione. Queste specifiche descrivono lo stack reale. Vedi [`report.md` §1](./report.md#1-il-punto-di-partenza-reale).

| Layer | Tecnologia | Note |
|---|---|---|
| Database | PostgreSQL (Supabase) | Migrazioni SQL in `supabase/migrations/` |
| Autorizzazione | Row Level Security | Helper `public.get_couple_id()` già presente |
| Logica di calcolo | Funzioni SQL + RPC (`security definer` dove serve) | Nessun server applicativo intermedio |
| Job schedulati | Supabase Edge Functions + Cron | `daily-cron` già attiva alle 09:00 |
| Realtime | Supabase Realtime (publication `supabase_realtime`) | |
| Client | Expo 55 / React Native 0.83 / Expo Router 5 | `apps/mobile` |
| Stato server | TanStack Query v5 | Con persister AsyncStorage |
| Styling | NativeWind v4 | Colore modulo finance: `#10b981` |
| Form | React Hook Form + Zod | Schemi in `packages/shared` |
| Grafici | `victory-native` XL + `@shopify/react-native-skia` | Da installare — vedi [`report.md` §4.6](./report.md#46-libreria-grafici) |

### 2.2 Principio architetturale portante

**Il denaro si calcola in Postgres, non in JavaScript.**

Ogni aggregazione, ripartizione e saldo è prodotta da viste o funzioni SQL. Il client riceve numeri già calcolati e li visualizza. Tre ragioni:

1. **Precisione** — `numeric(12,2)` in Postgres è aritmetica decimale esatta; `number` in JavaScript è IEEE-754 binario e accumula errore su somme ripetute.
2. **Coerenza** — la stessa regola di split non va reimplementata in ogni componente. Oggi `ExpensesTab.tsx` calcola il saldo lato client e `BudgetTab.tsx` riaggrega le spese lato client, con due implementazioni indipendenti della stessa idea.
3. **Volume** — il client oggi scarica tutte le spese del mese per calcolare sei totali. Una vista restituisce sei righe.

### 2.3 Modello di tenancy

La tenancy resta ancorata a `couple_id`: è la chiave già usata da tutte le RLS, da tutti gli indici e da tutte le altre otto feature di Couple OS. Cambiarla significherebbe migrare l'intera applicazione per una feature sola.

Il supporto a N membri si ottiene con una tabella **`household_members`** che elenca i partecipanti finanziari del nucleo. Un partecipante può essere:

- **collegato a un utente** (`user_id` valorizzato) — ha un account, accede all'app, vede i dati;
- **non collegato** (`user_id` null) — è solo un'entità contabile: un coinquilino che non usa l'app, un figlio, un genitore che contribuisce.

Questo separa *chi accede* da *chi partecipa alle spese*. Motivazione estesa in [`report.md` §4.1](./report.md#41-n-membri-senza-riscrivere-la-tenancy).

```
couples (tenancy — invariata)
   │
   ├── users (chi ha un account, RLS ancorata qui)
   │
   └── household_members (chi partecipa alle spese, N righe)
            │  user_id → users.id  (nullable)
            │
            └── referenziato da expenses.paid_by_member_id,
                expense_shares, settlements, recurring_expenses
```

---

## 3. Modello dati

### 3.1 Cosa esiste già

| Tabella | Colonne rilevanti | Destino |
|---|---|---|
| `expenses` | `amount`, `category` (text libero), `note`, `date`, `paid_by_id`, `couple_id` | Estesa |
| `budgets` | `category` (text), `amount`, `month`, `year`, `couple_id` — unique `(couple_id, category, month, year)` | Estesa |
| `financial_goals` | `title`, `target_amount`, `saved_amount`, `couple_id` | Estesa |
| `couples` | `split_mode` enum `EQUAL`/`PROPORTIONAL` | Estesa (`CUSTOM`) |
| `users` | `salary numeric(12,2)` | Invariata, letta da `household_members` |

### 3.2 Nuovi enum

```sql
create type expense_kind        as enum ('FIXED', 'VARIABLE');
create type expense_source      as enum ('MANUAL', 'RECURRING');
create type member_role         as enum ('OWNER', 'MEMBER', 'VIEWER');
create type recurrence_freq     as enum ('WEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL');
create type budget_period_status as enum ('DRAFT', 'ACTIVE', 'CLOSED');
create type goal_status         as enum ('ACTIVE', 'REACHED', 'PAUSED', 'ARCHIVED');
create type contribution_source as enum ('MANUAL', 'BUDGET_ALLOCATION');

-- Estensione dell'enum esistente
alter type split_mode add value 'CUSTOM';
```

### 3.3 `household_members` — partecipanti del nucleo

```sql
create table public.household_members (
    id            uuid primary key default gen_random_uuid(),
    couple_id     uuid not null references public.couples(id) on delete cascade,
    user_id       uuid references public.users(id) on delete set null,
    display_name  text not null,
    avatar_emoji  text,
    color         text,                       -- identità visiva nei grafici
    role          member_role not null default 'MEMBER',
    monthly_income numeric(12,2),             -- per split PROPORTIONAL
    custom_share  numeric(6,5),               -- per split CUSTOM, 0..1
    active        boolean not null default true,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create unique index household_members_user_unique
    on public.household_members (couple_id, user_id)
    where user_id is not null;

create index on public.household_members (couple_id, active);
```

**Regole:**
- Ogni utente del nucleo ha esattamente una riga con `user_id` valorizzato (creata automaticamente da trigger, §3.12).
- `custom_share` è validato solo quando `couples.split_mode = 'CUSTOM'`: la somma delle quote dei membri attivi deve essere 1 ± 0.00001. Validazione in `validate_custom_shares()`, invocata dalla RPC di salvataggio.
- `monthly_income` sovrascrive `users.salary` quando presente; permette di dichiarare un reddito per un partecipante senza account.
- Disattivare un membro (`active = false`) lo esclude dagli split futuri ma preserva lo storico.

### 3.4 `expense_categories` — categorie personalizzabili

```sql
create table public.expense_categories (
    id          uuid primary key default gen_random_uuid(),
    couple_id   uuid references public.couples(id) on delete cascade,  -- null = preset di sistema
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

**Regole:**
- `couple_id is null` identifica i **preset di sistema**, leggibili da tutti, modificabili da nessuno. Alla creazione di un nucleo vengono clonati come categorie del nucleo (trigger §3.12), così ogni nucleo può rinominarle o cancellarle senza toccare i preset.
- `slug` è la chiave stabile usata per la migrazione dei dati storici e per i riferimenti in codice; `label` è ciò che l'utente vede e può cambiare liberamente.
- `kind` distingue **fisso** da **variabile**. È un attributo della categoria, non della singola spesa: serve a produrre la statistica "quanto del nostro budget è incomprimibile".
- **Non si cancella una categoria con spese collegate**: si archivia (`archived = true`). Sparisce dai selettori, resta nello storico e nelle statistiche. Il tentativo di `delete` con spese collegate è bloccato dalla FK (`on delete restrict`).

**Preset di sistema seminati:**

| slug | label | emoji | kind |
|---|---|---|---|
| `rent` | Affitto / Mutuo | 🏠 | FIXED |
| `utilities` | Bollette | 💡 | FIXED |
| `subscriptions` | Abbonamenti | 📺 | FIXED |
| `insurance` | Assicurazioni | 🛡️ | FIXED |
| `groceries` | Spesa | 🛒 | VARIABLE |
| `dining` | Ristoranti e bar | 🍕 | VARIABLE |
| `transport` | Trasporti | 🚗 | VARIABLE |
| `health` | Salute | 💊 | VARIABLE |
| `entertainment` | Svago | 🎉 | VARIABLE |
| `shopping` | Shopping | 👕 | VARIABLE |
| `home` | Casa e manutenzione | 🔧 | VARIABLE |
| `other` | Altro | 📦 | VARIABLE |

### 3.5 `expenses` — estensione

```sql
alter table public.expenses
    add column category_id           uuid references public.expense_categories(id) on delete restrict,
    add column paid_by_member_id     uuid references public.household_members(id) on delete restrict,
    add column source                expense_source not null default 'MANUAL',
    add column recurring_expense_id  uuid references public.recurring_expenses(id) on delete set null,
    add column period_key            date,          -- primo giorno del mese di competenza
    add column updated_at            timestamptz not null default now();

-- Competenza: normalmente il mese di `date`, ma sovrascrivibile
-- (es. bolletta di dicembre pagata a gennaio)
create index on public.expenses (couple_id, period_key, category_id);
create index on public.expenses (couple_id, paid_by_member_id, date desc);
create unique index expenses_recurring_period_unique
    on public.expenses (recurring_expense_id, period_key)
    where recurring_expense_id is not null;
```

`category` (text) e `paid_by_id` (uuid → users) restano in tabella durante la transizione e vengono popolate in parallelo dai trigger per non rompere il codice esistente. Rimozione pianificata in Fase 6.

L'indice unico su `(recurring_expense_id, period_key)` è la garanzia di **idempotenza** della generazione ricorrente: cron e catch-up possono girare quante volte vogliono senza duplicare.

### 3.6 `expense_shares` — ripartizione non standard

```sql
create table public.expense_shares (
    expense_id  uuid not null references public.expenses(id) on delete cascade,
    member_id   uuid not null references public.household_members(id) on delete cascade,
    share_amount numeric(12,2) not null check (share_amount >= 0),
    primary key (expense_id, member_id)
);
```

**Assenza di righe = ripartizione secondo la regola del nucleo.** Le righe esistono solo quando l'utente personalizza la divisione di una singola spesa (una cena divisa tra due dei tre coinquilini). Un trigger verifica che `sum(share_amount) = expenses.amount` per ogni spesa che abbia almeno una riga.

### 3.7 `recurring_expenses` — spese fisse

```sql
create table public.recurring_expenses (
    id                  uuid primary key default gen_random_uuid(),
    couple_id           uuid not null references public.couples(id) on delete cascade,
    label               text not null,
    amount              numeric(12,2) not null check (amount > 0),
    category_id         uuid not null references public.expense_categories(id) on delete restrict,
    paid_by_member_id   uuid references public.household_members(id) on delete set null,
    frequency           recurrence_freq not null default 'MONTHLY',
    day_of_month        integer check (day_of_month between -1 and 31),  -- -1 = ultimo giorno
    day_of_week         integer check (day_of_week between 0 and 6),     -- solo WEEKLY
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

**Semantica dei flag:**

- `auto_post = true` → la spesa viene creata automaticamente alla data prevista.
- `auto_post = false` → il sistema crea una **proposta** che l'utente conferma (utile per importi che cambiano).
- `variable_amount = true` → forza `auto_post = false` e propone l'importo dell'ultima occorrenza come default modificabile. È il caso della bolletta della luce: la data è certa, l'importo no.

**Gestione dei giorni impossibili:** `day_of_month = 31` a febbraio si risolve nell'ultimo giorno del mese. La funzione `resolve_due_date(period, day_of_month)` applica `least(day_of_month, days_in_month)`; `-1` significa esplicitamente "ultimo giorno".

### 3.8 `budget_periods` — il mese di budget

```sql
create table public.budget_periods (
    id                uuid primary key default gen_random_uuid(),
    couple_id         uuid not null references public.couples(id) on delete cascade,
    period_key        date not null,              -- sempre il giorno 1 del mese
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

`period_key` come `date` normalizzata al primo del mese sostituisce la coppia `(month, year)`: è ordinabile, confrontabile con `date_trunc('month', expenses.date)` e permette range query native.

### 3.9 `budgets` — righe di budget per categoria

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

- `amount` = importo pianificato per il periodo.
- `carried_amount` = residuo riportato dal periodo precedente (positivo se avanzato, negativo se sforato). Calcolato alla chiusura del periodo precedente, mai in tempo reale.
- **Budget effettivo** = `amount + carried_amount`.

### 3.10 `financial_goals` — estensione e legame col budget

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

**Il legame obiettivo ↔ budget.** `monthly_allocation` è la quota di budget che l'obiettivo assorbe ogni mese. Nell'equazione del budget un obiettivo si comporta esattamente come una categoria di spesa:

```
Disponibile = expected_income
            − Σ(budget fissi)
            − Σ(budget variabili)
            − Σ(monthly_allocation degli obiettivi ACTIVE)
```

Alla chiusura del periodo (o al passaggio di mese) viene creata una `goal_contribution` di `source = 'BUDGET_ALLOCATION'` per ogni obiettivo attivo con allocazione > 0. L'indice unico parziale garantisce **una sola contribuzione automatica per obiettivo per periodo**.

`saved_amount` su `financial_goals` diventa un valore denormalizzato mantenuto da trigger (`sum(goal_contributions.amount)`): resta leggibile dal `GoalsTab.tsx` esistente senza modifiche, ma smette di essere la fonte di verità.

Quando `saved_amount >= target_amount` un trigger porta `status` a `REACHED` e genera una notifica.

### 3.11 `settlements` — pareggio dei conti

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

Registra un rimborso effettivo tra due membri. Il saldo di un membro è:

```
balance(m) = Σ(pagato da m) − Σ(quota dovuta da m) − Σ(rimborsi versati da m) + Σ(rimborsi ricevuti da m)
```

### 3.12 Trigger di provisioning e coerenza

| Trigger | Su | Effetto |
|---|---|---|
| `seed_household_on_couple` | `after insert on couples` | Clona i 12 preset di sistema come categorie del nucleo |
| `sync_member_on_user_couple` | `after insert or update of couple_id on users` | Crea/aggiorna la riga `household_members` dell'utente |
| `sync_legacy_expense_fields` | `before insert or update on expenses` | Popola `category` (text) e `paid_by_id` dai nuovi campi, per compatibilità |
| `set_expense_period_key` | `before insert or update on expenses` | `period_key := coalesce(period_key, date_trunc('month', date))` |
| `validate_expense_shares` | `after insert/update/delete on expense_shares` | Verifica `sum(share_amount) = expenses.amount` |
| `refresh_goal_saved_amount` | `after insert/update/delete on goal_contributions` | Ricalcola `financial_goals.saved_amount`, promuove a `REACHED` |
| `guard_category_delete` | `before delete on expense_categories` | Blocca la cancellazione se esistono spese o budget collegati |
| `set_updated_at` | tutte le nuove tabelle | Pattern già esistente in `003_triggers.sql` |

---

## 4. Motore di calcolo

### 4.1 Ripartizione di una spesa

Data una spesa di importo `A` e i membri attivi `M₁…Mₙ`:

| Modalità | Quota di `Mᵢ` |
|---|---|
| `EQUAL` | `A / n` |
| `PROPORTIONAL` | `A × redditoᵢ / Σ redditi` — se un reddito manca o la somma è 0, degrada a `EQUAL` |
| `CUSTOM` | `A × custom_shareᵢ` |
| Override | `expense_shares.share_amount` quando esistono righe per quella spesa |

**Arrotondamento — metodo dei resti maggiori.** Le quote non si arrotondano indipendentemente, perché `n` arrotondamenti separati non ricompongono il totale (100 € tra 3 persone → 33,33 × 3 = 99,99 €). L'algoritmo:

1. Converti tutto in centesimi interi.
2. Calcola la quota esatta di ciascun membro, prendi la parte intera.
3. Distribuisci i centesimi residui, uno ciascuno, ai membri con la parte frazionaria più alta; a parità, ordine stabile per `household_members.id`.

Implementato una sola volta in `split_expense_cents(p_amount_cents bigint, p_members uuid[], p_weights numeric[])`. **La somma delle quote è sempre esattamente uguale all'importo, per costruzione.**

### 4.2 Viste

```sql
-- Spesa effettiva per periodo e categoria
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

-- Quota dovuta da ciascun membro (override se presente, altrimenti regola del nucleo)
create view public.v_expense_member_shares as ...

-- Saldo per membro
create view public.v_member_balances as ...
```

### 4.3 RPC esposte al client

| Funzione | Input | Output |
|---|---|---|
| `get_budget_overview(p_period date)` | mese | Per categoria: `planned`, `carried`, `spent`, `remaining`, `progress_ratio`, `status` (`OK`/`WARNING`/`OVER`) + totali + allocazioni obiettivi + disponibile |
| `get_category_stats(p_from date, p_to date)` | intervallo | Totale, percentuale sul totale, media mensile, numero di spese, variazione vs periodo precedente |
| `get_monthly_trend(p_months int)` | numero di mesi | Serie temporale: totale, fisso, variabile, budget, reddito |
| `get_member_balances(p_from date, p_to date)` | intervallo | Per membro: `paid`, `owed`, `settled`, `balance` |
| `suggest_settlements()` | — | Lista minima di trasferimenti che azzera tutti i saldi |
| `close_budget_period(p_period date)` | mese | Calcola i rollover, crea le contribuzioni agli obiettivi, marca `CLOSED`, apre il periodo successivo |
| `create_next_period(p_period date, p_copy_from date)` | mese | Crea il periodo copiando le righe di budget dal precedente |
| `post_due_recurring(p_couple_id uuid, p_up_to date)` | — | Genera le spese ricorrenti scadute (idempotente) |
| `upsert_category(...)`, `archive_category(...)` | — | Gestione categorie con validazione |

Tutte `security definer` con `search_path = public`, e ognuna verifica `couple_id = public.get_couple_id()` come prima istruzione.

### 4.4 Algoritmo di pareggio (min cash flow)

Con N membri, azzerare i saldi con il minor numero di bonifici:

1. Separa i membri in creditori (`balance > 0`) e debitori (`balance < 0`).
2. Ordina entrambi per valore assoluto decrescente.
3. Abbina iterativamente il debitore maggiore al creditore maggiore, trasferendo `min(|debito|, credito)`.
4. Ripeti finché tutti i saldi sono sotto 1 centesimo.

Produce al massimo `N−1` trasferimenti. Per N=2 degenera nel comportamento attuale ("Anna deve a Marco 42,50 €").

### 4.5 Generazione delle spese ricorrenti

Doppio meccanismo, entrambi idempotenti grazie all'indice unico `(recurring_expense_id, period_key)`:

1. **Cron giornaliero** — `daily-cron` (già schedulata alle 09:00) chiama `post_due_recurring()` per ogni nucleo attivo.
2. **Catch-up all'apertura dell'app** — l'hook `useRecurringCatchUp()` chiama la stessa RPC per il nucleo corrente. Copre i nuclei creati dopo l'ultima esecuzione del cron e i casi di cron fallito.

Per `auto_post = false` la funzione non crea una spesa ma una riga in `recurring_expenses` con `pending_since`, che il client mostra come card "Da confermare" in cima alla lista spese.

---

## 5. Sicurezza (RLS)

Ogni nuova tabella segue il pattern già stabilito in `002_rls.sql`.

```sql
alter table public.expense_categories enable row level security;

-- Preset di sistema in sola lettura + categorie del proprio nucleo
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

Analogamente per `household_members`, `recurring_expenses`, `budget_periods`, `goal_contributions`, `settlements` (tutte `for all using (couple_id = public.get_couple_id())`), e `expense_shares` con controllo via `exists` sulla spesa collegata — stesso pattern di `recipe_ingredients`.

**Ruoli.** `member_role` è applicato a livello di RPC, non di RLS: un `VIEWER` può leggere ma le RPC di scrittura rifiutano con `raise exception` se il chiamante ha ruolo `VIEWER`. Motivazione in [`report.md` §4.7](./report.md#47-ruoli-applicati-nelle-rpc-non-nelle-rls).

**Realtime.** Aggiungere alla publication: `budgets`, `budget_periods`, `expense_categories`, `recurring_expenses`, `financial_goals`, `goal_contributions`, `settlements`, `household_members`. (`expenses` è già presente.)

---

## 6. Migrazione dei dati esistenti

Il rischio principale: `expenses.category` è testo libero e nel codice convivono **due vocabolari incompatibili**.

- `packages/shared/src/index.ts` esporta `EXPENSE_CATEGORIES` = `["Affitto", "Bollette", "Spesa", …]` — **non importata da nessun componente**.
- `ExpensesTab.tsx` e `BudgetTab.tsx` definiscono ciascuno il proprio array locale `CATEGORIES` = `["casa", "cibo", "trasporti", "intrattenimento", "salute", "altro"]`.

I dati reali contengono quindi valori del secondo vocabolario, e potenzialmente del primo.

**Procedura (migrazione `008`):**

1. Crea le categorie di sistema e clonale per ogni nucleo esistente.
2. Applica una tabella di mapping esplicita:

   | valore storico | slug di destinazione |
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

3. Qualsiasi valore non mappato genera una categoria del nucleo con `label` = valore originale, `slug` = versione slugificata, `kind = 'VARIABLE'`. **Nessun dato viene perso o riassegnato ad "Altro" arbitrariamente.**
4. Crea una riga `household_members` per ogni utente con `couple_id` non nullo, `display_name = coalesce(users.name, email)`, `monthly_income = users.salary`, ruolo `OWNER` al primo membro creato del nucleo.
5. Popola `expenses.paid_by_member_id` dal `paid_by_id`, `expenses.period_key` da `date`.
6. Crea un `budget_periods` per ogni combinazione distinta `(couple_id, month, year)` presente in `budgets` e collega le righe.
7. Verifica finale: `select count(*) from expenses where category_id is null` deve restituire 0. La migrazione fallisce in transazione se non è così.

Le colonne legacy `expenses.category` e `expenses.paid_by_id` restano popolate dai trigger fino alla Fase 6, così i componenti attuali continuano a funzionare durante tutta la transizione.

---

## 7. Interfaccia mobile

### 7.1 Struttura

Il tab Finanze passa da 3 a 4 sezioni. `app/(app)/finance/index.tsx` mantiene il segmented control esistente:

```
app/(app)/finance/
├── index.tsx              # Segmented control: Spese · Budget · Statistiche · Obiettivi
├── categories.tsx         # Gestione categorie (push da Budget)
├── recurring.tsx          # Gestione spese fisse (push da Budget)
├── members.tsx            # Membri del nucleo e regola di divisione
└── settle.tsx             # Pareggio dei conti (push da Spese)
```

```
components/finance/
├── ExpensesTab.tsx        # esistente — rifattorizzato su RPC
├── BudgetTab.tsx          # esistente — rifattorizzato su get_budget_overview
├── StatsTab.tsx           # nuovo
├── GoalsTab.tsx           # esistente — esteso con allocazione mensile
├── CategoryPicker.tsx     # nuovo — selettore condiviso, sostituisce i 3 array hardcoded
├── CategoryChip.tsx
├── ExpenseSheet.tsx       # bottom sheet crea/modifica spesa
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

### 7.2 Schermata Budget

```
┌─────────────────────────────────────┐
│  ‹ Agosto 2026 ›            ⚙️      │  navigazione tra mesi
├─────────────────────────────────────┤
│  Entrate previste      3.200,00 €   │
│  Pianificato           2.850,00 €   │
│  Speso                 1.940,50 €   │
│  ████████████░░░░░░░  68%           │
│  Disponibile             350,00 €   │
├─────────────────────────────────────┤
│  FISSE                  980,00 €    │
│  🏠 Affitto      800 / 800    100%  │
│  💡 Bollette     180 / 200     90%  │
│                                     │
│  VARIABILI            1.520,00 €    │
│  🛒 Spesa        480 / 500  ▓▓▓░ 96%│
│  🍕 Ristoranti   210 / 150  ▓▓▓▓ ⚠ │
│  🚗 Trasporti     95 / 120  ▓▓░░ 79%│
│                                     │
│  OBIETTIVI              350,00 €    │
│  🏝️ Bali          200 /mese  ✓      │
│  🚗 Auto nuova    150 /mese  ✓      │
└─────────────────────────────────────┘
```

Interazioni: tap su riga → modifica importo; long-press → rimuovi budget; `⚙️` → categorie, spese fisse, membri, regola di divisione; swipe orizzontale o frecce → cambio mese; azione "Copia dal mese precedente" quando il periodo è vuoto.

### 7.3 Schermata Statistiche

Selettore di intervallo (mese corrente · 3 mesi · 6 mesi · anno · personalizzato), poi:

1. **Donut per categoria** con legenda e percentuali, tap su spicchio → dettaglio categoria
2. **Top 5 categorie** con variazione rispetto al periodo precedente (`↑ +12%`)
3. **Trend mensile** — linea con tre serie: totale, fisse, variabili
4. **Confronto mese su mese** — barre affiancate
5. **Fisse vs variabili** — barra impilata con percentuale di spesa incomprimibile
6. **Aderenza al budget** — quanti mesi chiusi in budget su quelli osservati
7. **Chi ha pagato** — ripartizione per membro e saldo corrente

### 7.4 Aggiunta rapida di una spesa

Il percorso più frequente dell'app, ottimizzato per la velocità:

- FAB → bottom sheet con tastierino numerico aperto e focus sull'importo
- Categoria: chip in riga singola scorrevole, **ordinati per frequenza d'uso recente** del nucleo
- "Pagato da": default sull'utente corrente, avatar dei membri in riga
- Data: default oggi, con scorciatoie "Ieri" / selettore
- Nota: opzionale, ultimo campo
- **Un solo tap obbligatorio oltre all'importo** (la categoria); tutto il resto ha default sensati

### 7.5 Stati dell'interfaccia

| Stato | Trattamento |
|---|---|
| Loading | Skeleton loader, mai spinner su contenuto strutturato |
| Vuoto — nessuna spesa | Illustrazione + CTA "Aggiungi la prima spesa" |
| Vuoto — nessun budget | CTA doppia: "Crea budget" / "Copia dal mese scorso" |
| Budget oltre l'80% | Riga ambra |
| Budget sforato | Riga rossa, barra piena, badge di eccedenza |
| Ricorrente da confermare | Banner in cima alla lista spese con conferma inline |
| Obiettivo raggiunto | Card con coriandoli e CTA "Segna come completato" |
| Errore di rete | Toast + retry, dati in cache restano visibili |

### 7.6 Chiavi TanStack Query

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

`staleTime`: 5 minuti per liste e statistiche, 1 minuto per l'overview del budget. Invalidazione a cascata su mutazione di spesa: `overview`, `expenses`, `stats`, `balances`.

Ottimistic update su: aggiunta spesa, conferma ricorrente, modifica importo di budget.

---

## 8. Schemi condivisi

Nuovi file in `packages/shared/src/`, rispettando il pattern esistente (uno schema per file, named export, ri-esportati da `index.ts`):

```ts
export const CreateCategorySchema = z.object({
  label: z.string().min(1, "Il nome è obbligatorio").max(60),
  emoji: z.string().max(8).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  kind: z.enum(["FIXED", "VARIABLE"]).default("VARIABLE"),
});

export const CreateRecurringExpenseSchema = z.object({
  label: z.string().min(1).max(120),
  amount: z.number().positive("L'importo deve essere positivo"),
  category_id: z.string().uuid(),
  paid_by_member_id: z.string().uuid().optional(),
  frequency: z.enum(["WEEKLY","MONTHLY","BIMONTHLY","QUARTERLY","SEMIANNUAL","ANNUAL"]).default("MONTHLY"),
  day_of_month: z.number().int().min(-1).max(31).optional(),
  start_date: z.string(),
  end_date: z.string().optional(),
  auto_post: z.boolean().default(true),
  variable_amount: z.boolean().default(false),
});

export const CreateGoalSchema = z.object({           // esteso
  title: z.string().min(1, "Il titolo è obbligatorio").max(200),
  target_amount: z.number().positive("L'obiettivo deve essere positivo"),
  target_date: z.string().optional(),
  monthly_allocation: z.number().min(0).default(0),
  emoji: z.string().max(8).optional(),
});
```

`EXPENSE_CATEGORIES` viene **deprecato** e sostituito da `DEFAULT_EXPENSE_CATEGORIES` (i 12 preset con slug, label, emoji, kind), usato solo per il seeding e come fallback offline.

---

## 9. Notifiche

Il trigger `notify_partner()` in `005_notifications.sql` seleziona **un solo** destinatario (`limit 1`) — corretto per due partner, sbagliato per N membri. Va generalizzato a un `insert … select` su tutti i membri diversi dall'attore.

Nuovi eventi:

| Evento | Destinatari | Testo |
|---|---|---|
| Budget all'80% | Tutti i membri | "Budget Spesa: 80% consumato, restano 100 €" |
| Budget superato | Tutti i membri | "Budget Ristoranti superato di 60 €" |
| Ricorrente registrata | Tutti i membri | "Affitto — 800 € registrati automaticamente" |
| Ricorrente da confermare | Tutti i membri | "Bolletta luce: conferma l'importo di questo mese" |
| Obiettivo raggiunto | Tutti i membri | "🏝️ Vacanza a Bali: obiettivo raggiunto!" |
| Promemoria chiusura mese | Tutti i membri | "Il budget di agosto si chiude domani" |

Le soglie di budget sono valutate da trigger `after insert on expenses`, con guardia anti-ripetizione: la notifica di soglia viene emessa una sola volta per `(budget_period_id, category_id, soglia)`.

---

## 10. Requisiti non funzionali

| Requisito | Target |
|---|---|
| Apertura tab Finanze (dati in cache) | < 300 ms al primo frame |
| `get_budget_overview` | < 150 ms a 5.000 spese |
| Salvataggio spesa (ottimistico) | Feedback immediato, conferma < 1 s |
| Precisione monetaria | Errore zero: aritmetica `numeric` in SQL, centesimi interi negli split |
| Funzionamento offline | Lettura da cache persistita; scritture in coda con retry |
| Idempotenza ricorrenti | Garantita da indice unico, non da logica applicativa |
| Isolamento tra nuclei | RLS su ogni tabella, verificata da test dedicati |
| Accessibilità | Contrasto AA; l'informazione non è mai veicolata dal solo colore (sempre affiancata da testo o icona) |
| Localizzazione | Testi italiani in costanti; formattazione valuta via `Intl.NumberFormat('it-IT')` |

---

## 11. Test

I test sono richiesti **solo** dove un errore produce numeri sbagliati senza essere visibile:

1. **`split_expense_cents`** — la somma delle quote uguaglia sempre il totale, per ogni N da 1 a 10 e ogni modalità di split
2. **Rollover** — un residuo positivo e uno negativo si propagano correttamente al periodo successivo
3. **Idempotenza ricorrenti** — `post_due_recurring` eseguita tre volte produce una sola spesa
4. **Min cash flow** — i saldi risultanti sono tutti nulli e i trasferimenti sono al massimo N−1
5. **RLS** — un utente del nucleo A non legge né scrive nulla del nucleo B (una asserzione per tabella)
6. **Migrazione** — su un dump con entrambi i vocabolari di categoria, nessuna spesa resta orfana

Test SQL con `pgTAP` o script di verifica eseguiti sul database di staging.

---

## 12. Glossario

| Termine | Significato |
|---|---|
| **Nucleo** (household) | L'insieme delle persone che condividono il budget. Identificato da `couple_id`. |
| **Membro** | Partecipante alle spese. Può avere un account (`user_id`) o essere solo un'entità contabile. |
| **Periodo** | Un mese di budget, identificato da `period_key` (il giorno 1 del mese). |
| **Spesa fissa** | Spesa ricorrente prevedibile, definita in `recurring_expenses` e materializzata in `expenses`. |
| **Spesa variabile** | Spesa inserita manualmente. |
| **Rollover** | Riporto del residuo di budget di una categoria al periodo successivo. |
| **Quota** (share) | Parte di una spesa attribuita a un membro. |
| **Saldo** (balance) | Differenza tra quanto un membro ha pagato e quanto doveva. |
| **Pareggio** (settlement) | Trasferimento di denaro che riduce un saldo. |
| **Allocazione** | Quota mensile di budget destinata a un obiettivo di risparmio. |
