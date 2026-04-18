# Dashboard — Couple OS

> Aggiornato: aprile 2026.

---

## Obiettivo

Piattaforma mobile-first per la gestione centralizzata della vita di coppia: bacheca messaggi, calendario condiviso, todo, dispensa, finanze, check-in emotivi, memories.

**Stack:** Fastify 5 (API) + Next.js 16 (web) + Expo 55 (mobile) + PostgreSQL + Prisma  
**Path:** `~/Desktop/Progetti/couple_os/`  
**Struttura:** monorepo Turbo con tre app (web, mobile, API) + pacchetto shared

---

## Status attuale

- **Backend (Fastify):** completo — auth, board, calendar, todo, pantry, finance, check-in, memories
- **Web (Next.js):** completo — 7 tab, real-time WebSocket, responsive
- **Mobile (Expo):** solo boilerplate — da costruire interamente
- **Focus attuale:** costruire l'app mobile nativa

---

## Roadmap mobile

### Fase 0 — Setup & Fondamenta (in corso)
- [ ] Expo Router v4, NativeWind v4, TanStack Query v5
- [ ] Struttura navigazione (auth guard, bottom tab con 7 tab)
- [ ] API client con auto-refresh token
- [ ] WebSocket con reconnect automatico

### Fase 1 — Feature core
- [ ] Message Board (lista post, reactions, real-time)
- [ ] Calendar (vista mensile/settimanale, colori per partner)
- [ ] Todo (liste condivise, assegnazione, scadenze)

### Fase 2+ — Feature secondarie
- [ ] Pantry, Finance, Check-in, Memories

---

## Stack mobile confermato

| Layer | Tecnologia |
|---|---|
| Framework | Expo 55 + Expo Router v4 |
| Styling | NativeWind v4 (Tailwind per RN) |
| State/Cache | TanStack Query v5 |
| Storage locale | expo-secure-store + AsyncStorage |
| Real-time | WebSocket (hook custom con reconnect) |

---

## Task attive

- [ ] Completare setup ambiente mobile (Fase 0.1)
- [ ] Implementare struttura navigazione (Fase 0.2)
- [ ] Auth funzionante su mobile (Fase 0.3)
- [ ] WebSocket integration (Fase 0.4)

---

## Log decisioni

| Data | Decisione |
|---|---|
| — | Monorepo Turbo per condivisione tipi Zod tra API, web e mobile |
| — | Expo managed workflow per semplificare distribuzione iOS/Android |
| — | Google OAuth 2.0 come unico provider auth |
