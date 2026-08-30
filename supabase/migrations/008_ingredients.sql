-- ═══════════════════════════════════════════════════════════════════
-- 008 — Anagrafica ingredienti e quantità strutturate
--
-- Obiettivo: da una ricetta si generano gli ingredienti nella lista della
-- spesa, riscalati per il numero di porzioni scelto, escludendo ciò che è
-- già in dispensa.
--
-- Due ostacoli nello schema attuale:
--
--   1. `recipe_ingredients.quantity` è `text` ("200g", "2 cucchiai", "q.b.").
--      Non si moltiplica per un fattore. Servono numero e unità separati.
--
--   2. Il confronto ricetta ↔ dispensa è un match sul nome scritto a mano,
--      che si rompe al primo "Pelati" contro "pomodori pelati". Serve
--      un'anagrafica a cui puntino ricette, dispensa e lista della spesa.
--
-- Additiva: nessuna colonna esistente viene rimossa o cambiata di tipo, e
-- `recipe_ingredients.quantity` resta al suo posto finché la 009 non la
-- toglie, così un rollback non perde dati.
-- ═══════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────
-- 1. Normalizzazione dei nomi
-- Serve un confronto stabile fra "Pomodori Pelati", "pomodori  pelati" e
-- "Pomodorí pelati". Le accentate si traducono a mano invece di dipendere
-- dall'estensione unaccent, che non è detto sia disponibile sul progetto.
-- ─────────────────────────────────────────

create or replace function public.normalize_ingredient_name(txt text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(
    regexp_replace(
      translate(lower(trim(txt)),
                'àáâãäåèéêëìíîïòóôõöùúûüçñ',
                'aaaaaaeeeeiiiiooooouuuucn'),
      '\s+', ' ', 'g'),
    '');
$$;


-- ─────────────────────────────────────────
-- 2. Anagrafica
-- Per coppia, non globale: un'anagrafica condivisa fra coppie diverse
-- richiederebbe policy di lettura su righe altrui, che è un fronte da non
-- aprire adesso.
-- ─────────────────────────────────────────

create table if not exists public.ingredients (
    id           uuid primary key default gen_random_uuid(),
    name         text not null,
    name_norm    text not null,
    default_unit text,
    category     pantry_category not null default 'PANTRY',
    couple_id    uuid not null references public.couples(id) on delete cascade,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    constraint ingredients_name_not_blank check (length(trim(name)) > 0),
    constraint ingredients_unique_per_couple unique (couple_id, name_norm)
);

create index if not exists ingredients_couple_idx on public.ingredients (couple_id);

-- name_norm è derivato: non lo si scrive dal client.
create or replace function public.sync_ingredient_name_norm()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.name_norm := public.normalize_ingredient_name(new.name);
  if new.name_norm is null then
    raise exception 'nome ingrediente non valido';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sync_ingredient_name_norm on public.ingredients;
create trigger sync_ingredient_name_norm
  before insert or update on public.ingredients
  for each row execute function public.sync_ingredient_name_norm();


-- ─────────────────────────────────────────
-- 3. Collegamenti
-- Tutti nullable: le righe scritte a mano prima di questa migrazione
-- continuano a funzionare senza anagrafica.
-- ─────────────────────────────────────────

alter table public.recipe_ingredients
  add column if not exists ingredient_id uuid references public.ingredients(id) on delete set null,
  add column if not exists quantity_num  numeric(10,2),
  add column if not exists unit          text,
  add column if not exists quantity_text text,
  add column if not exists sort_order    integer not null default 0;

comment on column public.recipe_ingredients.quantity is
  'DEPRECATA: sostituita da quantity_num + unit + quantity_text. Rimuovibile nella 009.';

alter table public.pantry_items
  add column if not exists ingredient_id uuid references public.ingredients(id) on delete set null;

alter table public.shopping_items
  add column if not exists ingredient_id uuid references public.ingredients(id) on delete set null;

create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id, sort_order);
create index if not exists pantry_items_ingredient_idx    on public.pantry_items (couple_id, ingredient_id);
create index if not exists shopping_items_ingredient_idx  on public.shopping_items (couple_id, ingredient_id);

-- Le porzioni sono la base del riscalamento: senza, il fattore non esiste.
update public.recipes set servings = 2 where servings is null or servings < 1;
alter table public.recipes alter column servings set default 2;
alter table public.recipes alter column servings set not null;


-- ─────────────────────────────────────────
-- 4. Backfill: dal testo libero ai numeri
-- "200g farina" era già stato spezzato dal client in quantity="200g".
-- Qui si separa il numero dall'unità. Ciò che non è numerico ("q.b.",
-- "un pizzico") finisce in quantity_text e resta non scalabile.
-- ─────────────────────────────────────────

