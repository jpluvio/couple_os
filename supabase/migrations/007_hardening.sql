-- Couple OS — Hardening di sicurezza per il deploy pubblico
-- ─────────────────────────────────────────
-- Con l'app servita su internet, la anon key è pubblica e le policy RLS sono
-- l'unico perimetro di sicurezza. Questa migrazione chiude i punti deboli
-- emersi dall'audit delle migrazioni 001-006.
-- ─────────────────────────────────────────

-- ─────────────────────────────────────────
-- 1. search_path esplicito sulle SECURITY DEFINER
-- Senza `set search_path`, una funzione definer può essere dirottata
-- risolvendo i nomi su oggetti creati in uno schema in testa al search_path.
-- ─────────────────────────────────────────

create or replace function public.get_couple_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select couple_id from public.users where id = auth.uid()
$$;

-- ─────────────────────────────────────────
-- 2. `users.couple_id` non modificabile dal client
-- La policy "users: update own row" permette all'utente di aggiornare la
-- propria riga senza limiti di colonna: un update diretto di couple_id
-- farebbe entrare chiunque in una coppia di cui conosca l'id.
-- L'appartenenza alla coppia può cambiare solo dentro create_couple /
-- join_couple_by_code, che girano come owner (non come ruolo `authenticated`).
-- ─────────────────────────────────────────

-- NB: volutamente SECURITY INVOKER. Dentro una SECURITY DEFINER `current_user`
-- sarebbe sempre l'owner e la guardia non scatterebbe mai; così invece vale
-- 'authenticated' per gli update dal client e l'owner quando l'update arriva
-- da create_couple / join_couple_by_code.
create or replace function public.guard_user_couple_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.couple_id is distinct from old.couple_id
     and current_user in ('authenticated', 'anon') then
    raise exception 'couple_id non modificabile direttamente';
  end if;

  if new.id is distinct from old.id then
    raise exception 'id non modificabile';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_user_couple_id on public.users;
create trigger guard_user_couple_id
  before update on public.users
  for each row execute function public.guard_user_couple_id();

-- ─────────────────────────────────────────
-- 3. Le coppie si creano solo via create_couple()
-- La policy di INSERT aperta permetteva a qualsiasi utente autenticato di
-- inserire righe in `couples` (che poi non può nemmeno rileggere).
-- ─────────────────────────────────────────

drop policy if exists "couples: insert for authenticated" on public.couples;

-- ─────────────────────────────────────────
-- 4. Le reaction devono restare dentro la coppia
-- La policy precedente controllava solo user_id = auth.uid(): permetteva di
-- scrivere una reaction su un post di un'altra coppia.
-- ─────────────────────────────────────────

drop policy if exists "reactions: insert own" on public.reactions;

create policy "reactions: insert own couple"
  on public.reactions for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.couple_id = public.get_couple_id()
    )
  );

-- ─────────────────────────────────────────
-- 5. Throttling dei tentativi di join
-- Nessuna policy: la tabella è scritta e letta solo dalle funzioni
-- SECURITY DEFINER, che girano come owner e bypassano RLS.
-- ─────────────────────────────────────────

create table if not exists public.join_attempts (
    id         bigserial primary key,
    user_id    uuid not null references public.users(id) on delete cascade,
    succeeded  boolean not null,
    created_at timestamptz not null default now()
);

create index if not exists join_attempts_user_time
  on public.join_attempts (user_id, created_at desc);

alter table public.join_attempts enable row level security;

-- ─────────────────────────────────────────
-- 6. Codice invito: da 6 caratteri hex (16,7M combinazioni, forzabili) a
-- 10 caratteri derivati da gen_random_uuid() (~1,1e12 combinazioni, CSPRNG).
-- ─────────────────────────────────────────

create or replace function public.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  for _ in 1..5 loop
    v_code := substr(upper(replace(gen_random_uuid()::text, '-', '')), 1, 10);
    if not exists (select 1 from public.invite_codes where code = v_code) then
      return v_code;
    end if;
  end loop;

  raise exception 'Impossibile generare un codice invito';
end;
$$;

create or replace function public.create_couple(couple_name text default null)
returns json  -- { couple_id, invite_code }
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid;
  v_code      text;
begin
  if auth.uid() is null then
    raise exception 'Non autenticato';
  end if;

  if (select couple_id from public.users where id = auth.uid()) is not null then
    raise exception 'Sei già in una coppia';
  end if;

  insert into public.couples (name)
  values (nullif(trim(couple_name), ''))
  returning id into v_couple_id;

  update public.users
  set couple_id = v_couple_id
  where id = auth.uid();

  v_code := public.generate_invite_code();

  insert into public.invite_codes (code, couple_id, expires_at)
  values (v_code, v_couple_id, now() + interval '48 hours');

  return json_build_object('couple_id', v_couple_id, 'invite_code', v_code);
end;
$$;

-- ─────────────────────────────────────────
-- 7. join_couple_by_code: solo autenticati, con throttling e limite di 2 membri
--
-- Prima: EXECUTE era concesso a PUBLIC (default Postgres), quindi anche il
-- ruolo `anon` poteva chiamarla. Con auth.uid() null l'update non toccava
-- nessuna riga ma il codice veniva comunque marcato come usato: un anonimo
-- poteva bruciare i codici invito e forzarli senza nemmeno registrarsi.
--
-- Ora restituisce NULL sul codice non valido invece di sollevare un'eccezione:
-- un RAISE farebbe rollback anche dell'inserimento in join_attempts,
-- vanificando il conteggio dei tentativi.
-- ─────────────────────────────────────────

create or replace function public.join_couple_by_code(invite_code text)
returns uuid  -- couple_id, oppure NULL se il codice non è valido
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid;
  v_code_id   uuid;
  v_failed    integer;
begin
  if auth.uid() is null then
    raise exception 'Non autenticato';
  end if;

  if (select couple_id from public.users where id = auth.uid()) is not null then
    raise exception 'Sei già in una coppia';
  end if;

  select count(*) into v_failed
  from public.join_attempts
  where user_id = auth.uid()
    and succeeded = false
    and created_at > now() - interval '1 hour';

  if v_failed >= 5 then
    raise exception 'Troppi tentativi falliti. Riprova tra un''ora.';
  end if;

  select id, couple_id
  into v_code_id, v_couple_id
  from public.invite_codes
  where code = upper(trim(invite_code))
    and used = false
    and expires_at > now();

  if v_couple_id is null then
    insert into public.join_attempts (user_id, succeeded) values (auth.uid(), false);
    return null;
  end if;

  -- Una coppia ha al massimo due membri
  if (select count(*) from public.users where couple_id = v_couple_id) >= 2 then
    insert into public.join_attempts (user_id, succeeded) values (auth.uid(), false);
    return null;
  end if;

  update public.users
  set couple_id = v_couple_id
  where id = auth.uid();

  update public.invite_codes
  set used = true
  where id = v_code_id;

  insert into public.join_attempts (user_id, succeeded) values (auth.uid(), true);

  return v_couple_id;
end;
$$;

-- ─────────────────────────────────────────
-- 8. Grant espliciti: revoca il default PUBLIC su tutte le funzioni chiamabili
-- dal client, poi concedi solo al ruolo `authenticated`.
-- ─────────────────────────────────────────

revoke execute on function public.create_couple(text) from public, anon;
revoke execute on function public.join_couple_by_code(text) from public, anon;
revoke execute on function public.generate_invite_code() from public, anon, authenticated;

grant execute on function public.create_couple(text) to authenticated;
grant execute on function public.join_couple_by_code(text) to authenticated;
