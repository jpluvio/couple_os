-- Couple OS — Creazione coppia atomica
-- ─────────────────────────────────────────
-- FUNCTION: crea una coppia, associa l'utente e genera il codice invito.
-- SECURITY DEFINER per evitare il problema RLS del read-back: appena creata,
-- la coppia non è ancora visibile via policy SELECT (couple_id dell'utente
-- ancora null), quindi insert().select() fallirebbe lato client.
-- Stesso pattern di join_couple_by_code (003_triggers.sql).
-- ─────────────────────────────────────────

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

  -- L'utente non deve essere già in una coppia
  if (select couple_id from public.users where id = auth.uid()) is not null then
    raise exception 'Sei già in una coppia';
  end if;

  -- Crea la coppia (name opzionale)
  insert into public.couples (name)
  values (nullif(trim(couple_name), ''))
  returning id into v_couple_id;

  -- Associa l'utente alla coppia
  update public.users
  set couple_id = v_couple_id
  where id = auth.uid();

  -- Genera codice invito (6 caratteri, valido 48h)
  v_code := upper(substr(md5(random()::text), 1, 6));

  insert into public.invite_codes (code, couple_id, expires_at)
  values (v_code, v_couple_id, now() + interval '48 hours');

  return json_build_object('couple_id', v_couple_id, 'invite_code', v_code);
end;
$$;

grant execute on function public.create_couple(text) to authenticated;