do $$
declare
  r record;
  m text[];
begin
  for r in select id, quantity from public.recipe_ingredients where quantity is not null loop
    -- numero (virgola o punto) eventualmente seguito da un'unità
    m := regexp_match(trim(r.quantity), '^([0-9]+(?:[.,][0-9]+)?)\s*([a-zA-Zàèéìòù.]*)$');

    if m is not null then
      update public.recipe_ingredients
         set quantity_num = replace(m[1], ',', '.')::numeric,
             unit         = nullif(lower(trim(m[2])), ''),
             quantity_text = null
       where id = r.id;
    else
      -- non riducibile a un numero: si conserva com'è
      update public.recipe_ingredients
         set quantity_text = r.quantity
       where id = r.id;
    end if;
  end loop;
end $$;

-- Ordine stabile degli ingredienti dentro ogni ricetta.
with numerate as (
  select id, row_number() over (partition by recipe_id order by ctid) as n
    from public.recipe_ingredients
)
update public.recipe_ingredients ri
   set sort_order = numerate.n
  from numerate
 where numerate.id = ri.id;


-- ─────────────────────────────────────────
-- 5. Backfill dell'anagrafica dai nomi già esistenti
-- Un ingrediente per nome normalizzato per coppia, prendendo la categoria
-- dalla dispensa quando c'è (è l'unica delle tre tabelle che la conosce).
-- ─────────────────────────────────────────

insert into public.ingredients (name, name_norm, couple_id, category, default_unit)
select distinct on (couple_id, norm)
       nome, norm, couple_id, categoria, unita
from (
  select p.name as nome,
         public.normalize_ingredient_name(p.name) as norm,
         p.couple_id,
         p.category as categoria,
         p.unit as unita,
         1 as priorita                     -- la dispensa vince: conosce la categoria
    from public.pantry_items p
   where public.normalize_ingredient_name(p.name) is not null

  union all

  select s.name, public.normalize_ingredient_name(s.name), s.couple_id, s.category, s.unit, 2
    from public.shopping_items s
   where public.normalize_ingredient_name(s.name) is not null

  union all

  select ri.name, public.normalize_ingredient_name(ri.name), rc.couple_id, 'PANTRY'::pantry_category, ri.unit, 3
    from public.recipe_ingredients ri
    join public.recipes rc on rc.id = ri.recipe_id
   where public.normalize_ingredient_name(ri.name) is not null
) fonti
order by couple_id, norm, priorita
on conflict (couple_id, name_norm) do nothing;

-- Collega le righe esistenti all'anagrafica appena creata.
update public.pantry_items t
   set ingredient_id = i.id
  from public.ingredients i
 where i.couple_id = t.couple_id
   and i.name_norm = public.normalize_ingredient_name(t.name)
   and t.ingredient_id is null;

update public.shopping_items t
   set ingredient_id = i.id
  from public.ingredients i
 where i.couple_id = t.couple_id
   and i.name_norm = public.normalize_ingredient_name(t.name)
   and t.ingredient_id is null;

update public.recipe_ingredients ri
   set ingredient_id = i.id
  from public.recipes rc
  join public.ingredients i on i.couple_id = rc.couple_id
 where ri.recipe_id = rc.id
   and i.name_norm = public.normalize_ingredient_name(ri.name)
   and ri.ingredient_id is null;


-- ─────────────────────────────────────────
-- 6. RLS sull'anagrafica
-- ─────────────────────────────────────────

alter table public.ingredients enable row level security;

drop policy if exists "ingredients: members only" on public.ingredients;
create policy "ingredients: members only"
  on public.ingredients for all
  using (couple_id = public.get_couple_id())
  with check (couple_id = public.get_couple_id());


-- ─────────────────────────────────────────
-- 7. Aggiunta di una ricetta alla lista della spesa
--
-- In una funzione e non nel client per due motivi: il riscalamento e la
-- somma con le righe già presenti devono essere atomici (due ricette
-- aggiunte in fretta non devono lasciare doppioni), e la regola di
-- arrotondamento deve stare in un posto solo.
--
-- Regole:
--   · si somma solo a parità di unità. Unità diverse → riga separata:
--     nessuna conversione inventata fra "3 lattine" e "500 g".
--   · gli ingredienti senza numero (q.b.) entrano con quantità nulla.
--   · `escludi_in_dispensa` salta ciò che la dispensa ha già.
-- ─────────────────────────────────────────

