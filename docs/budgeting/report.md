# Budget OS — Report delle scelte progettuali

> Perché il modulo è progettato così, cosa ho scartato e a quali condizioni le decisioni andrebbero riviste.
> Documenti collegati: [`specs.md`](./specs.md), [`roadmap.md`](./roadmap.md).

---

## 1. Il punto di partenza reale

Prima di progettare ho letto il codice. Due cose non corrispondono a ciò che la documentazione dichiara, ed entrambe cambiano il progetto.

### 1.1 Lo stack documentato non è lo stack implementato

`plan.md` e `dashboard.md` descrivono un monorepo con tre app — `apps/api` (Fastify + Prisma), `apps/web` (Next.js) e `apps/mobile` — e dichiarano API e web "già completi". `instructions.md` istruisce a controllare `apps/api/src/routes/` prima di scrivere codice.

Nel repository esistono soltanto `apps/mobile`, `packages/shared` e `supabase/`. Non c'è nessun `apps/api`, nessun `apps/web`, nessuno schema Prisma. L'implementazione reale è **Supabase acceduto direttamente dal client**: i componenti chiamano `supabase.from("expenses").select(...)` e l'autorizzazione è affidata alle RLS di `002_rls.sql`.

Non è un dettaglio: cambia dove vive la logica. Con un backend Fastify avrei messo il motore di calcolo in un servizio applicativo. Senza, le uniche due opzioni sono il client o il database — e per il denaro il client è la scelta sbagliata (§2.1).

**Ho progettato sullo stack reale.** La correzione dei tre documenti è un task esplicito in Fase 7.4: lasciarli divergenti significa che la prossima sessione di lavoro ripartirà dal presupposto sbagliato.

### 1.2 Il modulo finance esiste già, e ha tre difetti strutturali

Ci sono `expenses`, `budgets`, `financial_goals` e tre tab funzionanti. Non partivo da zero. Ma il codice esistente ha tre problemi che non sono rifiniture mancanti — sono difetti che si aggraverebbero costruendoci sopra.

**Le categorie sono definite tre volte, con due vocabolari incompatibili.** `packages/shared/src/index.ts` esporta `EXPENSE_CATEGORIES = ["Affitto", "Bollette", "Spesa", …]`, che **nessun componente importa**. `ExpensesTab.tsx` e `BudgetTab.tsx` dichiarano ciascuno un array locale `CATEGORIES = ["casa", "cibo", "trasporti", …]`, identico e duplicato. La colonna `expenses.category` è `text` libero, quindi in produzione possono coesistere valori di entrambi i vocabolari — più eventuali valori scritti a mano. Questo è anche il motivo per cui la migrazione delle categorie (§4.4) è la parte più delicata del progetto.

**Il partner viene dedotto dai dati anziché dall'anagrafica.** In `ExpensesTab.tsx`:

```ts
expenses.find((e) => e.paid_by_id !== user.id)?.paid_by_id ?? ""
```

L'identità dell'altra persona si ricava dalla prima spesa che non ha pagato l'utente corrente. Finché il partner non ha registrato almeno una spesa, questa espressione restituisce stringa vuota — e viene usata sia per calcolare il saldo sia, in `addExpense()`, come `paid_by_id` di una nuova spesa attribuita al partner. Il dato corretto è già disponibile in `useCouple()`, che espone `partner`, ma non viene passato al componente per quello scopo.

Con N membri questo approccio non è aggiustabile: non esiste "l'altro". Serve un'anagrafica esplicita dei partecipanti, che è la Fase 0.

**Il calcolo del denaro sta nel client, duplicato.** `ExpensesTab.tsx` ha `computeBalance()`, che scarica tutte le spese del mese e le riduce in JavaScript. `BudgetTab.tsx` scarica di nuovo le stesse spese e le riaggrega con un `reduce` diverso. Due implementazioni indipendenti della stessa idea, entrambe in aritmetica floating-point.

---

## 2. I due principi che guidano tutto il resto

### 2.1 Il denaro si calcola in Postgres

Ogni aggregazione, ripartizione e saldo è prodotta da viste o funzioni SQL. Il client riceve numeri già calcolati.

