# Istruzioni per Claude — Couple OS

Questo file contiene istruzioni operative per guidare Claude durante la programmazione del progetto. Leggilo all'inizio di ogni sessione.

---

## Contesto del progetto

Le specifiche funzionali complete si trovano in `/planning/specs.md` (nella repo principale, non nel worktree). Leggile per capire il perché di ogni feature.

Couple OS è un monorepo Turbo con tre app:
- `apps/api` — Fastify backend, **già completo**
- `apps/web` — Next.js web app, **già completa**
- `apps/mobile` — Expo/React Native, **da costruire**
- `packages/shared` — Zod schemas e tipi condivisi

**Il backend non va toccato** salvo bug espliciti o feature richieste dal mobile che non esistono nell'API.

Leggi `plan.md` per architettura e stack decisioni. Leggi `roadmap.md` per sapere cosa è già fatto e cosa resta.

---

## Regole generali

### Prima di scrivere codice
1. Leggi i file rilevanti — non fare assunzioni su cosa c'è già scritto
2. Controlla `packages/shared/src/` per tipi e schemi esistenti — non ridefinire tipi già presenti
3. Controlla l'API route corrispondente in `apps/api/src/routes/` per capire la struttura delle response
4. Segui lo stesso pattern già usato in file simili nella stessa app

### Stile codice
- TypeScript strict — niente `any` implicito
- Zod schemas da `packages/shared` per validare form e response API
- Niente default export misti con named export nello stesso file
- Componenti React Native: StyleSheet o NativeWind className, mai inline style objects ripetuti
- Hooks custom: prefix `use`, file separato in `hooks/`

### Gap noti tra specs e backend attuale

Queste discrepanze esistono tra le specs e il backend già costruito — tienile presenti:

| Feature | Specs richiedono | Backend attuale | Azione |
|---------|-----------------|-----------------|--------|
| Finance categorie | Customizzabili | Array fisso `EXPENSE_CATEGORIES` | Gestire custom lato client o aggiungere endpoint |
| Calendar reminder | 15min/1h/1gg configurabili per evento | Campo non presente in `Event` schema | Aggiungere campo `reminderMinutes` al model |
| Memory location | Vista mappa con pin geografici | Nessun campo `location` su `Memory` | Aggiungere in fase 5, non ora |
| Calendar colori partner | Blending colori dei due partner | Non implementato nel frontend | Solo UI, nessun cambio backend |

## Non fare
- Non aggiungere feature non richieste ("potrebbe essere utile anche...")
- Non refactorare codice funzionante non collegato al task corrente
- Non aggiungere commenti ovvi o docstring a codice che si spiega da solo
- Non creare utility functions per operazioni usate una volta sola
- Non usare `console.log` — usa il logger di Fastify nell'API (`req.log`), niente log nel mobile
- Non installare librerie senza una ragione specifica — controlla prima se Expo SDK ha già la funzionalità

---

## Regole specifiche per il mobile (apps/mobile)

### Navigazione
- Usa **Expo Router v4** con file-based routing
- Route autenticate in `app/(app)/`, route pubbliche in `app/(auth)/`
- Il tab navigator sta in `app/(app)/_layout.tsx`
- Deep link: usa `router.push()` e `router.replace()`, mai `navigation.navigate()`

### Stato e dati
- **TanStack Query** per tutto ciò che viene dal server (fetch, cache, invalidazione)
- Query key convention: `['resource', id]` o `['resource', 'list', filters]`
- Mutation: sempre con `onMutate` per ottimistic update su azioni frequenti (checkbox todo, reactions)
- State locale (UI only): `useState` — non usare Context o store globali per stato UI
- Auth state: `hooks/useAuth.ts` con Context — unica eccezione al punto sopra

### API client
- Tutto passa per `lib/api.ts` — mai `fetch` diretto nei componenti
- Il client gestisce auto-refresh del token (401 → POST /auth/refresh → retry)
- Token di accesso: in memoria (variabile del modulo) — non in AsyncStorage
- Refresh token: in SecureStore via `lib/storage.ts`

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
- Upload foto (memories): expo-image-picker → presigned URL → PUT diretto a R2
- Placeholder: blur hash o colore di sfondo durante loading

### Notifiche
- Registra push token all'avvio in `useAuth.ts` dopo login
- Handling notifiche ricevute in foreground: banner in-app custom
- Deep link da notifica: gestito in `app/_layout.tsx` con `useNotificationResponse`

---

## Regole specifiche per il backend (apps/api)

Tocca il backend solo se:
- C'è un bug esplicito segnalato
- La feature mobile richiede un endpoint che non esiste
- Viene richiesta una modifica esplicita

Se aggiungi un endpoint:
- Segui il pattern degli altri route file (schema Zod request/response, `preHandler: [authenticate]`)
- Aggiungi lo schema corrispondente in `packages/shared/src/schemas/`
- Usa `fastify.prisma` — mai istanziare PrismaClient direttamente
- Usa `broadcastToCouple()` se la mutazione deve sincronizzarsi in real-time

---

## Regole specifiche per il web (apps/web)

Tocca il web solo se:
- C'è un bug esplicito
- Viene richiesta una modifica esplicita
- Serve allineamento con nuovi endpoint API

Non cambiare il web per "miglioramenti" o refactoring non richiesti.

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
- **Non hardcodare l'URL dell'API** — usa `Constants.expoConfig?.extra?.apiUrl`
- **Non usare `StyleSheet.create` con NativeWind** — scegli uno dei due
- **Non dimenticare `coupleId`** — quasi ogni entity è scoped alla coppia
- **Non fare fetch nel render** — mai side effect diretti nel body del componente
- **Non usare `Alert.alert` per errori di form** — errori inline nel form
- **Non dimenticare loading e error state** — ogni `useQuery` ha `.isLoading` e `.error`
