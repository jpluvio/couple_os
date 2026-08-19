# Budget OS — Roadmap di progettazione

> Fasi di sviluppo del modulo di budgeting domestico per Couple OS.
> Documenti collegati: [`specs.md`](./specs.md) (specifiche tecniche), [`report.md`](./report.md) (scelte motivate).

---

## Criteri di progettazione delle fasi

1. **Ogni fase è rilasciabile.** Al termine di ciascuna l'app funziona: nessuna fase lascia il modulo in uno stato rotto o a metà.
2. **Nessuna regressione durante la transizione.** I componenti esistenti (`ExpensesTab`, `BudgetTab`, `GoalsTab`) continuano a funzionare finché non vengono sostituiti. Le colonne legacy restano popolate fino alla Fase 6.
3. **Prima il database, poi il calcolo, poi l'interfaccia.** Ogni fase costruisce lo strato su cui poggia la successiva.
4. **Il valore arriva presto.** Le categorie personalizzabili (Fase 1) e le spese fisse (Fase 2) sono le due funzioni che cambiano di più l'uso quotidiano: sono le prime.
5. **La cosa più rischiosa si affronta subito.** La migrazione dei dati storici sulle categorie è il passaggio più delicato del progetto ed è nella prima fase, quando i dati sono pochi.

---

## Panoramica

| Fase | Tema | Migrazioni | Rilascio | Stato |
|---|---|---|---|---|
| 0 | Fondamenta: membri del nucleo e strato di calcolo | `007` | Interno | ✅ implementata |
| 1 | Categorie personalizzabili | `008` | ✅ Utente | ✅ implementata |
| 2 | Spese fisse ricorrenti | `009` | ✅ Utente | ✅ implementata |
| 3 | Budget mensile completo | `010` | ✅ Utente | ✅ implementata |
| 4 | Statistiche | `012` | ✅ Utente | ⬜ da fare |
| 5 | Obiettivi legati al budget | `013` | ✅ Utente | ⬜ da fare |
| 6 | Split a N membri e pareggio | `014` | ✅ Utente | 🚧 solo dati e calcolo (Fase 0) |
| 7 | Rifinitura, pulizia, integrazione | `015` | ✅ Utente | ⬜ da fare |

> La migrazione `011` è occupata dai messaggi in inglese, quindi la numerazione
> delle fasi successive scala di uno.

---

## Fase 0 — Fondamenta

**Obiettivo:** avere i membri del nucleo come entità di prima classe e il motore di calcolo monetario, senza cambiare nulla di visibile.

**Perché prima di tutto:** `expenses.paid_by_id` punta a `users`, il che rende impossibile registrare una spesa di un partecipante senza account e costringe il codice attuale a dedurre il partner con `expenses.find(e => e.paid_by_id !== user.id)` — che restituisce stringa vuota finché il partner non ha inserito almeno una spesa. Tutto il resto poggia su questo.

### 0.1 — Membri del nucleo
- [x] Migrazione `007`: enum `member_role`, valore `CUSTOM` su `split_mode`
- [x] Tabella `household_members` con indice unico parziale su `(couple_id, user_id)`
- [x] Trigger `sync_member_on_user_couple`: crea la riga membro quando un utente entra nel nucleo
- [x] Backfill dei membri per i nuclei esistenti (`display_name`, `monthly_income` da `users.salary`, ruolo `OWNER` al primo)
- [x] Colonna `expenses.paid_by_member_id` + backfill da `paid_by_id`
- [x] Trigger `sync_legacy_expense_fields` per mantenere popolate le colonne legacy
- [x] RLS su `household_members`, aggiunta alla publication realtime

### 0.2 — Motore di calcolo
- [x] `split_expense_cents()` con metodo dei resti maggiori
- [x] `member_weights(p_couple_id)`: pesi per modalità di split, con degrado a `EQUAL` se i redditi mancano
- [x] Tabella `expense_shares` + trigger di validazione della somma
- [x] Vista `v_expense_member_shares`
- [x] `validate_custom_shares()` per la somma delle quote personalizzate

