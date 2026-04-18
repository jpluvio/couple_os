# Couple OS — Roadmap

> Priorità: costruire l'app mobile nativa. Il backend e il web sono già completati.
> Ogni fase produce qualcosa di testabile e potenzialmente rilasciabile.

---

## Fase 0 — Setup & Fondamenta mobile
**Obiettivo:** App mobile avviabile, navigazione strutturata, auth funzionante.

### 0.1 — Configurazione ambiente
- [ ] Aggiungere Expo Router v4 al progetto mobile
- [ ] Configurare NativeWind v4 (Tailwind per React Native)
- [ ] Configurare TanStack Query v5 con AsyncStorage persister
- [ ] Aggiungere expo-secure-store, expo-constants
- [ ] Configurare `app.json` con `extra.apiUrl` per env management
- [ ] Aggiungere `tsconfig.json` paths per `@/` alias
- [ ] Configurare ESLint + Prettier nel mobile app

### 0.2 — Struttura navigazione
- [ ] Creare root `_layout.tsx` con auth guard
- [ ] Creare `(auth)/_layout.tsx` e `(app)/_layout.tsx`
- [ ] Implementare bottom tab navigator con 7 tab (placeholder screens)
- [ ] Aggiungere icone tab con `@expo/vector-icons`
- [ ] Implementare SafeAreaView e gestione notch/insets

### 0.3 — API client e auth
- [ ] Creare `lib/api.ts`: fetch wrapper con auto-refresh token (specchio del web)
- [ ] Creare `lib/storage.ts`: wrapper SecureStore per token
- [ ] Implementare `hooks/useAuth.ts` con stato auth globale
- [ ] Schermata Login con Google OAuth via `expo-auth-session`
- [ ] Schermata Onboarding: crea coppia o inserisci codice invito
- [ ] Auth guard nel root layout (redirect a login se non autenticato)

### 0.4 — WebSocket e real-time
- [ ] Creare `hooks/useWebSocket.ts` con reconnect automatico
- [ ] Integrazione AppState: riconnetti quando app torna in foreground
- [ ] TanStack Query invalidation on WebSocket message

**Deliverable:** App avviabile su simulatore, login Google funzionante, navigazione tra 7 tab vuoti.

---

## Fase 1 — Feature core (Board, Calendar, Todo)
**Obiettivo:** Le tre feature di uso quotidiano più frequente.

### 1.1 — Message Board
- [ ] Lista post con FlatList/FlashList (pinned in cima)
- [ ] Componente PostCard con emoji reactions (tap per toggle)
- [ ] Pull-to-refresh e infinite scroll (pagination)
- [ ] Modale crea post (content + tag selezione)
- [ ] Long-press per pin/edit/delete (se autore)
- [ ] Real-time: aggiornamento via WebSocket

### 1.2 — Calendar
- [ ] Vista mensile con `react-native-calendars` + eventi colorati per partner (ogni partner ha il proprio colore; eventi condivisi = blending dei due colori)
- [ ] Viste: mensile → tap su giorno → vista giornaliera; toggle settimanale
- [ ] Vista annuale: griglia compatta con indicatori eventi (fase 2 se complessa)
- [ ] Lista eventi del giorno selezionato sotto il calendario
- [ ] Modale crea/modifica evento (title, date, time, location, note, color, allDay)
- [ ] Swipe-to-delete su evento
- [ ] Reminder configurabili per evento: 15min / 1h / 1 giorno prima (via push notification — richiede push token)
- [ ] Gestione eventi ricorrenti (visualizzazione, non creazione — troppo complessa per v1)

### 1.3 — Todo
- [ ] Lista delle TodoList con emoji + nome
- [ ] Schermata dettaglio lista con items filtrabili (status, priority)
- [ ] Checkbox animato (ottimistic update) per completare item
- [ ] Crea/modifica item con deadline picker, priority, assignee
- [ ] Swipe-to-delete su item
- [ ] Badge con contatore items aperti sul tab

**Deliverable:** Le 3 feature core usabili nativamente. Testabile in beta chiusa.

---

## Fase 2 — Feature lifestyle (Pantry, Finance)
**Obiettivo:** Gestione casa e soldi.

### 2.1 — Pantry & Shopping
- [ ] Tab pantry: lista items per categoria (segmented control: Frigo/Freezer/Dispensa/Bagno/Altro)
- [ ] Aggiunta rapida item con autocomplete (storico acquisti)
- [ ] Modifica quantità inline (swipe per edit)
- [ ] Expiry date con badge rosso se scaduto, arancione se entro 3 giorni (notifica push automatica — specs richiedono alert 3gg prima)
- [ ] Bottone "Aggiungi alla lista della spesa" su item in esaurimento (integrazione cross-feature pantry→shopping)
- [ ] Tab shopping list: checklist con check-off animato in real-time tra partner
- [ ] Sezione ricette: lista + dettaglio ingredienti
- [ ] Bottom sheet per add/edit item (non modale full-screen)

