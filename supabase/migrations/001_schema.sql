-- Couple OS — Initial Schema
-- Run this in Supabase Dashboard → SQL Editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────

create type split_mode as enum ('EQUAL', 'PROPORTIONAL');
create type priority_level as enum ('LOW', 'MEDIUM', 'HIGH');
create type todo_status as enum ('TODO', 'IN_PROGRESS', 'DONE');
create type pantry_category as enum ('FRIDGE', 'FREEZER', 'PANTRY', 'BATHROOM', 'OTHER');
create type checkin_period as enum ('weekly', 'monthly', 'yearly');
create type prompt_source as enum ('SYSTEM', 'CUSTOM');

-- ─────────────────────────────────────────
-- CORE
-- ─────────────────────────────────────────

create table public.couples (
    id          uuid primary key default gen_random_uuid(),
    name        text,
    split_mode  split_mode not null default 'EQUAL',
    created_at  timestamptz not null default now()
);

-- public.users mirrors auth.users — trigger keeps them in sync
create table public.users (
    id              uuid primary key references auth.users(id) on delete cascade,
    email           text not null,
    name            text,
    avatar_url      text,
    push_tokens     text[] not null default '{}',
    google_id       text unique,
    salary          numeric(12,2),
    couple_id       uuid references public.couples(id) on delete set null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create table public.invite_codes (
    id          uuid primary key default gen_random_uuid(),
    code        text not null unique,
    couple_id   uuid not null references public.couples(id) on delete cascade,
    used        boolean not null default false,
    expires_at  timestamptz not null,
    created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- BOARD
-- ─────────────────────────────────────────

create table public.posts (
    id          uuid primary key default gen_random_uuid(),
    content     text not null check (char_length(content) <= 500),
    pinned      boolean not null default false,
    tags        text[] not null default '{}',
    author_id   uuid not null references public.users(id) on delete cascade,
    couple_id   uuid not null references public.couples(id) on delete cascade,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create table public.reactions (
    id          uuid primary key default gen_random_uuid(),
    emoji       text not null,
    user_id     uuid not null references public.users(id) on delete cascade,
    post_id     uuid not null references public.posts(id) on delete cascade,
    created_at  timestamptz not null default now(),
    unique (user_id, post_id, emoji)
);

-- ─────────────────────────────────────────
-- CALENDAR
-- ─────────────────────────────────────────

create table public.events (
    id                uuid primary key default gen_random_uuid(),
    title             text not null,
    description       text,
    location          text,
    start_at          timestamptz not null,
    end_at            timestamptz not null,
    all_day           boolean not null default false,
    color             text,
    recurrence        text,             -- RRULE string
    google_event_id   text,
    reminder_minutes  integer[],        -- e.g. [15, 60, 1440] for 15min/1h/1day
    creator_id        uuid not null references public.users(id) on delete cascade,
    couple_id         uuid not null references public.couples(id) on delete cascade,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- TODO
-- ─────────────────────────────────────────

create table public.todo_lists (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    emoji       text,
    couple_id   uuid not null references public.couples(id) on delete cascade,
    created_at  timestamptz not null default now()
);

create table public.todo_items (
    id          uuid primary key default gen_random_uuid(),
    title       text not null,
    description text,
    deadline    timestamptz,
    priority    priority_level not null default 'MEDIUM',
    status      todo_status not null default 'TODO',
    assignee_id uuid references public.users(id) on delete set null,
    list_id     uuid not null references public.todo_lists(id) on delete cascade,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- PANTRY & SHOPPING
-- ─────────────────────────────────────────

create table public.pantry_items (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    quantity    numeric(10,2),
    unit        text,
    expires_at  date,
    category    pantry_category not null default 'PANTRY',
    couple_id   uuid not null references public.couples(id) on delete cascade,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create table public.shopping_items (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    quantity    numeric(10,2),
    unit        text,
    notes       text,
    checked     boolean not null default false,
    category    pantry_category not null default 'OTHER',
    couple_id   uuid not null references public.couples(id) on delete cascade,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create table public.recipes (
    id          uuid primary key default gen_random_uuid(),
    title       text not null,
    description text,
    servings    integer,
    couple_id   uuid not null references public.couples(id) on delete cascade,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create table public.recipe_ingredients (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    quantity    text,
    recipe_id   uuid not null references public.recipes(id) on delete cascade
);

-- ─────────────────────────────────────────
-- FINANCE
-- ─────────────────────────────────────────

create table public.expenses (
    id          uuid primary key default gen_random_uuid(),
    amount      numeric(12,2) not null,
    category    text not null,           -- text (not enum) per supportare categorie custom
    note        text,
    date        date not null default current_date,
    paid_by_id  uuid not null references public.users(id) on delete cascade,
    couple_id   uuid not null references public.couples(id) on delete cascade,
    created_at  timestamptz not null default now()
);

create table public.budgets (
    id          uuid primary key default gen_random_uuid(),
    category    text not null,
    amount      numeric(12,2) not null,
    month       integer not null check (month between 1 and 12),
    year        integer not null,
    couple_id   uuid not null references public.couples(id) on delete cascade,
    created_at  timestamptz not null default now(),
    unique (couple_id, category, month, year)
);

create table public.financial_goals (
    id              uuid primary key default gen_random_uuid(),
    title           text not null,
    target_amount   numeric(12,2) not null,
    saved_amount    numeric(12,2) not null default 0,
    couple_id       uuid not null references public.couples(id) on delete cascade,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- CHECK-IN
-- ─────────────────────────────────────────

create table public.check_in_prompts (
    id          uuid primary key default gen_random_uuid(),
    text        text not null,
    period_type checkin_period not null,
    source      prompt_source not null default 'SYSTEM',
    active      boolean not null default true,
    couple_id   uuid references public.couples(id) on delete cascade,  -- null = system prompt
    created_at  timestamptz not null default now()
);

create table public.check_ins (
    id          uuid primary key default gen_random_uuid(),
    prompt      text not null,
    period_type checkin_period not null,
    mood1       integer check (mood1 between 1 and 5),
    response1   text,
    mood2       integer check (mood2 between 1 and 5),
    response2   text,
    revealed    boolean not null default false,
    user1_id    uuid not null references public.users(id) on delete cascade,
    user2_id    uuid not null references public.users(id) on delete cascade,
    couple_id   uuid not null references public.couples(id) on delete cascade,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- MEMORIES
-- ─────────────────────────────────────────

create table public.memories (
    id          uuid primary key default gen_random_uuid(),
    content     text,
    tags        text[] not null default '{}',
    photos      text[] not null default '{}',   -- max 5 URLs (enforced in app)
    date        date not null default current_date,
    author_id   uuid not null references public.users(id) on delete cascade,
    couple_id   uuid not null references public.couples(id) on delete cascade,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────

create index on public.posts (couple_id, created_at desc);
create index on public.posts (couple_id, pinned desc, created_at desc);
create index on public.events (couple_id, start_at);
create index on public.todo_items (list_id, status);
create index on public.todo_items (assignee_id);
create index on public.pantry_items (couple_id, expires_at);
create index on public.shopping_items (couple_id, checked);
create index on public.expenses (couple_id, date desc);
create index on public.memories (couple_id, date desc);
create index on public.memories (couple_id) include (tags);
create index on public.check_ins (couple_id, created_at desc);
