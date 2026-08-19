# Couple OS — Piano di Sviluppo

> **⚠️ Documento storico.** Descrive l'architettura originale (backend Fastify + web Next.js + Prisma + WebSocket + R2) che **non è più quella del progetto**: `apps/api` e `apps/web` sono state rimosse e l'app Expo parla direttamente con Supabase (Auth, Realtime, Storage, Edge Functions). Restano validi i principi di design mobile e l'analisi dei rischi. Per lo stato reale vedi `dashboard.md` e `roadmap.md`.

## Contesto

Couple OS è una piattaforma mobile-first per la gestione centralizzata della vita di coppia. Il progetto è strutturato come monorepo Turbo con tre app (web, mobile, API) e un pacchetto shared.

**Stato attuale:**
- API Fastify: completa (auth, board, calendar, todo, pantry, finance, check-in, memories)
- Web Next.js: completa (7 tab, real-time WebSocket, responsive)
- Mobile Expo: solo boilerplate (da costruire interamente)
- Shared Zod schemas: completi

**Focus primario: costruire l'app mobile nativa.**

---

## Stack

### Già in uso (da mantenere)
| Layer | Tecnologia |
|-------|-----------|
| Backend | Fastify 5, Node.js 20+, TypeScript |
| Database | PostgreSQL + Prisma 6 |
| Auth | Google OAuth 2.0, JWT (access 15m + refresh 30d) |
| Real-time | WebSocket (Fastify plugin) |
| Job queue | BullMQ + Redis |
| File storage | Cloudflare R2 (S3-compatible) |
| Push notifications | Expo Server SDK |
| Web frontend | Next.js 16, React 19, Tailwind CSS 4, Recharts |
| Shared types | Zod (runtime validation + TypeScript inference) |
| Monorepo | Turbo + npm workspaces |

### Mobile (da aggiungere/configurare)
| Layer | Tecnologia | Motivazione |
|-------|-----------|-------------|
| Framework | Expo 55 (già installato) | Già nel progetto, managed workflow |
| Navigazione | Expo Router v4 | File-based routing nativo, già integrato con Expo |
| Styling | NativeWind v4 (Tailwind per RN) | Coerenza con il web, utility-first |
| State / Cache | TanStack Query v5 | Cache, background refresh, offline support |
| Storage locale | expo-secure-store + AsyncStorage | Token sicuri + cache persistente |
| Animazioni | React Native Reanimated 3 | Gesture fluide, animazioni performanti |
| Gesture | React Native Gesture Handler | Required da Reanimated, swipe actions |
| Immagini | expo-image | Caching automatico, performance |
| Calendario | react-native-calendars | Componente calendario nativo, customizzabile |
| Grafici finance | Victory Native | Charts nativi (non SVG web-based) |
| Form | React Hook Form + Zod resolver | Coerenza con shared schemas |
| Icons | @expo/vector-icons | Già disponibile con Expo |
| Camera/Media | expo-image-picker | Per memories con foto |
| Notifiche | expo-notifications (già nel backend) | Push notifications native |
| Google Auth | expo-auth-session | OAuth nativo senza WebView |

---

## Architettura Mobile

```
apps/mobile/
├── app/                          # Expo Router (file-based)
│   ├── _layout.tsx               # Root layout (auth guard, providers)
│   ├── index.tsx                 # Landing/redirect
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx             # Google OAuth
│   │   └── onboarding.tsx        # Create/join couple
│   └── (app)/
│       ├── _layout.tsx           # Tab navigator + WebSocket provider
│       ├── board/
│       │   └── index.tsx         # Message board
│       ├── calendar/
│       │   └── index.tsx         # Calendar
│       ├── todo/
│       │   └── index.tsx         # Todo lists
│       ├── pantry/
│       │   └── index.tsx         # Pantry + shopping
│       ├── finance/
│       │   └── index.tsx         # Finance tracker
│       ├── checkin/
│       │   └── index.tsx         # Check-in
│       └── memories/
│           └── index.tsx         # Memory box
├── components/                   # Componenti riusabili
│   ├── ui/                       # Primitivi (Button, Input, Card, etc.)
│   ├── board/
│   ├── calendar/
│   ├── todo/
│   ├── pantry/
│   ├── finance/
│   ├── checkin/
│   └── memories/
├── hooks/                        # Custom hooks
│   ├── useAuth.ts
│   ├── useWebSocket.ts
│   └── useCouple.ts
├── lib/                          # Utilities
│   ├── api.ts                    # API client (fetch + token refresh)
│   ├── storage.ts                # SecureStore wrapper
│   └── queryClient.ts            # TanStack Query setup
└── constants/
    └── theme.ts                  # Colors, spacing, typography
```