### 2.2 — Finance
- [ ] Dashboard: totale mese, split, saldo tra partner
- [ ] Lista spese con category icons e filtro per mese
- [ ] Aggiunta spesa rapida (amount, category, nota) — categorie selezionabili + custom
- [ ] Grafici: Victory Native — line chart trend 6m/1y/5y, pie/donut per categoria, bar chart comparativo mese su mese
- [ ] Top 5 categorie con percentuali (ranked list)
- [ ] Budget mensile: progress bar per categoria con confronto budget vs reale
- [ ] Goals: barra progresso con target e importo salvato
- [ ] Impostazione split mode (EQUAL/PROPORTIONAL) in settings
- [ ] **Nota backend:** l'API ha categorie fisse (`EXPENSE_CATEGORIES`). Per categorie custom servirà un endpoint aggiuntivo o gestione lato client.

**Deliverable:** Gestione completa casa e finanze da mobile.

---

## Fase 3 — Feature relazionali (Check-in, Memories)
**Obiettivo:** Le feature più differenzianti dell'app.

### 3.1 — Check-in
- [ ] Schermata check-in attivo: prompt + mood selector (1-5 con emoji animate)
- [ ] Campo risposta libera con keyboard avoiding
- [ ] Stato "in attesa del partner" (spinner animato)
- [ ] Reveal delle risposte di entrambi con animazione
- [ ] Storico check-in precedenti (accordeon timeline)
- [ ] Gestione prompt custom (aggiungi/rimuovi)

### 3.2 — Memory Box
- [ ] Timeline verticale con date raggruppate (infinite scroll)
- [ ] Memory card con fino a 5 foto (expo-image per caching), testo, tag
- [ ] Crea memory: text input + tag selector + photo picker (max 5 foto per entry)
- [ ] Upload foto: expo-image-picker → presigned R2 URL → PUT diretto
- [ ] "On this day": notifica push + sezione in cima alla timeline
- [ ] Filtro per tag (bottom sheet con tag chips)
- [ ] Pinch-to-zoom su foto
- [ ] **Fase 5 — Vista mappa:** timeline geografica con pin delle memories su mappa (expo-maps o react-native-maps) — feature ambiziosa, richiede campo `location` in DB

**Deliverable:** App completa con tutte le 7 feature, parità funzionale col web.

---

## Fase 4 — Qualità e rilascio
**Obiettivo:** Preparare il rilascio sull'App Store / Play Store.

### 4.1 — Performance e UX
- [ ] Sostituire FlatList con FlashList ovunque ci siano liste lunghe
- [ ] Skeleton loaders su tutte le schermate
- [ ] Haptic feedback su azioni chiave (check todo, reaction, check-in mood)
- [ ] Animazioni di transizione custom (Reanimated)
- [ ] Ottimizzare bundle size (tree shaking, lazy imports)

### 4.2 — Notifiche push
- [ ] Registrazione Expo push token all'avvio (già endpoint API)
- [ ] Handling notifiche in foreground (banner in-app)
- [ ] Deep link da notifica alla schermata corretta (Expo Router)
- [ ] Impostazioni notifiche utente (enable/disable per tipo)

### 4.3 — Offline e robustezza
- [ ] Persistenza query cache su AsyncStorage
- [ ] Indicatore "offline" nel header quando non c'è connessione
- [ ] Retry automatico su errori di rete
- [ ] Error boundaries con schermata di fallback

### 4.4 — Build e deploy
- [ ] Configurare EAS Build (eas.json con profili dev/preview/production)
- [ ] Configurare certificati APNs (iOS) e FCM (Android) in Expo Dashboard
- [ ] Build iOS (TestFlight) e Android (Internal Testing)
- [ ] Configurare EAS Update per OTA hotfix

### 4.5 — Store submission
- [ ] Screenshot e metadata App Store Connect
- [ ] Screenshot e metadata Google Play Console
- [ ] Privacy policy (GDPR — specs richiedono compliance)
- [ ] App review submission

**Deliverable:** App pubblicata su App Store e Play Store.

---

## Fase 5 — Miglioramenti web e feature avanzate (post-lancio)
**Obiettivo:** Migliorare il web e aggiungere feature differenzianti.

### 5.1 — Web improvements
- [ ] Audit accessibilità WCAG 2.1 AA
- [ ] i18n: aggiungere italiano (web + mobile)
- [ ] Dark mode web
- [ ] PWA manifest + service worker per offline web

### 5.2 — Feature avanzate mobile
- [ ] Dark mode mobile (NativeWind dark: prefix)
- [ ] Biometric lock (expo-local-authentication)
- [ ] Widget iOS (Today Widget) con prossimo evento/todo
- [ ] Apple Sign In (richiesto se presente Google OAuth su App Store)
- [ ] Google Calendar sync UI (già API pronta)
- [ ] Esportazione dati (GDPR right to portability)

---

## Tracciamento attuale

| Area | Backend | Web | Mobile |
|------|---------|-----|--------|
| Auth | ✅ | ✅ | ⬜ |
| Coppia | ✅ | ✅ | ⬜ |
| Board | ✅ | ✅ | ⬜ |
| Calendar | ✅ | ✅ | ⬜ |
| Todo | ✅ | ✅ | ⬜ |
| Pantry | ✅ | ✅ | ⬜ |
| Finance | ✅ | ✅ | ⬜ |
| Check-in | ✅ | ✅ | ⬜ |
| Memories | ✅ | ✅ | ⬜ |
| Push notifications | ✅ | — | ⬜ |
| Offline support | — | ⬜ | ⬜ |

**Legenda:** ✅ Completo · ⬜ Da fare · 🚧 In corso · — Non applicabile
