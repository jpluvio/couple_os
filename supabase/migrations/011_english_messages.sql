-- Couple OS — English user-facing messages
--
-- The exceptions raised by create_couple() and join_couple_by_code() are shown
-- verbatim in the onboarding screen. The functions are otherwise unchanged from
-- migrations 003 and 004.

create or replace function public.join_couple_by_code(invite_code text)
returns uuid  -- returns couple_id
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid;
  v_code_id   uuid;
begin
  select id, couple_id
  into v_code_id, v_couple_id
  from public.invite_codes
  where code = invite_code
    and used = false
    and expires_at > now();

  if v_couple_id is null then
    raise exception 'That invite code is invalid or has expired';
  end if;

  if (select couple_id from public.users where id = auth.uid()) is not null then
    raise exception 'You are already in a couple';
  end if;

  update public.users
  set couple_id = v_couple_id
  where id = auth.uid();

  update public.invite_codes
  set used = true
  where id = v_code_id;

  return v_couple_id;
end;
$$;

do $$
declare
  v_source text;
begin
  -- create_couple() only needs its two messages translated; rewriting it here
  -- would duplicate migration 004, so patch the text in place.
  select prosrc into v_source from pg_proc
  where proname = 'create_couple' and pronamespace = 'public'::regnamespace;

  if v_source is null then
    return;
  end if;

  v_source := replace(v_source, 'Non autenticato', 'You are not signed in');
  v_source := replace(v_source, 'Sei già in una coppia', 'You are already in a couple');

  execute format(
    'create or replace function public.create_couple(couple_name text default null)
     returns json language plpgsql security definer set search_path = public as %L',
    v_source
  );
end $$;