### 0.3 — Verifica
- [x] Test: la somma delle quote uguaglia il totale per N da 1 a 10, in tutte e tre le modalità
- [x] Test RLS: isolamento di `household_members` tra nuclei
- [ ] Verifica di non regressione: `ExpensesTab` e `BudgetTab` funzionano identici a prima

**Deliverable:** nessun cambiamento visibile. Il database sa chi sono i membri e sa dividere una cifra senza perdere centesimi.

---

## Fase 1 — Categorie personalizzabili

**Obiettivo:** le categorie diventano dati, non costanti sparse nel codice.

**Il problema che risolve.** Oggi le categorie sono definite in tre punti con due vocabolari diversi: `EXPENSE_CATEGORIES` in `packages/shared/src/index.ts` (`"Affitto"`, `"Bollette"`, …) che nessun componente importa, e un array `CATEGORIES` duplicato identico in `ExpensesTab.tsx` e `BudgetTab.tsx` (`"casa"`, `"cibo"`, …). Aggiungere una categoria significa modificare tre file, e i dati storici possono contenere entrambi i vocabolari.

### 1.1 — Schema e migrazione dati
- [x] Migrazione `008`: enum `expense_kind`, tabella `expense_categories`
- [x] Seed dei 12 preset di sistema (`couple_id is null`)
- [x] Trigger `seed_household_on_couple`: clona i preset per ogni nuovo nucleo
- [x] Clonazione dei preset per i nuclei già esistenti
- [x] Colonna `expenses.category_id` e `budgets.category_id`
- [x] **Mapping dei valori storici** secondo la tabella in [`specs.md` §6](./specs.md#6-migrazione-dei-dati-esistenti)
- [x] Valori non mappati → categoria del nucleo con la label originale, mai riassegnati ad "Altro"
- [x] Assertion di fine migrazione: zero spese con `category_id` nullo, altrimenti rollback
- [x] Trigger `guard_category_delete`: blocca la cancellazione con dati collegati
- [x] RLS + realtime

### 1.2 — Schemi condivisi
- [x] `CreateCategorySchema` in `packages/shared`
- [x] `DEFAULT_EXPENSE_CATEGORIES` con slug, label, emoji, kind
- [x] Deprecare `EXPENSE_CATEGORIES` (commento + rimozione in Fase 7)

### 1.3 — Interfaccia
- [x] `hooks/useCategories.ts` con cache TanStack Query
- [x] `components/finance/CategoryPicker.tsx` — **unico** selettore, sostituisce i tre array
- [x] `components/finance/CategoryChip.tsx`
- [ ] Schermata `app/(app)/finance/categories.tsx`: lista, riordino, crea, modifica, archivia
- [x] Selettore emoji e colore
- [x] Toggle Fissa/Variabile sulla categoria
- [x] Rimuovere gli array `CATEGORIES` da `ExpensesTab.tsx` e `BudgetTab.tsx`

**Deliverable:** l'utente crea, rinomina, colora e archivia le proprie categorie. Nessun dato storico perso.

---

## Fase 2 — Spese fisse ricorrenti

**Obiettivo:** affitto, bollette e abbonamenti si dichiarano una volta e si registrano da soli.

### 2.1 — Schema
- [x] Migrazione `009`: enum `recurrence_freq`, `expense_source`
- [x] Tabella `recurring_expenses`
- [x] Colonne `expenses.source`, `recurring_expense_id`, `period_key`
- [x] **Indice unico `(recurring_expense_id, period_key)`** — la garanzia di idempotenza
- [x] Trigger `set_expense_period_key`
- [x] RLS + realtime

### 2.2 — Generazione
- [x] `resolve_due_date(period, day_of_month)` con gestione dei mesi corti e di `-1` (ultimo giorno)
- [x] `post_due_recurring(p_couple_id, p_up_to)` — idempotente
- [x] Estendere la Edge Function `daily-cron` esistente con la chiamata per ogni nucleo attivo
- [x] `hooks/useRecurringCatchUp.ts`: catch-up all'apertura dell'app
- [x] Gestione `auto_post = false`: crea proposta invece di spesa
- [x] Gestione `variable_amount`: propone l'importo dell'ultima occorrenza

### 2.3 — Interfaccia
- [x] Schermata `app/(app)/finance/recurring.tsx`
- [ ] `RecurringCard.tsx` con prossima scadenza e importo
- [x] Form crea/modifica con selettore di frequenza e giorno del mese
- [x] `PendingRecurringBanner.tsx` in cima alla lista spese, con conferma inline
- [x] Badge "auto" sulle spese generate, per distinguerle da quelle manuali
- [x] Azione "Salta questo mese" su una singola occorrenza

### 2.4 — Verifica
- [x] Test: `post_due_recurring` eseguita tre volte produce una sola spesa
- [x] Test: ricorrente al giorno 31 genera correttamente a febbraio
- [x] Test: una ricorrente terminata (`end_date` passata) non genera più

**Deliverable:** le spese incomprimibili del nucleo si registrano da sole. È la fase che riduce di più l'attrito quotidiano.

---

## Fase 3 — Budget mensile completo

**Obiettivo:** pianificare il mese, non solo consuntivarlo.

### 3.1 — Schema
- [x] Migrazione `010`: enum `budget_period_status`, tabella `budget_periods`
- [x] Colonne su `budgets`: `budget_period_id`, `period_key`, `rollover_enabled`, `carried_amount`
- [x] Sostituire il vincolo unico `(couple_id, category, month, year)` con `(budget_period_id, category_id)`
- [x] Migrazione delle righe di budget esistenti nei rispettivi periodi
- [x] RLS + realtime

### 3.2 — Calcolo
- [x] Vista `v_period_category_spend`
- [x] RPC `get_budget_overview(p_period)` — pianificato, riportato, speso, residuo, stato per categoria
- [x] RPC `create_next_period(p_period, p_copy_from)`
- [x] RPC `close_budget_period(p_period)`: calcola i rollover e apre il periodo successivo
- [x] Logica di rollover: residuo positivo e negativo, solo se `rollover_enabled`

### 3.3 — Interfaccia
- [x] Riscrivere `BudgetTab.tsx` su `get_budget_overview` (via singola RPC anziché due query + reduce lato client)
- [ ] Navigazione tra mesi (frecce + swipe)
- [x] Campo entrate previste del periodo
- [x] Sezioni separate Fisse / Variabili con subtotali
- [x] Riga di budget con barra, soglie a colori (verde / ambra oltre 80% / rosso oltre 100%)
- [x] Azione "Copia dal mese precedente" sui periodi vuoti
- [x] Toggle rollover per riga di budget
- [x] Riepilogo in cima: entrate, pianificato, speso, disponibile

### 3.4 — Notifiche
- [x] Trigger soglie budget 80% e 100%, con guardia anti-ripetizione
- [x] Generalizzare `notify_partner()` a tutti i membri del nucleo (oggi ne seleziona uno solo con `limit 1`)

**Deliverable:** il budget mensile è pianificabile, confrontabile e si porta dietro gli avanzi.

---

## Fase 4 — Statistiche

**Obiettivo:** rispondere a "dove finiscono i soldi" e "sta migliorando o peggiorando".

### 4.1 — Calcolo
- [ ] Migrazione `012`: viste e indici di supporto
- [ ] RPC `get_category_stats(p_from, p_to)` con variazione rispetto al periodo precedente
- [ ] RPC `get_monthly_trend(p_months)` con serie totale / fisse / variabili / budget
- [ ] Verifica performance su dataset di 5.000 spese

### 4.2 — Grafici
- [ ] Installare `victory-native` XL e `@shopify/react-native-skia`
- [ ] `charts/CategoryDonut.tsx`
- [ ] `charts/TrendLine.tsx`
- [ ] `charts/MonthCompareBars.tsx`
- [ ] `charts/BudgetGauge.tsx`
- [ ] Palette derivata dai colori delle categorie, con fallback per categorie senza colore
- [ ] Ogni grafico affianca al colore un'etichetta testuale (accessibilità)

### 4.3 — Interfaccia
- [ ] `StatsTab.tsx` come quarta sezione del tab Finanze
- [ ] Selettore intervallo: mese · 3 mesi · 6 mesi · anno · personalizzato
- [ ] Top 5 categorie con variazione percentuale
- [ ] Rapporto fisse / variabili
- [ ] Aderenza al budget sui periodi chiusi
- [ ] Ripartizione per membro
- [ ] Drill-down: tap su categoria → elenco spese filtrate

**Deliverable:** le statistiche per categoria richieste, con profondità storica.

---

## Fase 5 — Obiettivi legati al budget

**Obiettivo:** un obiettivo di risparmio assorbe una quota mensile del budget e cresce da solo.

### 5.1 — Schema
- [ ] Migrazione `013`: enum `goal_status`, `contribution_source`
- [ ] Colonne su `financial_goals`: `target_date`, `monthly_allocation`, `emoji`, `color`, `status`, `priority`
- [ ] Tabella `goal_contributions`
- [ ] **Indice unico parziale** `(goal_id, budget_period_id) where source = 'BUDGET_ALLOCATION'`
- [ ] Trigger `refresh_goal_saved_amount`: mantiene `saved_amount` allineato e promuove a `REACHED`
- [ ] Backfill: `saved_amount` esistente diventa una contribuzione iniziale `MANUAL`
- [ ] RLS + realtime

### 5.2 — Integrazione col budget
- [ ] `get_budget_overview` include le allocazioni degli obiettivi nel calcolo del disponibile
- [ ] `close_budget_period` crea le contribuzioni `BUDGET_ALLOCATION` degli obiettivi attivi
- [ ] Avviso quando la somma delle allocazioni eccede il disponibile
- [ ] Notifica di obiettivo raggiunto

### 5.3 — Interfaccia
- [ ] Estendere `GoalsTab.tsx`: allocazione mensile, data obiettivo, emoji
- [ ] `GoalAllocationSheet.tsx` con proiezione "a questo ritmo, raggiunto entro <mese>"
- [ ] Avviso quando la data obiettivo è irraggiungibile con l'allocazione corrente
- [ ] Sezione Obiettivi nella schermata Budget con le allocazioni del periodo
- [ ] Storico contribuzioni sulla card dell'obiettivo
- [ ] Versamento manuale extra
- [ ] Stati pausa / archivio

**Deliverable:** "Vacanza a Bali" è una voce del budget mensile che si alimenta da sola.

---

## Fase 6 — Split a N membri e pareggio

**Obiettivo:** far funzionare correttamente i nuclei con più di due persone.

**Perché in questa posizione:** le fasi precedenti funzionano già con N membri grazie alle fondamenta della Fase 0. Questa fase espone all'utente il controllo sulla divisione e chiude il ciclo con il pareggio dei conti — che ha senso solo dopo che spese, budget e statistiche sono a regime.

### 6.1 — Schema e calcolo
- [ ] Migrazione `014`: tabella `settlements`
- [ ] Vista `v_member_balances`
- [ ] RPC `get_member_balances(p_from, p_to)`
- [ ] RPC `suggest_settlements()` — algoritmo min cash flow, al massimo N−1 trasferimenti
- [ ] Applicazione del ruolo `VIEWER` in tutte le RPC di scrittura
- [ ] RLS + realtime

### 6.2 — Interfaccia
- [ ] Schermata `app/(app)/finance/members.tsx`: elenco membri, invito, ruoli
- [ ] Aggiunta di un partecipante senza account
- [ ] Selettore della regola di divisione: Equa / Proporzionale / Personalizzata
- [ ] Editor delle quote personalizzate con validazione della somma a 100%
- [ ] Override della divisione sulla singola spesa (selezione dei membri coinvolti)
- [ ] Sostituire il calcolo del saldo lato client in `ExpensesTab.tsx` con la RPC
- [ ] Schermata `app/(app)/finance/settle.tsx` con i trasferimenti suggeriti
- [ ] Registrazione di un rimborso
- [ ] `MemberAvatar.tsx` con colore per membro nei grafici

### 6.3 — Verifica
- [ ] Test: i saldi risultanti dopo i pareggi suggeriti sono tutti nulli
- [ ] Test: numero di trasferimenti ≤ N−1
- [ ] Test: un `VIEWER` non riesce a scrivere attraverso nessuna RPC

**Deliverable:** un nucleo di tre coinquilini gestisce le spese e pareggia i conti correttamente.

---

## Fase 7 — Rifinitura, pulizia, integrazione

**Obiettivo:** rimuovere il debito della transizione e integrare il modulo nel resto di Couple OS.

### 7.1 — Pulizia del debito
- [ ] Rimuovere `expenses.category` (text) e `expenses.paid_by_id`
- [ ] Rimuovere il trigger `sync_legacy_expense_fields`
- [ ] Rimuovere `budgets.category`, `budgets.month`, `budgets.year`
- [ ] Rimuovere `EXPENSE_CATEGORIES` da `packages/shared`
- [ ] Rigenerare `apps/mobile/types/database.ts`
- [ ] Verifica: nessun riferimento residuo alle colonne rimosse

### 7.2 — Integrazione con le altre feature
- [ ] Dalla lista della spesa (`shopping_items` completati) → creazione rapida di una spesa in categoria `groceries`
- [ ] Scadenza di una spesa fissa → evento nel calendario condiviso
- [ ] Riepilogo di fine mese come post automatico sulla board
- [ ] Deep link dalle notifiche finance alla schermata corretta

### 7.3 — Rifinitura
- [ ] Formattazione valuta centralizzata con `Intl.NumberFormat('it-IT')`
- [ ] Skeleton loader su tutte le schermate del modulo
- [ ] Haptic feedback su aggiunta spesa e conferma ricorrente
- [ ] Stati vuoti con illustrazione e CTA
- [ ] Passata di accessibilità: contrasto, dimensioni tap, informazione non veicolata dal solo colore
- [ ] Esportazione CSV delle spese di un periodo

### 7.4 — Aggiornamento della documentazione
- [ ] Correggere `plan.md` e `dashboard.md`, che descrivono un backend Fastify/Prisma inesistente
- [ ] Aggiornare `instructions.md`: la riga "Finance categorie → Array fisso `EXPENSE_CATEGORIES`" nella tabella dei gap non è più valida
- [ ] Aggiornare la tabella di tracciamento in `roadmap.md` (root)

**Deliverable:** modulo completo, senza debito di transizione, integrato con le altre feature.

---

## Tracciamento

| Area | Schema | Calcolo | Interfaccia |
|---|---|---|---|
| Membri del nucleo | ✅ | ✅ | 🚧 (nessuna schermata dedicata: Fase 6) |
| Categorie personalizzabili | ✅ | — | ✅ |
| Spese fisse | ✅ | ✅ | ✅ |
| Spese variabili | ✅ | ✅ | ✅ |
| Budget mensile | ✅ | ✅ | ✅ |
| Rollover | ✅ | ✅ | ✅ |
| Statistiche | — | ⬜ | ⬜ |
| Obiettivi | 🚧 | ⬜ | 🚧 |
| Allocazione obiettivi | ⬜ | ⬜ | ⬜ |
| Split a N membri | ✅ | ✅ | ⬜ |
| Pareggio conti | ⬜ | ⬜ | ⬜ |
| Notifiche finance | ✅ | ✅ | ✅ |

**Legenda:** ✅ completo · 🚧 parziale (esiste ma va evoluto) · ⬜ da fare · — non applicabile

---

## Stato dell'implementazione

Le Fasi 0–3 sono implementate (migrazioni `007`–`010`, più `011` per i messaggi
in inglese). Le verifiche della Fase 0.3 e della Fase 2.4 vivono in
`supabase/tests/budget_os_test.sql`: 22 controlli, tutti verdi su PostgreSQL 16.

**Scostamenti rispetto alle specifiche**, entrambi deliberati:

1. **Chiave di idempotenza delle ricorrenti.** Le specifiche indicano
   `unique (recurring_expense_id, period_key)`. L'indice implementato è
   `unique (recurring_expense_id, occurrence_date)`: con `period_key` una
   ricorrenza `WEEKLY` non potrebbe generare più di un'occorrenza nello stesso
   mese di budget. Per ogni altra frequenza le due chiavi coincidono.
2. **Lingua dell'interfaccia.** L'app è in inglese, non in italiano
   (specs.md §10 «Localizzazione»): valuta formattata con
   `Intl.NumberFormat('en-IE')` e date con `en-GB`, centralizzate in
   `apps/mobile/lib/format.ts`.

Restano aperte, dentro le Fasi 0–3: il riordino manuale delle categorie, la
prossima scadenza sulla card di una ricorrente (la RPC `next_recurring_due`
esiste ma l'interfaccia mostra solo l'occorrenza da confermare) e lo swipe tra i
mesi nella schermata Budget, che oggi si cambia con le frecce. `ExpensesTab` e
`BudgetTab` non sono stati preservati identici come previsto dalla verifica 0.3:
sono stati riscritti sulle nuove RPC nella stessa serie di modifiche.

Restano da fare le Fasi 4 (statistiche), 5 (obiettivi legati al budget),
6 (interfaccia dello split a N membri e pareggio — lo strato dati e di calcolo
è già pronto dalla Fase 0) e 7 (pulizia del debito di transizione).

---

## Dipendenze tra fasi

```
Fase 0 (membri + motore di calcolo)
   │
   ├──> Fase 1 (categorie) ──> Fase 2 (spese fisse) ──┐
   │                                                   │
   │                                                   v
   │                                            Fase 3 (budget)
   │                                                   │
   │                                    ┌──────────────┼──────────────┐
   │                                    v              v              │
   │                             Fase 4 (statistiche)  Fase 5 (obiettivi)
   │                                    │              │              │
   └──> Fase 6 (split N + pareggio) <───┴──────────────┘              │
                    │                                                 │
                    └────────────> Fase 7 (pulizia + integrazione) <──┘
```

Le Fasi 4 e 5 sono indipendenti tra loro e possono procedere in parallelo dopo la Fase 3. La Fase 6 dipende solo dalla Fase 0 sul piano tecnico, ma va rilasciata dopo la 3 per non esporre lo split prima che il budget sia a regime.

---

## Rischi

| Rischio | Impatto | Mitigazione |
|---|---|---|
| Perdita o riassegnazione errata di categorie storiche | Alto — dati falsati in modo silenzioso | Mapping esplicito, categorie generate per i valori sconosciuti, assertion di fine migrazione in transazione |
| Doppia generazione di spese ricorrenti | Alto — budget falsato | Indice unico `(recurring_expense_id, period_key)`: la garanzia è nel database, non nel codice |
| Errori di arrotondamento negli split | Medio — centesimi che non tornano, sfiducia nell'app | Aritmetica in centesimi interi, metodo dei resti maggiori, test su N da 1 a 10 |
| Rottura dei componenti esistenti durante la transizione | Medio | Colonne legacy mantenute da trigger fino alla Fase 7 |
| Realtime non abilitato sulle nuove tabelle | Basso — dati non sincronizzati tra membri | Voce esplicita in ogni fase; `budgets` e `financial_goals` sono già oggi fuori dalla publication |
| Peso di Skia sul bundle | Basso | Valutare in Fase 4; alternativa SVG documentata in [`report.md` §4.6](./report.md#46-libreria-grafici) |
| Divergenza tra documentazione e codice | Basso ma già presente | Fase 7.4 allinea `plan.md`, `dashboard.md` e `instructions.md` |
