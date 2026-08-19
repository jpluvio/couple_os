# Deploy — Couple OS

Guida per mettere online l'app come web app (stesso modello di Biblion: repo → Vercel).
L'app è un export Expo di `apps/mobile`: un'unica SPA statica che parla direttamente
con Supabase. **Non c'è un backend applicativo: la sicurezza sta tutta nelle policy RLS.**

Ordine consigliato: prima Supabase, poi Google, poi Vercel. Il contrario porta a un
login che rimbalza.

---

## 1. Supabase — migrazioni

Applica le migrazioni non ancora presenti sul progetto, in ordine numerico.
Dalla dashboard: **SQL Editor** → incolla il contenuto del file → Run.

| File | Contenuto |
|---|---|
| `001` → `006` | schema, RLS, trigger, creazione coppia, notifiche, storage |
| `007_hardening.sql` | **obbligatoria prima di esporre l'app su internet** |

La `007` è additiva: non modifica le migrazioni già applicate. Chiude quattro punti
deboli che in locale non contano e online sì (dettagli nei commenti del file).

### Verifica dopo la 007

```sql
-- 1. anon non deve poter chiamare le RPC
select has_function_privilege('anon', 'public.join_couple_by_code(text)', 'execute');  -- false
select has_function_privilege('anon', 'public.create_couple(text)', 'execute');        -- false

-- 2. il trigger che congela couple_id deve esistere
select tgname from pg_trigger where tgname = 'guard_user_couple_id';

-- 3. nessuna tabella pubblica senza RLS
select tablename from pg_tables t
where schemaname = 'public'
  and not exists (
    select 1 from pg_class c
    where c.relname = t.tablename and c.relrowsecurity
  );
-- deve restituire zero righe
```

---

## 2. Supabase — Realtime, Storage, Edge Functions

- **Realtime:** Database → Replication → publication `supabase_realtime`. Devono
  esserci `posts`, `reactions`, `events`, `todo_items`, `shopping_items`,
  `expenses`, `check_ins`, `memories`, `notifications`.
- **Storage:** deve esistere il bucket `memories` **privato** (non public).
  Se è pubblico, le foto sono leggibili da chiunque abbia l'URL: correggilo.
- **Edge Functions:** `supabase functions deploy daily-cron` e
  `supabase functions deploy send-notification`.
- **Schedulazione:** la `daily-cron` non si esegue da sola. Impostala a `0 9 * * *`
  (Dashboard → Edge Functions → daily-cron → Schedule, oppure via `pg_cron`).
  Scrive i promemoria — scadenze dispensa, "un ricordo di oggi", task in scadenza —
  nella tabella `notifications`: compaiono nella campanella dell'app, non come push.

---

## 3. Google OAuth

Nella Google Cloud Console, sul client OAuth usato da Supabase:

- **Authorized JavaScript origins:** l'URL di produzione (es. `https://coupleos.vercel.app`)
  e, se serve per lo sviluppo, `http://localhost:8081`
- **Authorized redirect URIs:** `https://<project-ref>.supabase.co/auth/v1/callback`

In Supabase → Authentication → URL Configuration:

- **Site URL:** l'URL di produzione
- **Redirect URLs:** stesso URL di produzione (il client usa `window.location.origin`);
  aggiungi `http://localhost:8081` per lo sviluppo locale

Se il dominio non è in questa lista, il login torna indietro senza sessione.

---

## 4. Vercel

Import del repository, poi:

| Impostazione | Valore |
|---|---|
| Root Directory | `apps/mobile` |
| Framework Preset | Other (la configurazione è in `apps/mobile/vercel.json`) |
| Build Command | `npm run build` (già in `vercel.json`) |
| Output Directory | `dist` (già in `vercel.json`) |

**Environment Variables** (Production e Preview):

| Nome | Valore |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | la anon key del progetto |

Le legge `app.config.ts`, che sovrascrive i valori di `app.json`. Senza variabili
il build non fallisce: usa i valori committati in `app.json` — comodo in sviluppo,
da evitare in produzione, perché cambiare progetto richiederebbe un commit.

> La anon key finisce nel bundle: è normale, è pubblica per definizione. A proteggere
> i dati sono le policy RLS. La **service_role key non deve mai** comparire né in
> `app.json` né nelle variabili `EXPO_PUBLIC_*`: quella bypassa ogni policy.

Il `rewrite` in `vercel.json` manda ogni percorso a `index.html`: serve perché
il routing è client-side. Senza, un refresh su `/calendar` dà 404.

---

## 5. Collaudo dopo il primo deploy

- [ ] Login Google, ritorno sull'app con la sessione attiva
- [ ] Creazione coppia: compare un codice invito di **10 caratteri**
- [ ] Il partner entra col codice da un altro browser
- [ ] Un post creato da uno compare all'altro **senza ricaricare** (Realtime)
- [ ] La campanella mostra il badge dei non letti e il tap apre il tab giusto
- [ ] Upload di una foto in Memories e rilettura (signed URL)
- [ ] Refresh diretto su `/calendar`: deve caricare, non dare 404

---

## Limiti noti di questa versione

- **Niente notifiche push.** Sul web `expo-notifications` non registra token: i
  promemoria si vedono aprendo l'app. Il codice di registrazione (`lib/push.ts`)
  resta pronto per una futura build nativa, dove serviranno EAS project ID e
  certificati APNs/FCM.
- **Il "reveal" dei check-in è solo lato interfaccia.** Entrambe le risposte stanno
  nella stessa riga di `check_ins` e la RLS lascia leggere tutta la riga: chi apre gli
  strumenti per sviluppatori del browser vede la risposta del partner prima di aver
  risposto. Da sistemare spostando le risposte in una tabella per utente con policy
  `user_id = auth.uid() or revealed`.
- **Backup:** verifica cosa offre il piano Supabase in uso. Foto e check-in di anni
  senza backup sono il rischio più concreto, più di un attaccante.
- **GDPR:** i dati sono di due persone. Servono una privacy policy e un modo per
  esportare e cancellare i dati.