**Precisione.** `numeric(12,2)` in Postgres è aritmetica decimale esatta. `number` in JavaScript è IEEE-754 binario: `0.1 + 0.2 !== 0.3`. Su una singola spesa non si vede; su una somma di trecento spese, o su una divisione in tre parti, produce centesimi che non tornano. E un'app di budget che sbaglia i centesimi perde la fiducia dell'utente su tutto il resto — anche sui numeri che sono corretti.

**Coerenza.** Una sola implementazione della regola di split, invocabile da qualsiasi schermata. Oggi ce ne sono due che possono divergere.

**Volume.** `get_budget_overview` restituisce una riga per categoria. Il codice attuale scarica ogni spesa del mese per calcolarne sei totali — e lo fa due volte, una per tab.

**Il costo:** la logica finisce in SQL, che è meno familiare di TypeScript, più scomodo da testare e non ha type-checking condiviso col client. È un costo reale, che accetto perché su un dominio monetario la correttezza vale più della comodità. Le funzioni critiche hanno test dedicati ([`specs.md` §11](./specs.md#11-test)).

### 2.2 Le garanzie stanno nel database, non nel codice applicativo

Dove un'invariante può essere espressa come vincolo, la esprimo come vincolo.

- Non-duplicazione delle spese ricorrenti → indice unico `(recurring_expense_id, period_key)`, non un `if` prima dell'insert
- Una sola contribuzione automatica per obiettivo per periodo → indice unico parziale
- Una categoria con spese collegate non si cancella → `on delete restrict` + trigger
- La somma delle quote di una spesa personalizzata è esatta → trigger di validazione

La ragione è che ci sono tre scrittori indipendenti sugli stessi dati: il client mobile, il cron giornaliero e il catch-up all'apertura dell'app. Un controllo applicativo va replicato in tutti e tre e può fallire in condizioni di concorrenza. Un vincolo di database vale per tutti, sempre.

---

## 3. Le tre decisioni che hai preso, e come le ho tradotte

### 3.1 Nucleo di N membri

Hai scelto "N membri del nucleo (famiglia/coinquilini)" invece dei due partner.

La tensione con la seconda scelta ("estendere ed evolvere") è evidente: N membri sembra richiedere di sostituire `couple_id` con `household_id` ovunque — cioè migrare le altre otto feature di Couple OS per una funzione sola. La soluzione è in §4.1.

### 3.2 Estendere il modulo esistente

Hai scelto di evolvere `expenses`, `budgets` e `financial_goals` invece di riscrivere.

Concordo, e la ragione principale non è il risparmio di lavoro: è che i dati esistenti sono già in quelle tabelle e una riscrittura richiede comunque una migrazione — quindi paghi il costo della migrazione *e* quello della riscrittura. Estendere significa che ogni fase è rilasciabile, che i tre tab attuali continuano a funzionare durante tutta la transizione, e che se il progetto si ferma a metà l'app resta usabile.

Il costo: **debito di transizione**. Per diverse fasi convivono `expenses.category` (text) e `expenses.category_id` (FK), `paid_by_id` e `paid_by_member_id`. È duplicazione, ed è confusa da leggere. La gestisco con trigger che mantengono allineate le colonne legacy, e con una fase esplicita di rimozione (7.1). **Il debito è accettabile solo perché ha una data di scadenza scritta nella roadmap** — senza, resterebbe lì per anni.

### 3.3 Essenziale, più obiettivi legati al budget

Hai chiesto il perimetro essenziale, più la possibilità di creare obiettivi come "Vacanza a Bali" a cui destinare una parte del budget.

L'ho trattato come un requisito di modellazione, non come una funzione a sé: **un obiettivo è una voce di budget come una categoria di spesa**. Dettagli in §4.5.

---

## 4. Le scelte tecniche

### 4.1 N membri senza riscrivere la tenancy

**Scelta:** `couple_id` resta la chiave di tenancy; i partecipanti alle spese vivono in una tabella `household_members` separata da `users`.

Ho considerato tre strade.

*Rinominare `couples` in `households` e propagare ovunque.* Semanticamente pulito. Ma tocca ogni tabella, ogni policy RLS, ogni indice e ogni componente delle otto feature di Couple OS, incluse board, memories e check-in — che sono intrinsecamente pensate per due persone (un check-in ha `user1_id`, `user2_id`, `mood1`, `mood2`). Rischio enorme, beneficio confinato al modulo finance.

*Aggiungere un `household_id` parallelo solo alle tabelle finance.* Due chiavi di tenancy nello stesso database, due helper RLS, due possibili fonti di verità su chi appartiene a cosa. Confusione permanente.

*Mantenere `couple_id` e aggiungere un'anagrafica dei partecipanti.* È quella che ho scelto.

La chiave è che `users.couple_id` **già oggi ammette N utenti sullo stesso nucleo** — è una FK semplice, non un vincolo di cardinalità. Il limite a due persone è un'assunzione del codice applicativo, non dello schema. Non serve cambiare la tenancy: serve smettere di assumere che i membri siano due.

La scelta ha portato un beneficio che non stavo cercando. Separando `household_members` da `users`, un partecipante può non avere un account: `user_id` è nullable. Questo permette di gestire un coinquilino che non usa l'app, un figlio, un genitore che contribuisce alle spese — casi realistici in un nucleo domestico, dove non tutti installeranno un'app di coppia. **Separa chi accede da chi partecipa alle spese**, che sono davvero due cose diverse. Risolve anche il difetto §1.2: `paid_by_member_id` è sempre risolvibile dall'anagrafica, senza dedurlo dai dati.

Il costo è di leggibilità: nel database la tenancy si chiama `couple_id` ma nel dominio si chiama nucleo. Un nome che non corrisponde al concetto è un debito cognitivo permanente. L'ho accettato perché l'alternativa è un rename globale, e l'ho mitigato con un glossario esplicito ([`specs.md` §12](./specs.md#12-glossario)).

**Quando riconsiderare:** se Couple OS decidesse di supportare nuclei non-coppia come caso di primo livello — famiglie, gruppi di coinquilini come prodotto — allora il rename globale diventerebbe giustificato, e andrebbe fatto in un'operazione dedicata, non dentro il modulo finance.

### 4.2 Categorie come dati, con preset di sistema clonati

**Scelta:** tabella `expense_categories`, preset di sistema con `couple_id is null`, clonati per ogni nucleo alla creazione.

L'alternativa era mantenere i preset come sola lettura condivisa e permettere solo aggiunte. Più semplice, ma impedisce di rinominare "Svago" in "Divertimento" o di cambiarne l'emoji — e la richiesta era categorie *personalizzabili*. Clonare costa 12 righe per nucleo, cifra irrilevante, e rende ogni categoria modificabile senza casi speciali nel codice: non esiste una categoria "di sistema" che il client debba trattare diversamente.

**`kind` (FIXED/VARIABLE) è un attributo della categoria, non della singola spesa.** Ho valutato di metterlo sulla spesa, che sarebbe più flessibile. Ma nella pratica una categoria è fissa o variabile per natura — l'affitto non diventa una spesa variabile — e metterlo sulla spesa significa chiedere all'utente una decisione in più a ogni inserimento, sul percorso che voglio più veloce di tutti. La distinzione serve alla statistica "quanto del nostro budget è incomprimibile", e a quel livello l'aggregazione per categoria è sufficiente.

**Le categorie si archiviano, non si cancellano.** Cancellare una categoria con spese collegate significa perdere la classificazione dello storico o riassegnarlo arbitrariamente ad "Altro" — che falsa le statistiche in modo silenzioso, il tipo di errore peggiore. `archived = true` la toglie dai selettori e la lascia nello storico.

**Niente sottocategorie in v1.** Sono la richiesta più frequente in ogni app di budget, e le ho escluse comunque: raddoppiano la complessità di ogni query di aggregazione (rollup dei figli sul padre), di ogni grafico e dell'interfaccia di gestione. Con dodici categorie ben scelte la maggior parte dei nuclei non ne ha bisogno. Lo schema non le impedisce: aggiungere `parent_id` in seguito è una migrazione additiva.

### 4.3 Spese fisse: cron più catch-up, entrambi idempotenti

**Scelta:** doppio meccanismo di generazione, con l'idempotenza garantita da un indice unico.

Il solo cron giornaliero fallisce nei casi limite: un nucleo creato dopo l'esecuzione, un'esecuzione fallita, un'app aperta dopo mesi di inattività. Il solo catch-up all'apertura fallisce se nessuno apre l'app — e le notifiche di spesa registrata non partirebbero mai.

Entrambi chiamano la stessa funzione `post_due_recurring()`, e possono girare in qualsiasi ordine e quante volte vogliono: l'indice unico `(recurring_expense_id, period_key)` rende la doppia generazione impossibile a livello di database. Questa è l'applicazione più importante del principio §2.2: se l'idempotenza dipendesse da un controllo applicativo, due scrittori concorrenti (cron e client all'apertura, alle 09:00 di lunedì) potrebbero superarlo entrambi.

**`variable_amount` è una funzione, non un caso limite.** La bolletta della luce ha una data prevedibile e un importo che non lo è. Un sistema che genera automaticamente un importo sbagliato è peggio di uno che non genera nulla: introduce dati falsi che l'utente deve accorgersi di correggere. Con `variable_amount = true` il sistema propone l'importo dell'ultima occorrenza e aspetta conferma — la data la sa lui, la cifra la sai tu.

### 4.4 Migrazione delle categorie: mappare, non normalizzare

Il passaggio più rischioso del progetto. `expenses.category` è testo libero e può contenere valori di due vocabolari diversi (§1.2).

**Scelta:** mapping esplicito per i valori noti; per ogni valore sconosciuto, creazione di una categoria del nucleo con la label originale.

La scorciatoia sarebbe mandare tutto ciò che non si riconosce in "Altro". È inaccettabile: falsa lo storico in modo silenzioso e irreversibile, e l'utente scopre mesi dopo che le sue statistiche non tornano — senza poter ricostruire il dato. Meglio ritrovarsi con qualche categoria in più da riordinare a mano che con dati sbagliati e nessun modo di accorgersene.

La migrazione termina con un'assertion in transazione: se anche una sola spesa resta senza `category_id`, l'intera migrazione fallisce e non viene applicata. **Una migrazione parziale su dati monetari è peggio di una migrazione fallita.**

### 4.5 Un obiettivo è una voce di budget

La tua richiesta: creare "Vacanza a Bali" e destinarci una parte del budget.

**Scelta:** `monthly_allocation` sull'obiettivo entra nell'equazione del budget accanto alle categorie di spesa.

```
Disponibile = entrate previste − budget fissi − budget variabili − allocazioni obiettivi
```

La modellazione alternativa era una categoria speciale "Risparmio" con un budget, collegata all'obiettivo. Funziona, ma confonde due concetti: una categoria di spesa registra denaro uscito, un obiettivo accumula denaro messo da parte. Se "Bali" fosse una categoria, comparirebbe nel donut delle spese accanto a "Ristoranti", e la domanda "quanto abbiamo speso questo mese" avrebbe una risposta ambigua.

Tenendoli separati ma sommandoli nel calcolo del disponibile, si ottiene la proprietà che serve davvero: **il risparmio compete con le spese per lo stesso denaro**. Se destini 200 € al mese a Bali, sono 200 € che non puoi spendere altrove, e il budget te lo dice prima che tu li spenda — non a fine mese.

**`goal_contributions` invece del solo `saved_amount`.** La colonna `saved_amount` esiste già ed è usata da `GoalsTab.tsx`. Aggiungendo una tabella di contribuzioni si ottiene lo storico ("da dove vengono questi 1.400 €"), la distinzione tra versamenti manuali e allocazioni automatiche, e l'attribuzione al membro che ha versato. `saved_amount` resta come valore denormalizzato mantenuto da trigger: il componente esistente continua a funzionare senza modifiche, ma smette di essere la fonte di verità.

L'indice unico parziale su `(goal_id, budget_period_id) where source = 'BUDGET_ALLOCATION'` impedisce che una doppia chiusura di periodo raddoppi i risparmi. Stesso principio delle ricorrenti.

### 4.6 Libreria grafici

**Scelta:** `victory-native` XL con `@shopify/react-native-skia`.

`plan.md` indica già Victory Native, ma nessuna delle due librerie è installata. Victory Native XL richiede Skia, che pesa sul bundle (alcuni MB) ma è ben supportato su Expo 55 e RN 0.83, ed è la stessa base che userebbero le alternative serie.

Le alternative valutate: `react-native-gifted-charts` (più leggera, niente Skia, ma meno controllo sullo stile e API meno stabile) e SVG a mano con `react-native-svg` (controllo totale, nessuna dipendenza nuova, ma donut e linee con assi e tooltip sono più lavoro di quanto sembri).

**Decisione da verificare in Fase 4**, misurando l'impatto reale sul bundle. Se Skia risultasse sproporzionato per quattro grafici, i tipi di grafico scelti (donut, linea, barre, gauge) sono tutti realizzabili con `react-native-svg` — è un cambio confinato a `components/finance/charts/`, che ho isolato apposta in una directory dedicata.

### 4.7 Ruoli applicati nelle RPC, non nelle RLS

**Scelta:** `member_role` (OWNER/MEMBER/VIEWER) è verificato dentro le funzioni RPC, non da policy RLS.

Esprimere i ruoli in RLS significherebbe una policy per operazione per tabella con una subquery su `household_members` in ogni `using` e ogni `with check` — moltiplicando le policy e aggiungendo un join a ogni riga letta. Le RLS diventano il punto in cui si sbagliano i permessi in modo difficile da diagnosticare.

Poiché **tutte le scritture del modulo passano da RPC** (conseguenza del principio §2.1), il controllo di ruolo in cima a ogni funzione è sufficiente e sta in un posto solo. Le RLS continuano a fare l'unica cosa che devono fare in modo assoluto: **isolare i nuclei tra loro**. Quella è la garanzia di sicurezza vera; i ruoli sono una regola di prodotto.

**Condizione di validità:** regge finché nessuna scrittura bypassa le RPC andando diretta in `supabase.from(...).insert()`. Va verificato in code review, ed è la ragione per cui la Fase 6.3 include un test esplicito che un `VIEWER` non riesca a scrivere attraverso nessun percorso.

### 4.8 Rollover disattivato di default

**Scelta:** `rollover_enabled = false` come default, attivabile per singola categoria.

Il rollover è utile su categorie con spesa irregolare — se questo mese non hai fatto manutenzione, i 100 € non spesi ha senso che restino disponibili il mese prossimo. È fuorviante su categorie regolari: se ogni mese avanzano 30 € sui trasporti, dopo un anno il budget mostra 360 € di margine che non riflettono nessuna intenzione reale, e la barra di progresso smette di significare qualcosa.

Default disattivato, attivabile dove serve, con il residuo (positivo o negativo) in una colonna distinta `carried_amount` — così l'utente vede sempre "budget 500 € + 80 € riportati" invece di un misterioso 580 €.

### 4.9 Aritmetica in centesimi interi per gli split

Una divisione in tre parti di 100 € non ha soluzione esatta in decimali a due cifre. Arrotondando ogni quota indipendentemente si ottiene 33,33 × 3 = 99,99 €: manca un centesimo, e su un mese di spese condivise i centesimi mancanti diventano decine.

`split_expense_cents()` converte in centesimi interi, calcola le parti intere e distribuisce i resti uno per uno ai membri con la frazione più alta (metodo dei resti maggiori), con ordinamento stabile a parità. **La somma delle quote è esattamente l'importo, per costruzione** — non per approssimazione accettabile. Con `n = 2` degenera nel comportamento corrente, quindi non introduce regressioni.

### 4.10 Pareggio con min cash flow

Con tre membri, i saldi possono richiedere che A paghi B che paga C. L'algoritmo greedy (abbina iterativamente il debitore maggiore al creditore maggiore) produce al massimo N−1 trasferimenti.

Non è l'ottimo teorico — trovare il numero minimo assoluto di transazioni è NP-hard — ma su nuclei di 2-6 persone la differenza è nulla o di un trasferimento, e l'algoritmo è deterministico, spiegabile e istantaneo. Per N=2 restituisce esattamente il messaggio attuale ("Anna deve a Marco 42,50 €").

I `settlements` sono registrati come righe, non come azzeramento dei saldi. Serve lo storico: "abbiamo pareggiato il 3 agosto" è un'informazione che l'utente vuole poter rivedere, e senza traccia il saldo tornerebbe a crescere senza spiegazione.

---

## 5. Cosa abbiamo escluso, e perché

Coerente con il perimetro "essenziale" che hai scelto. Ogni esclusione è una decisione, non una dimenticanza.

| Escluso | Ragione | Costo di aggiungerlo dopo |
|---|---|---|
| **Import CSV / open banking** | È un progetto a sé: parsing di formati bancari eterogenei, deduplica, matching automatico sulle categorie. Vale solo dopo che l'inserimento manuale è a regime e sai quali categorie usi davvero. | Basso — additivo, nessun cambio di schema |
| **Previsioni di fine mese** | Senza mesi di storico produce numeri arbitrari. Con le statistiche della Fase 4 in mano si può progettare qualcosa di fondato. | Basso — legge dati esistenti |
| **Debiti e rate** | Modello diverso: capitale, interessi, piano di ammortamento. Una rata può essere modellata come spesa ricorrente con `end_date`, che copre il caso pratico. | Medio — tabelle nuove |
| **Foto degli scontrini** | Richiede storage (già presente per le memories) e una UX di cattura. Utile ma non cambia la capacità di fare budget. | Basso — colonna + upload |
| **Multivaluta** | Cambia ogni calcolo: ogni importo avrebbe bisogno di valuta e tasso alla data. Costo alto per un nucleo domestico che spende in una valuta. | **Alto** — tocca tutto lo schema |
| **Sottocategorie** | §4.2 | Medio — rollup in ogni query |
| **Investimenti e patrimonio** | Dominio diverso: valutazioni variabili nel tempo, rendimenti, non "quanto abbiamo speso". | Alto — modulo separato |

Il multivaluta è l'unico la cui aggiunta successiva sarebbe davvero costosa. Vale la pena decidere consapevolmente ora: **se il nucleo vive tra due paesi o una parte delle spese è in valuta estera, va affrontato prima della Fase 3**, non dopo. In ogni altro caso, escluderlo è la scelta giusta.

---

## 6. Come è ordinata la roadmap

Quattro criteri, in ordine di priorità quando confliggono.

**Il rischio maggiore per primo.** La migrazione delle categorie è il passaggio dove si possono perdere dati. È in Fase 1, quando i dati storici sono ancora pochi. Ogni mese di rinvio la rende più rischiosa.

**Le fondamenta prima di ciò che ci poggia.** La Fase 0 non produce niente di visibile — è la fase che un piano orientato alla demo taglierebbe. Ma senza anagrafica dei membri e senza motore di split, ogni fase successiva reimplementerebbe pezzi di entrambi, e la Fase 6 diventerebbe una riscrittura invece di un'aggiunta.

**Il valore quotidiano presto.** Categorie (Fase 1) e spese fisse (Fase 2) sono ciò che cambia di più l'uso reale. Le spese fisse in particolare tolgono l'attrito maggiore: registrare ogni mese affitto e bollette a mano è la ragione principale per cui si smette di usare un'app di budget.

**Ogni fase rilasciabile.** Nessuna fase lascia il modulo rotto. Se il progetto si ferma dopo la Fase 3, quello che c'è funziona ed è utile.

**Perché lo split a N membri è in Fase 6 e non prima**, visto che è la funzione che hai richiesto esplicitamente: le fondamenta (Fase 0) lo rendono già corretto sotto il cofano fin dall'inizio — spese, budget e statistiche funzionano con N membri da subito. La Fase 6 espone all'utente il *controllo* sulla divisione e aggiunge il pareggio dei conti, che ha senso solo quando c'è già uno storico di spese da pareggiare. Anticiparla significherebbe costruire l'interfaccia di una funzione che non ha ancora dati su cui operare.

---

## 7. Su questi documenti

**Perché in `docs/budgeting/` e non nella root.** La root contiene già un `roadmap.md` — la roadmap dell'app mobile di Couple OS, con lo stato di tutte e otto le feature. Scriverci sopra la roadmap del solo modulo budget avrebbe cancellato quel documento. I tre file stanno in una sottocartella dedicata; la roadmap principale andrà aggiornata (Fase 7.4) con una riga che rimanda a questa.

**Cosa serve verificare prima di iniziare la Fase 1.** Due cose che dal codice non si vedono:

1. **Quali valori esistono davvero in `expenses.category` in produzione.** La tabella di mapping in [`specs.md` §6](./specs.md#6-migrazione-dei-dati-esistenti) copre i due vocabolari presenti nel codice, ma solo un `select distinct category from expenses` sul database reale dice se ce ne sono altri. Da fare prima di scrivere la migrazione `008`.
2. **Se `budgets` e `financial_goals` siano state aggiunte alla publication realtime.** In `002_rls.sql` non ci sono, ma il file stesso avverte che la publication va configurata anche da dashboard. Se non lo sono, oggi due membri non vedono in tempo reale le reciproche modifiche a budget e obiettivi.
