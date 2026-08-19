# Istruzioni per Claude — Couple OS

Questo file contiene istruzioni operative per guidare Claude durante la programmazione del progetto. Leggilo all'inizio di ogni sessione.

---

## Contesto del progetto

Couple OS è un monorepo Turbo:
- `apps/mobile` — Expo / React Native: **unica app**, gira su iOS, Android e web (react-native-web, deploy Vercel)
- `packages/shared` — tipi e costanti condivise
- `supabase/migrations` — schema, RLS, trigger, Storage
- `supabase/functions` — Edge Function Deno (`send-notification`, `daily-cron`)

**Non esiste un backend applicativo.** Le app `apps/api` (Fastify) e `apps/web` (Next.js) sono state rimosse: il client parla direttamente con Supabase tramite `@supabase/supabase-js` e la sicurezza sta nelle **policy RLS**. Ogni volta che aggiungi una tabella o una colonna, aggiungi anche la migrazione e le relative policy.

Leggi `dashboard.md` per lo stato attuale e `roadmap.md` per cosa resta da fare.

---

## Regole generali

### Prima di scrivere codice
1. Leggi i file rilevanti — non fare assunzioni su cosa c'è già scritto
2. Controlla `packages/shared/src/` per tipi e schemi esistenti — non ridefinire tipi già presenti
3. Controlla lo schema e le policy in `supabase/migrations/` e i tipi in `apps/mobile/types/database.ts`
4. Segui lo stesso pattern già usato in file simili nella stessa app

### Stile codice
- TypeScript strict — niente `any` implicito
- Zod schemas da `packages/shared` per validare form e response API
- Niente default export misti con named export nello stesso file
- Componenti React Native: StyleSheet o NativeWind className, mai inline style objects ripetuti
- Hooks custom: prefix `use`, file separato in `hooks/`

### Gap noti tra specs e backend attuale

Queste discrepanze esistono tra le specs e il backend già costruito — tienile presenti:

| Feature | Specs richiedono | Stato attuale | Azione |
|---------|-----------------|---------------|--------|
| Calendar reminder | 15min/1h/1gg configurabili per evento | Nessun campo su `events` | Aggiungere colonna `reminder_minutes` con una migrazione |
| Memory location | Vista mappa con pin geografici | Nessun campo `location` su `memories` | Fase 5, non ora |
| Finance grafici | Trend, categorie, confronto mensile | Non implementati nell'app | Fase 4 |
| Push notifications | Notifiche su device | Infrastruttura pronta (`users.push_tokens`, Edge Function, registrazione token lato client) | Configurare `extra.eas.projectId` + certificati APNs/FCM |

## Non fare
- Non aggiungere feature non richieste ("potrebbe essere utile anche...")
- Non refactorare codice funzionante non collegato al task corrente
- Non aggiungere commenti ovvi o docstring a codice che si spiega da solo
- Non creare utility functions per operazioni usate una volta sola
- Non usare `console.log` nell'app
- Non installare librerie senza una ragione specifica — controlla prima se Expo SDK ha già la funzionalità

---

## Regole specifiche per il mobile (apps/mobile)

### Navigazione
- Usa **Expo Router** con file-based routing
- Route autenticate in `app/(app)/`, route pubbliche in `app/(auth)/`
- Il tab navigator sta in `app/(app)/_layout.tsx`
- Deep link: usa `router.push()` e `router.replace()`, mai `navigation.navigate()`

### Stato e dati
- **TanStack Query** per tutto ciò che viene dal server (fetch, cache, invalidazione)
- Query key convention: `['resource', id]` o `['resource', 'list', filters]`
- Mutation: sempre con `onMutate` per ottimistic update su azioni frequenti (checkbox todo, reactions)
- State locale (UI only): `useState` — non usare Context o store globali per stato UI
- Auth state: `hooks/useAuth.ts` con Context — unica eccezione al punto sopra

### Accesso ai dati
- Tutto passa dal client Supabase in `lib/supabase.ts` — mai `fetch` diretto verso il database
- Sessione e refresh token li gestisce `supabase.auth` (storage AsyncStorage, `autoRefreshToken`)
- Real-time: canale `postgres_changes` filtrato per `couple_id`, `queryClient.invalidateQueries` nel callback e `supabase.removeChannel` nel cleanup
- Le query si affidano alle policy RLS, ma filtra comunque per `couple_id` per non scaricare dati inutili

### UI e componenti
- Componenti primitivi (Button, Input, Card) in `components/ui/` — riusabili e senza business logic
- Componenti feature in `components/<feature>/` — contengono logic specifica
- Ogni schermata usa `SafeAreaView` o rispetta `useSafeAreaInsets()`
- Liste con >50 items: usa `FlashList` da `@shopify/flash-list`, non `FlatList`
- Pull-to-refresh: `RefreshControl` su ogni lista principale
- Loading state: skeleton loader (non spinner) per content che occupa spazio visivo
- Empty state: messaggio illustrativo con CTA, mai lista vuota senza spiegazione

