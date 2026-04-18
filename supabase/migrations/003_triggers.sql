-- Couple OS — Triggers & Functions

-- ─────────────────────────────────────────
-- TRIGGER: crea public.users alla registrazione
-- ─────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url, google_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'provider_id'
  )
  on conflict (id) do update
    set
      email      = excluded.email,
      name       = coalesce(excluded.name, public.users.name),
      avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url),
      updated_at = now();
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────
-- TRIGGER: updated_at automatico
-- ─────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.events
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.todo_items
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.pantry_items
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.shopping_items
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.financial_goals
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.check_ins
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.memories
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────
-- FUNCTION: join coppia tramite codice invito
-- Chiamata da Edge Function con service_role per bypassare RLS
-- ─────────────────────────────────────────

create or replace function public.join_couple_by_code(invite_code text)
returns uuid  -- restituisce couple_id
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid;
  v_code_id   uuid;
begin
  -- Trova codice valido e non usato
  select id, couple_id
  into v_code_id, v_couple_id
  from public.invite_codes
  where code = invite_code
    and used = false
    and expires_at > now();

  if v_couple_id is null then
    raise exception 'Codice invito non valido o scaduto';
  end if;

  -- Verifica che l'utente non sia già in una coppia
  if (select couple_id from public.users where id = auth.uid()) is not null then
    raise exception 'Sei già in una coppia';
  end if;

  -- Associa l'utente alla coppia
  update public.users
  set couple_id = v_couple_id
  where id = auth.uid();

  -- Marca il codice come usato
  update public.invite_codes
  set used = true
  where id = v_code_id;

  return v_couple_id;
end;
$$;

-- ─────────────────────────────────────────
-- SEED: system check-in prompts
-- ─────────────────────────────────────────

insert into public.check_in_prompts (text, period_type, source) values
  ('Come ti sei sentito/a questa settimana?', 'weekly', 'SYSTEM'),
  ('C''è qualcosa che vorresti dirmi ma non hai ancora detto?', 'weekly', 'SYSTEM'),
  ('Qual è stato il momento più bello di questa settimana insieme?', 'weekly', 'SYSTEM'),
  ('C''è qualcosa che potremmo fare meglio come coppia questo mese?', 'monthly', 'SYSTEM'),
  ('Quali sono le tue aspettative per il prossimo mese?', 'monthly', 'SYSTEM'),
  ('Cosa ti ha reso più felice nell''ultimo anno insieme?', 'yearly', 'SYSTEM'),
  ('Qual è il tuo sogno più grande per il nostro futuro?', 'yearly', 'SYSTEM'),
  ('Cosa apprezzi di più di me in questo momento?', 'monthly', 'SYSTEM');