create or replace function public.add_recipe_to_shopping_list(
  p_recipe_id           uuid,
  p_servings            integer,
  p_escludi_in_dispensa boolean default true,
  p_escludi_ids         uuid[] default '{}'
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_couple_id  uuid;
  v_base       integer;
  v_fattore    numeric;
  v_aggiunti   integer := 0;
  r            record;
  v_qta        numeric;
  v_esistente  uuid;
begin
  if p_servings is null or p_servings < 1 then
    raise exception 'numero di porzioni non valido';
  end if;

  select rc.couple_id, rc.servings into v_couple_id, v_base
    from public.recipes rc
   where rc.id = p_recipe_id;

  -- La RLS impedisce già di leggere ricette altrui: qui la riga sarebbe nulla.
  if v_couple_id is null then
    raise exception 'ricetta non trovata';
  end if;

  v_fattore := p_servings::numeric / greatest(v_base, 1);

  for r in
    select ri.id, ri.name, ri.ingredient_id, ri.quantity_num, ri.unit,
           coalesce(i.category, 'PANTRY'::pantry_category) as categoria
      from public.recipe_ingredients ri
      left join public.ingredients i on i.id = ri.ingredient_id
     where ri.recipe_id = p_recipe_id
       and not (ri.id = any(p_escludi_ids))
     order by ri.sort_order
  loop
    -- già in dispensa?
    if p_escludi_in_dispensa and exists (
      select 1 from public.pantry_items p
       where p.couple_id = v_couple_id
         and (
           (r.ingredient_id is not null and p.ingredient_id = r.ingredient_id)
           or (r.ingredient_id is null
               and public.normalize_ingredient_name(p.name)
                   = public.normalize_ingredient_name(r.name))
         )
    ) then
      continue;
    end if;

    -- Arrotondamento: i pezzi non si dividono, i pesi vanno a passi leggibili.
    if r.quantity_num is null then
      v_qta := null;
    else
      v_qta := r.quantity_num * v_fattore;
      if r.unit is null then
        v_qta := ceil(v_qta);
      elsif v_qta >= 100 then
        v_qta := round(v_qta / 10) * 10;
      elsif v_qta >= 10 then
        v_qta := round(v_qta / 5) * 5;
      else
        v_qta := round(v_qta * 2) / 2;
      end if;
    end if;

    -- Riga compatibile già in lista? Solo se non spuntata e con la stessa unità.
    select s.id into v_esistente
      from public.shopping_items s
     where s.couple_id = v_couple_id
       and s.checked = false
       and s.unit is not distinct from r.unit
       and (
         (r.ingredient_id is not null and s.ingredient_id = r.ingredient_id)
         or (r.ingredient_id is null
             and public.normalize_ingredient_name(s.name)
                 = public.normalize_ingredient_name(r.name))
       )
     limit 1;

    if v_esistente is not null then
      update public.shopping_items
         set quantity = case
               when v_qta is null then quantity
               else coalesce(quantity, 0) + v_qta
             end,
             updated_at = now()
       where id = v_esistente;
    else
      insert into public.shopping_items (name, quantity, unit, category, couple_id, ingredient_id, checked)
      values (r.name, v_qta, r.unit, r.categoria, v_couple_id, r.ingredient_id, false);
    end if;

    v_aggiunti := v_aggiunti + 1;
  end loop;

  return v_aggiunti;
end;
$$;


-- ─────────────────────────────────────────
-- 8. "Ho comprato": gli spuntati diventano dispensa
--
-- Oggi "Svuota completati" fa una delete: quello che compri sparisce e per
-- averlo in dispensa lo devi ridigitare. Da qui nasce anche il fatto che le
-- scadenze restano vuote — il momento naturale per inserirle è questo.
--
-- p_scadenze: [{"id": "<shopping_item_id>", "expires_at": "2026-09-15"}, ...]
-- Le righe senza scadenza indicata entrano comunque, con expires_at nullo.
-- ─────────────────────────────────────────

create or replace function public.stock_purchased_items(p_scadenze jsonb default '[]'::jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_couple_id uuid;
  v_spostati  integer := 0;
  r           record;
  v_scadenza  date;
  v_esistente uuid;
begin
  v_couple_id := public.get_couple_id();
  if v_couple_id is null then
    raise exception 'utente senza coppia';
  end if;

  for r in
    select s.* from public.shopping_items s
     where s.couple_id = v_couple_id and s.checked = true
  loop
    select nullif(elem->>'expires_at', '')::date into v_scadenza
      from jsonb_array_elements(p_scadenze) elem
     where elem->>'id' = r.id::text
     limit 1;

    -- Se il prodotto è già in dispensa si somma invece di duplicare,
    -- ma solo a parità di unità: 3 lattine e 500 g restano righe distinte.
    select p.id into v_esistente
      from public.pantry_items p
     where p.couple_id = v_couple_id
       and p.unit is not distinct from r.unit
       and (
         (r.ingredient_id is not null and p.ingredient_id = r.ingredient_id)
         or (r.ingredient_id is null
             and public.normalize_ingredient_name(p.name)
                 = public.normalize_ingredient_name(r.name))
       )
     limit 1;

    if v_esistente is not null then
      update public.pantry_items
         set quantity   = case when r.quantity is null then quantity
                               else coalesce(quantity, 0) + r.quantity end,
             -- si tiene la scadenza più vicina: è quella che conta per gli avvisi
             expires_at = least(expires_at, v_scadenza),
             updated_at = now()
       where id = v_esistente;
    else
      insert into public.pantry_items (name, quantity, unit, expires_at, category, couple_id, ingredient_id)
      values (r.name, r.quantity, r.unit, v_scadenza, r.category, v_couple_id, r.ingredient_id);
    end if;

    delete from public.shopping_items where id = r.id;
    v_spostati := v_spostati + 1;
  end loop;

  return v_spostati;
end;
$$;


-- ─────────────────────────────────────────
-- 9. Grant, con lo stesso criterio della 007: niente per anon.
-- ─────────────────────────────────────────

revoke execute on function public.add_recipe_to_shopping_list(uuid, integer, boolean, uuid[]) from public, anon;
revoke execute on function public.stock_purchased_items(jsonb) from public, anon;
revoke execute on function public.normalize_ingredient_name(text) from public, anon;

grant execute on function public.add_recipe_to_shopping_list(uuid, integer, boolean, uuid[]) to authenticated;
grant execute on function public.stock_purchased_items(jsonb) to authenticated;
grant execute on function public.normalize_ingredient_name(text) to authenticated;


-- ─────────────────────────────────────────
-- 10. Salvataggio degli ingredienti di una ricetta
--
-- Il client manda le righe già strutturate; qui si crea (o si ritrova)
-- l'ingrediente in anagrafica e si riscrive l'elenco in un colpo solo.
-- In una funzione perché il find-or-create per riga costerebbe due
-- round trip a ingrediente, e perché la sostituzione dell'elenco deve
-- essere atomica: a metà strada la ricetta resterebbe monca.
--
-- p_items: [{"name":"Melanzane","quantity_num":1,"unit":null,"quantity_text":null}, ...]
--          L'ordine dell'array è l'ordine degli ingredienti.
-- ─────────────────────────────────────────

create or replace function public.save_recipe_ingredients(
  p_recipe_id uuid,
  p_items     jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_couple_id uuid;
  v_n         integer := 0;
  elem        jsonb;
  v_nome      text;
  v_norm      text;
  v_unit      text;
  v_ing_id    uuid;
begin
  select couple_id into v_couple_id from public.recipes where id = p_recipe_id;
  if v_couple_id is null then
    raise exception 'ricetta non trovata';
  end if;

  delete from public.recipe_ingredients where recipe_id = p_recipe_id;

  for elem in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_nome := trim(elem->>'name');
    v_norm := public.normalize_ingredient_name(v_nome);
    continue when v_norm is null;

    v_unit := nullif(trim(coalesce(elem->>'unit', '')), '');

    -- find-or-create in anagrafica
    select id into v_ing_id
      from public.ingredients
     where couple_id = v_couple_id and name_norm = v_norm;

    if v_ing_id is null then
      insert into public.ingredients (name, name_norm, couple_id, default_unit)
      values (v_nome, v_norm, v_couple_id, v_unit)
      returning id into v_ing_id;
    elsif v_unit is not null then
      -- si impara l'unità usata più di recente, senza sovrascrivere con nulla
      update public.ingredients set default_unit = v_unit where id = v_ing_id;
    end if;

    v_n := v_n + 1;

    insert into public.recipe_ingredients
      (recipe_id, name, ingredient_id, quantity_num, unit, quantity_text, sort_order)
    values (
      p_recipe_id,
      v_nome,
      v_ing_id,
      nullif(elem->>'quantity_num', '')::numeric,
      v_unit,
      nullif(trim(coalesce(elem->>'quantity_text', '')), ''),
      v_n
    );
  end loop;

  return v_n;
end;
$$;

revoke execute on function public.save_recipe_ingredients(uuid, jsonb) from public, anon;
grant  execute on function public.save_recipe_ingredients(uuid, jsonb) to authenticated;


-- ─────────────────────────────────────────
-- 11. Realtime sulle tabelle che ne erano rimaste fuori
--
-- La publication conteneva posts, reactions, events, todo_items,
-- shopping_items, expenses, check_ins, memories e notifications, ma non
-- pantry_items né todo_lists: dispensa e liste non si aggiornavano da sole
-- quando il partner le cambiava.
-- ─────────────────────────────────────────

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pantry_items'
    ) then
      alter publication supabase_realtime add table public.pantry_items;
    end if;

    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'todo_lists'
    ) then
      alter publication supabase_realtime add table public.todo_lists;
    end if;
  end if;
end $$;
