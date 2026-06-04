-- Couple OS — Notifiche intra-app
-- ─────────────────────────────────────────
-- Tabella notifications + RLS + trigger AFTER INSERT su posts/events/expenses/todo_items.
-- Quando un membro crea contenuto, l'altro membro (il partner) riceve una notifica.
-- L'actor è auth.uid() (il trigger gira nella sessione di chi fa l'insert);
-- niente notifiche per azioni proprie e niente notifiche se la coppia ha un solo membro.
-- ─────────────────────────────────────────

create table public.notifications (
    id            uuid primary key default gen_random_uuid(),
    couple_id     uuid not null references public.couples(id) on delete cascade,
    recipient_id  uuid not null references public.users(id) on delete cascade,
    actor_id      uuid references public.users(id) on delete set null,
    type          text not null,           -- 'post' | 'event' | 'expense' | 'todo'
    entity_id     uuid,                     -- id della riga sorgente (per deep-link futuro)
    title         text not null,
    body          text not null,
    read          boolean not null default false,
    created_at    timestamptz not null default now()
);

create index on public.notifications (recipient_id, read, created_at desc);

-- ─────────────────────────────────────────
-- RLS: ognuno vede/aggiorna/cancella solo le proprie notifiche.
-- Nessuna policy INSERT: le notifiche nascono solo dai trigger SECURITY DEFINER.
-- ─────────────────────────────────────────

alter table public.notifications enable row level security;

create policy "notifications: recipient read"
  on public.notifications for select
  using (recipient_id = auth.uid());

create policy "notifications: recipient update"
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "notifications: recipient delete"
  on public.notifications for delete
  using (recipient_id = auth.uid());

-- ─────────────────────────────────────────
-- FUNCTION: notifica il partner all'inserimento di contenuto.
-- Generica via TG_ARGV[0] (tipo). Usa to_jsonb(NEW) per leggere i campi
-- in modo sicuro indipendentemente dalla tabella sorgente.
-- ─────────────────────────────────────────

create or replace function public.notify_partner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type       text := tg_argv[0];
  v_actor      uuid := auth.uid();
  v_row        jsonb := to_jsonb(new);
  v_couple_id  uuid;
  v_recipient  uuid;
  v_actor_name text;
  v_title      text;
  v_body       text;
begin
  -- couple_id: diretto (posts/events/expenses) o risolto via todo_lists (todo_items)
  if v_row ? 'couple_id' then
    v_couple_id := (v_row->>'couple_id')::uuid;
  elsif v_row ? 'list_id' then
    select couple_id into v_couple_id
    from public.todo_lists where id = (v_row->>'list_id')::uuid;
  end if;

  if v_couple_id is null then
    return new;
  end if;

  -- recipient = il partner (l'altro membro della coppia)
  select id into v_recipient
  from public.users
  where couple_id = v_couple_id
    and id is distinct from v_actor
  limit 1;

  if v_recipient is null then
    return new;  -- coppia con un solo membro: niente notifica
  end if;

  select coalesce(name, 'Il tuo partner') into v_actor_name
  from public.users where id = v_actor;

  if v_type = 'post' then
    v_title := 'Nuovo post';
    v_body  := v_actor_name || ' ha condiviso qualcosa sulla board';
  elsif v_type = 'event' then
    v_title := 'Nuovo evento';
    v_body  := v_actor_name || ' ha aggiunto "' || coalesce(v_row->>'title', '') || '" al calendario';
  elsif v_type = 'expense' then
    v_title := 'Nuova spesa';
    v_body  := v_actor_name || ' ha registrato una spesa di €' || coalesce(v_row->>'amount', '');
  elsif v_type = 'todo' then
    v_title := 'Nuovo to-do';
    v_body  := v_actor_name || ' ha aggiunto "' || coalesce(v_row->>'title', '') || '"';
  else
    v_title := 'Aggiornamento';
    v_body  := v_actor_name || ' ha aggiunto qualcosa';
  end if;

  insert into public.notifications (couple_id, recipient_id, actor_id, type, entity_id, title, body)
  values (v_couple_id, v_recipient, v_actor, v_type, (v_row->>'id')::uuid, v_title, v_body);

  return new;
end;
$$;

-- ─────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────

create trigger notify_on_post
  after insert on public.posts
  for each row execute function public.notify_partner('post');

create trigger notify_on_event
  after insert on public.events
  for each row execute function public.notify_partner('event');

create trigger notify_on_expense
  after insert on public.expenses
  for each row execute function public.notify_partner('expense');

create trigger notify_on_todo
  after insert on public.todo_items
  for each row execute function public.notify_partner('todo');

-- ─────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────

alter publication supabase_realtime add table public.notifications;