### Condivisione codice col web
- **Zod schemas** (`packages/shared`): riusati direttamente per validazione form e tipi
- **API client**: rifattorizzato in `packages/shared/src/api-client.ts` per essere isomorfo (o duplicato con minima differenza)
- **Tipi**: tutti da `packages/shared/src/index.ts`
- **Business logic**: solo nel backend — mobile e web sono puri consumer

---

## Pattern chiave

### Auth flow mobile
```
1. App aperta → controlla SecureStore per refreshToken
2. Se presente → POST /auth/refresh → salva nuovo accessToken in memoria
3. Se assente → redirect a (auth)/login
4. Google OAuth: expo-auth-session → token Google → POST /auth/google → JWT pair
5. Ogni request: Authorization: Bearer <accessToken>
6. 401 → POST /auth/refresh → retry automatico
```

### Real-time sync
```
WebSocket URL: ws://<api>/ws?token=<accessToken>
- Connessione alla mount del tab navigator
- Disconnessione alla unmount / app in background
- Messaggi: { event: string, payload: any, coupleId: string }
- TanStack Query invalidation on ws message
```

### Offline support
```
TanStack Query staleTime: 5 minuti per lista, 1 minuto per single item
Persistenza: AsyncStorage adapter per query cache
Ottimistic updates su mutation (todo check, reaction toggle)
Background sync: refetch on app foreground (AppState API)
```

---

## Necessità infrastrutturali

1. **Variabili d'ambiente mobile**: `app.json` → `extra` per API URL (via `expo-constants`)
2. **Deep linking / Universal links**: per OAuth redirect e future notifiche push
3. **EAS Build**: configurare per build iOS/Android (richiede account Expo/Apple/Google)
4. **EAS Update**: OTA updates senza passare per store (opzionale ma utile)
5. **Certificati push**: APNs (iOS) e FCM (Android) configurati in Expo Dashboard

---

## Difficoltà e rischi

### Alta priorità

| Difficoltà | Impatto | Mitigazione |
|-----------|---------|-------------|
| **Google OAuth mobile** | Alto — flusso diverso dal web | Usare expo-auth-session con redirect URI nativo; testare su device fisico |
| **WebSocket in background** | Alto — iOS/Android killano la connessione | Reconnect automatico all'AppState `active`; non dipendere da WS per consistenza dati |
| **Upload foto (Memories)** | Medio — presigned S3 upload da mobile | expo-image-picker → fetch presigned URL → PUT diretto a R2 |
| **Calendar nativo vs web** | Medio — react-native-calendars ha API diverse | Astrarre la logica in hook, adattare solo la view |
| **Grafici Finance** | Medio — Recharts non funziona su RN | Victory Native o Skia-based; API simile ma non identica |

### Media priorità

| Difficoltà | Impatto | Mitigazione |
|-----------|---------|-------------|
| **Keyboard avoiding** | UX — form con tastiera su mobile | `KeyboardAvoidingView` + `ScrollView` in tutti i form |
| **SafeArea** | UX — notch iPhone/Android | `SafeAreaView` + `useSafeAreaInsets` da expo |
| **Animazioni tab** | UX — transizioni fluide | Expo Router gestisce le animazioni; Reanimated per custom |
| **Performance FlatList** | UX — liste lunghe (memories, posts) | `FlashList` di Shopify invece di FlatList per >100 items |
| **Internazionalizzazione** | Bassa per ora — specs richiedono IT/EN | Preparare le stringhe in costanti, aggiungere i18n in fase 3 |

### Bassa priorità (fase futura)

- **Haptic feedback**: `expo-haptics` su interazioni chiave
- **Biometric lock**: `expo-local-authentication` per PIN/FaceID
- **Widget iOS/Android**: richiede native module separato
- **Apple Sign In**: richiesto da App Store se offri Google OAuth

---

## Principi di design mobile

1. **Bottom tab navigation** con 7 tab (Board, Calendar, Todo, Pantry, Finance, Check-in, Memories)
2. **Safe area** rispettata su ogni schermata
3. **Pull-to-refresh** su ogni lista
4. **Skeleton loading** invece di spinner generici
5. **Ottimistic UI** su azioni frequenti (check todo, add reaction)
6. **Gesture native**: swipe-to-delete su list items, long press per menu contestuale
7. **Typography**: System font (San Francisco/Roboto) per performance e coerenza OS
8. **Dark mode**: supporto via NativeWind dark: prefix (fase 2)

---

## Non fare (scope out)

- Non duplicare la logica di business nel client: tutto resta nell'API
- Non costruire un design system completo prima di avere funzionalità: UI semplice ma funzionale
- Non implementare i18n completo nella fase 1: usare stringhe dirette, estrarre dopo
- Non aggiungere feature non presenti nel web senza valutare il backend
