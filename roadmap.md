# Couple OS — Roadmap

> Stack attuale: **Supabase** (Postgres + Auth + Realtime + Storage + Edge Functions) + **Expo 55** (`apps/mobile`, che gira su iOS, Android e web).
> Le app `apps/api` (Fastify) e `apps/web` (Next.js) previste dalla versione originale di questo documento sono state rimosse: il client parla direttamente con Supabase e la sicurezza sta nelle policy RLS.
> Ogni fase produce qualcosa di testabile e potenzialmente rilasciabile.

---

## Fase 0 — Setup & Fondamenta ✅

### 0.1 — Configurazione ambiente
- [x] Expo Router, NativeWind v4, TanStack Query v5 con AsyncStorage persister
- [x] expo-secure-store, expo-constants
- [x] `app.json` con `extra.supabaseUrl` / `extra.supabaseAnonKey`
- [x] `tsconfig.json` paths per `@/` alias
- [ ] ESLint + Prettier (nessuna configurazione presente nel repo)

### 0.2 — Struttura navigazione
- [x] Root `_layout.tsx` con auth guard
- [x] `(auth)/_layout.tsx` e `(app)/_layout.tsx`
- [x] Bottom tab navigator con 7 tab
- [x] SafeAreaView e gestione insets

### 0.3 — Auth
- [x] `lib/supabase.ts`: client Supabase con sessione persistita su AsyncStorage e refresh automatico
- [x] `hooks/useAuth.ts` con stato auth e profilo utente
- [x] Login Google via Supabase Auth (`expo-auth-session` / `expo-web-browser`)
- [x] Onboarding: crea coppia o inserisci codice invito
- [x] Auth guard nel root layout

### 0.4 — Realtime
- [x] Supabase Realtime (`postgres_changes`) con invalidazione TanStack Query su board, calendar, check-in, memories, notifiche
- [ ] Realtime su todo, pantry/shopping e finance
- [ ] Integrazione AppState: refetch quando l'app torna in foreground

---

## Fase 1 — Feature core (Board, Calendar, Todo) ✅

### 1.1 — Message Board
- [x] Lista post con FlashList (pinned in cima)
- [x] PostCard con emoji reactions
- [x] Pull-to-refresh
- [x] Modale crea post
- [x] Pin / edit / delete per l'autore
- [x] Real-time via Supabase
- [ ] Infinite scroll (pagination)

### 1.2 — Calendar
- [x] Vista mensile con `react-native-calendars`, eventi colorati per partner
- [x] Lista eventi del giorno selezionato
- [x] Modale crea/modifica evento
- [x] Real-time via Supabase
- [ ] Toggle vista settimanale / annuale
- [ ] Swipe-to-delete su evento
- [ ] Reminder configurabili per evento (15min / 1h / 1 giorno) — richiede campo `reminder_minutes` su `events`

### 1.3 — Todo
- [x] Lista delle TodoList con emoji + nome
- [x] Items filtrabili, checkbox con optimistic update
- [x] Crea/modifica item con deadline, priority, assignee
- [x] Pull-to-refresh
- [ ] Swipe-to-delete su item
- [ ] Badge con contatore items aperti sul tab

---

## Fase 2 — Feature lifestyle (Pantry, Finance) ✅

### 2.1 — Pantry & Shopping
- [x] Tab pantry per categoria (Frigo/Freezer/Dispensa/Bagno/Altro)
- [x] Aggiunta e modifica item
- [x] Expiry date con badge scaduto / in scadenza
- [x] Tab shopping list con check-off
- [x] Sezione ricette: lista + dettaglio ingredienti
- [x] Alert scadenze (3 giorni) via Edge Function `daily-cron`
- [ ] Autocomplete su storico acquisti
- [ ] Bottone "Aggiungi alla lista della spesa" da item in esaurimento

### 2.2 — Finance
- [x] Dashboard mese con totale e split
- [x] Lista spese con categorie e filtro mese
- [x] Aggiunta spesa rapida
- [x] Budget mensile per categoria con confronto budget vs reale
- [x] Goals con barra di progresso
- [ ] Grafici (trend, categorie, confronto mese su mese)
- [ ] Top 5 categorie con percentuali
- [ ] Impostazione split mode (EQUAL/PROPORTIONAL) in settings

