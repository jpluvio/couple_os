-- Couple OS — Row Level Security Policies
-- Ogni tabella è accessibile solo ai membri della stessa coppia.

-- ─────────────────────────────────────────
-- HELPER FUNCTION
-- ─────────────────────────────────────────

create or replace function public.get_couple_id()
returns uuid
language sql
security definer
stable
as $$
  select couple_id from public.users where id = auth.uid()
$$;

-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────

alter table public.users enable row level security;

-- L'utente vede se stesso e il proprio partner
create policy "users: read own couple members"
  on public.users for select
  using (
    id = auth.uid()
    or couple_id = public.get_couple_id()
  );

create policy "users: update own row"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ─────────────────────────────────────────
-- COUPLES
-- ─────────────────────────────────────────

alter table public.couples enable row level security;

create policy "couples: members only"
  on public.couples for all
  using (id = public.get_couple_id());

-- INSERT aperto per consentire la creazione della coppia al primo utente
create policy "couples: insert for authenticated"
  on public.couples for insert
  with check (auth.uid() is not null);

-- ─────────────────────────────────────────
-- INVITE CODES
-- ─────────────────────────────────────────

alter table public.invite_codes enable row level security;

-- Chi ha già la coppia vede i propri codici invito
create policy "invite_codes: own couple"
  on public.invite_codes for select
  using (couple_id = public.get_couple_id());

create policy "invite_codes: insert own couple"
  on public.invite_codes for insert
  with check (couple_id = public.get_couple_id());

-- Chiunque autenticato può leggere un codice (per join) — via funzione server-side
-- Il join avviene in una Edge Function con service_role, quindi non serve policy SELECT pubblica.

-- ─────────────────────────────────────────
-- POSTS & REACTIONS
-- ─────────────────────────────────────────

alter table public.posts enable row level security;

create policy "posts: couple members"
  on public.posts for select
  using (couple_id = public.get_couple_id());

create policy "posts: insert own couple"
  on public.posts for insert
  with check (couple_id = public.get_couple_id() and author_id = auth.uid());

create policy "posts: update own or couple"
  on public.posts for update
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());

create policy "posts: delete own"
  on public.posts for delete
  using (author_id = auth.uid());

alter table public.reactions enable row level security;

create policy "reactions: couple members"
  on public.reactions for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.couple_id = public.get_couple_id()
    )
  );

create policy "reactions: insert own"
  on public.reactions for insert
  with check (user_id = auth.uid());

create policy "reactions: delete own"
  on public.reactions for delete
  using (user_id = auth.uid());

-- ─────────────────────────────────────────
-- EVENTS
-- ─────────────────────────────────────────

alter table public.events enable row level security;

create policy "events: couple members"
  on public.events for select
  using (couple_id = public.get_couple_id());

create policy "events: insert own couple"
  on public.events for insert
  with check (couple_id = public.get_couple_id() and creator_id = auth.uid());

create policy "events: update own couple"
  on public.events for update
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());

create policy "events: delete own"
  on public.events for delete
  using (creator_id = auth.uid() or couple_id = public.get_couple_id());

-- ─────────────────────────────────────────
-- TODO
-- ─────────────────────────────────────────

alter table public.todo_lists enable row level security;

create policy "todo_lists: couple members"
  on public.todo_lists for all
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());

alter table public.todo_items enable row level security;

create policy "todo_items: couple members"
  on public.todo_items for all
  using (
    exists (
      select 1 from public.todo_lists tl
      where tl.id = list_id and tl.couple_id = public.get_couple_id()
    )
  );

-- ─────────────────────────────────────────
-- PANTRY & SHOPPING
-- ─────────────────────────────────────────

alter table public.pantry_items enable row level security;

create policy "pantry_items: couple members"
  on public.pantry_items for all
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());

alter table public.shopping_items enable row level security;

create policy "shopping_items: couple members"
  on public.shopping_items for all
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());

alter table public.recipes enable row level security;

create policy "recipes: couple members"
  on public.recipes for all
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());

alter table public.recipe_ingredients enable row level security;

create policy "recipe_ingredients: couple members"
  on public.recipe_ingredients for all
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.couple_id = public.get_couple_id()
    )
  );

-- ─────────────────────────────────────────
-- FINANCE
-- ─────────────────────────────────────────

alter table public.expenses enable row level security;

create policy "expenses: couple members"
  on public.expenses for all
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());

alter table public.budgets enable row level security;

create policy "budgets: couple members"
  on public.budgets for all
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());

alter table public.financial_goals enable row level security;

create policy "financial_goals: couple members"
  on public.financial_goals for all
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());

-- ─────────────────────────────────────────
-- CHECK-IN
-- ─────────────────────────────────────────

alter table public.check_in_prompts enable row level security;

-- System prompts (couple_id IS NULL) visibili a tutti; custom solo alla coppia
create policy "check_in_prompts: system or own couple"
  on public.check_in_prompts for select
  using (couple_id is null or couple_id = public.get_couple_id());

create policy "check_in_prompts: insert own couple"
  on public.check_in_prompts for insert
  with check (couple_id = public.get_couple_id());

create policy "check_in_prompts: delete own couple"
  on public.check_in_prompts for delete
  using (couple_id = public.get_couple_id());

alter table public.check_ins enable row level security;

create policy "check_ins: couple members"
  on public.check_ins for all
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());

-- ─────────────────────────────────────────
-- MEMORIES
-- ─────────────────────────────────────────

alter table public.memories enable row level security;

create policy "memories: couple members"
  on public.memories for all
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());

-- ─────────────────────────────────────────
-- REALTIME — abilita le tabelle per Supabase Realtime
-- (eseguire in Dashboard → Database → Replication oppure via SQL)
-- ─────────────────────────────────────────

-- Abilita realtime su tutte le tabelle principali
-- NB: va fatto anche in Dashboard → Database → Replication → supabase_realtime publication
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.todo_items;
alter publication supabase_realtime add table public.shopping_items;
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.check_ins;
alter publication supabase_realtime add table public.memories;
