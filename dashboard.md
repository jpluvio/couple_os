# Dashboard — Couple OS

> Aggiornato: agosto 2026.

---

## Obiettivo

Piattaforma per la gestione centralizzata della vita di coppia: bacheca messaggi, calendario condiviso, todo, dispensa, finanze, check-in emotivi, memories.

**Stack:** Supabase (Postgres + Auth + Realtime + Storage + Edge Functions) + Expo 55 / React Native 0.83 (iOS, Android e web via react-native-web)
**Struttura:** monorepo Turbo — `apps/mobile` (unica app, gira anche su web), `packages/shared`, `supabase/` (migrazioni + Edge Function)

> **Nota architetturale:** le app `apps/api` (Fastify) e `apps/web` (Next.js) descritte nei documenti originali sono state rimosse (commit `c86cc39`). Il client parla direttamente con Supabase; la sicurezza è nelle policy RLS, non in un backend intermedio. Il web è l'export Expo dell'app mobile, deployato su Vercel.

---

## Status attuale

- **Database (Supabase):** 19 tabelle, RLS su tutte, trigger di notifica, bucket Storage privato `memories`
- **Edge Functions:** `send-notification` (push via Expo) e `daily-cron` (scadenze dispensa, "on this day", todo in scadenza)
- **App (Expo):** tutte e 7 le feature implementate + notifiche in-app, auth Google, onboarding coppia
- **Realtime:** attivo su board, calendar, check-in, memories, notifiche
- **Push notifications:** registrazione token e deep link implementati lato client; restano da configurare EAS project ID e certificati APNs/FCM
- **Focus attuale:** qualità e preparazione al rilascio (fase 4)

---

## Feature implementate

| Area | DB + RLS | App |
|------|----------|-----|
| Auth Google + onboarding coppia | ✅ | ✅ |
| Board (post, reactions, pin) | ✅ | ✅ |
| Calendar | ✅ | ✅ |
| Todo | ✅ | ✅ |
| Pantry / Shopping / Ricette | ✅ | ✅ |
| Finance (spese, budget, goals) | ✅ | ✅ |
| Check-in | ✅ | ✅ |
| Memories (foto su Storage privato) | ✅ | ✅ |
| Notifiche in-app | ✅ | ✅ |
| Push notifications | ✅ | 🚧 (serve EAS project ID + certificati) |

---

## Task attive

- [ ] Configurare `extra.eas.projectId` in `app.json` e i certificati APNs/FCM (senza, la registrazione push viene saltata silenziosamente)
- [ ] Grafici finance (trend, categorie) — non ancora implementati
- [ ] Skeleton loader al posto degli spinner
- [ ] Swipe-to-delete su eventi, todo item, pantry item
- [ ] EAS Build (profili dev/preview/production) e submission store

---

## Log decisioni

| Data | Decisione |
|---|---|
| — | Monorepo Turbo per condivisione tipi tra le app |
| — | Google OAuth come unico provider auth |
| c86cc39 | Rimossi backend Fastify e web Next.js: il client parla direttamente con Supabase, sicurezza via RLS |
| ad11b4a | Foto memories su bucket Storage privato con policy per coppia, non su R2 |
| d49ea39 | Web servito come export Expo (`expo export --platform web`) su Vercel |