---

## Fase 3 — Feature relazionali (Check-in, Memories) ✅

### 3.1 — Check-in
- [x] Creazione check-in con prompt e mood selector
- [x] Risposta libera con keyboard avoiding
- [x] Reveal incrociato delle risposte solo dopo che entrambi hanno risposto
- [x] Storico check-in precedenti
- [x] Real-time via Supabase
- [ ] Gestione prompt custom (aggiungi/rimuovi)

### 3.2 — Memory Box
- [x] Timeline con FlashList
- [x] Memory card con foto (expo-image), testo, tag
- [x] Crea memory con photo picker (max 5 foto)
- [x] Upload su bucket Storage privato `memories` con policy per coppia + signed URL
- [x] Real-time via Supabase
- [x] "On this day" via Edge Function `daily-cron`
- [ ] Filtro per tag
- [ ] Pinch-to-zoom su foto
- [ ] **Fase 5 — Vista mappa:** richiede campo `location` su `memories`

---

## Fase 4 — Qualità e rilascio 🚧

### 4.1 — Performance e UX
- [x] FlashList sulle liste lunghe (board, check-in, memories, notifiche)
- [ ] Skeleton loaders (oggi si usano spinner)
- [ ] Haptic feedback su azioni chiave
- [ ] Animazioni di transizione custom (Reanimated)

### 4.2 — Notifiche push
- [x] Tabella `users.push_tokens` + Edge Function `send-notification` (Expo Push API)
- [x] Edge Function `daily-cron` (scadenze dispensa, "on this day", todo in scadenza)
- [x] Notifiche in-app con trigger DB su post/eventi/spese/todo + campanella e realtime
- [x] Registrazione del push token dopo il login e rimozione al logout (`lib/push.ts`)
- [x] Handling notifiche in foreground e deep link da notifica al tab corretto
- [ ] Configurare `extra.eas.projectId` e i certificati APNs/FCM — finché mancano, la registrazione del token viene saltata
- [ ] Impostazioni notifiche utente (enable/disable per tipo)

### 4.3 — Offline e robustezza
- [x] Persistenza query cache su AsyncStorage (`PersistQueryClientProvider`)
- [ ] Indicatore "offline" nell'header
- [ ] Error boundaries con schermata di fallback

### 4.4 — Build e deploy
- [x] `eas.json` presente
- [x] Deploy web su Vercel (`expo export --platform web`)
- [ ] Certificati APNs (iOS) e FCM (Android) in Expo Dashboard
- [ ] Build iOS (TestFlight) e Android (Internal Testing)
- [ ] EAS Update per OTA hotfix

### 4.5 — Store submission
- [ ] Screenshot e metadata App Store Connect / Google Play Console
- [ ] Privacy policy (GDPR)
- [ ] App review submission

---

## Fase 5 — Feature avanzate (post-lancio)

- [ ] Dark mode (NativeWind `dark:` prefix)
- [ ] i18n (IT/EN)
- [ ] Audit accessibilità WCAG 2.1 AA sul web
- [ ] PWA manifest + service worker
- [ ] Biometric lock (expo-local-authentication)
- [ ] Widget iOS con prossimo evento/todo
- [ ] Apple Sign In (richiesto dall'App Store se offri Google OAuth)
- [ ] Esportazione dati (GDPR right to portability)
- [ ] Vista mappa delle memories

---

## Tracciamento attuale

| Area | DB + RLS | App |
|------|----------|-----|
| Auth | ✅ | ✅ |
| Coppia | ✅ | ✅ |
| Board | ✅ | ✅ |
| Calendar | ✅ | ✅ |
| Todo | ✅ | ✅ |
| Pantry | ✅ | ✅ |
| Finance | ✅ | 🚧 (mancano i grafici) |
| Check-in | ✅ | ✅ |
| Memories | ✅ | ✅ |
| Notifiche in-app | ✅ | ✅ |
| Push notifications | ✅ | 🚧 (serve EAS project ID + certificati) |
| Offline support | — | 🚧 (cache persistita, manca l'indicatore offline) |

**Legenda:** ✅ Completo · ⬜ Da fare · 🚧 In corso · — Non applicabile