### Styling con NativeWind
- Usa `className` con classi Tailwind (identiche al web)
- Dark mode: `dark:` prefix (ma non nella fase 1)
- Non mixare NativeWind e StyleSheet nello stesso componente
- Colori brand: definiti in `constants/theme.ts`, usati come CSS vars o token

### Form
- **React Hook Form** + **Zod resolver** su tutti i form
- Schema Zod: prendilo da `packages/shared` se esiste, altrimenti crea in `lib/schemas/`
- Keyboard avoiding: ogni form sta in `KeyboardAvoidingView` + `ScrollView`
- Errori: mostrati inline sotto il campo, non come alert

### Modali e bottom sheet
- Azioni di creazione/modifica: bottom sheet (non modale full-screen)
- Conferma di eliminazione: `Alert.alert()` nativo
- Info/dettagli complessi: schermata separata con `router.push()`

### Immagini
- Usa `expo-image` (non `Image` da React Native) per caching automatico
- Upload foto (memories): expo-image-picker → upload sul bucket privato `memories` di Supabase Storage → signed URL in lettura
- Placeholder: blur hash o colore di sfondo durante loading

### Notifiche
- Registrazione e rimozione del push token: `lib/push.ts`, usato da `hooks/usePushNotifications.ts`
- Notifiche in-app (tabella `notifications`): `hooks/useNotifications.ts` + campanella
- Deep link da push: `data.screen` contiene il nome di un tab, gestito in `hooks/usePushNotifications.ts`

---

## Regole specifiche per Supabase (`supabase/`)

Tocca lo schema solo se una feature lo richiede davvero. Se lo fai:
- Aggiungi una **nuova** migrazione numerata (`00N_nome.sql`), non modificare quelle già applicate
- Ogni nuova tabella deve avere `enable row level security` e policy per coppia, sul modello di `002_rls.sql`
- Dopo un cambio di schema rigenera i tipi in `apps/mobile/types/database.ts`
- Le Edge Function sono Deno: import via URL, nessun `node_modules`

---

## Web

Il web non è un'app separata: è l'export Expo di `apps/mobile` (`npm run build` → `expo export --platform web`).
Verifica che le modifiche non rompano il web: le API native (notifiche push, SecureStore) non esistono nel browser, vanno protette con `Platform.OS`.

---

## Regole specifiche per shared (packages/shared)

- Aggiungi qui tutti i tipi/schemi usati da più di una app
- Non aggiungere logica — solo tipi Zod e costanti
- Esporta tutto da `src/index.ts`
- Rispetta il pattern esistente: uno schema per file, named exports

---

## Workflow di sviluppo

### Quando ti viene assegnata una feature
1. Leggi `roadmap.md` per capire la fase e il contesto
2. Identifica i file da creare/modificare (elenca prima di toccarli)
3. Controlla se esiste già qualcosa di simile da cui partire
4. Scrivi la feature completa e testabile — non stub o placeholder
5. Aggiorna `roadmap.md`: marca i task completati con `[x]`

### Struttura di un commit
Usa conventional commits:
```
feat(mobile): add board tab with post list and reactions
fix(api): correct refresh token expiry calculation
chore(shared): add TodoItem update schema
```

### Testing
- Non scrivere test unitari a meno che non vengano richiesti esplicitamente
- Se scrivi test: usa Jest + React Native Testing Library per mobile
- API: usa il test framework già presente (se esiste)

---

## Convenzioni di naming

| Cosa | Convenzione | Esempio |
|------|------------|---------|
| Componenti | PascalCase | `PostCard.tsx` |
| Hook | camelCase con `use` | `useAuth.ts` |
| Utility | camelCase | `formatCurrency.ts` |
| Constants | UPPER_SNAKE_CASE | `EXPENSE_CATEGORIES` |
| Route files (Expo) | lowercase | `index.tsx`, `login.tsx` |
| Zod schemas | PascalCase con Schema suffix | `PostSchema` |
| Zod inferred types | PascalCase senza suffix | `type Post = z.infer<typeof PostSchema>` |
| Query keys | array di stringhe | `['posts', 'list']` |

---

## Errori comuni da evitare

- **Non usare `useEffect` per fetch** — usa TanStack Query `useQuery`
- **Non mutare state direttamente** — usa setter o produce di immer
- **Non hardcodare le chiavi Supabase** — usa `Constants.expoConfig?.extra`
- **Non usare `StyleSheet.create` con NativeWind** — scegli uno dei due
- **Non dimenticare `coupleId`** — quasi ogni entity è scoped alla coppia
- **Non fare fetch nel render** — mai side effect diretti nel body del componente
- **Non usare `Alert.alert` per errori di form** — errori inline nel form
- **Non dimenticare loading e error state** — ogni `useQuery` ha `.isLoading` e `.error`
