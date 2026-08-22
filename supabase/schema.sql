-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query)

create extension if not exists "uuid-ossp";

create table if not exists chats (
  id uuid primary key default uuid_generate_v4(),
  title text not null default 'New chat',
  model text not null default 'nvidia/nemotron-3.5-lightning-30b-a3b',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  chat_id uuid not null references chats(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  chat_id uuid references chats(id) on delete set null,
  title text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_chat_id_idx on messages(chat_id);
create index if not exists tasks_chat_id_idx on tasks(chat_id);

-- Row Level Security: disabled here because the app talks to Supabase only
-- from the Next.js server using the service_role key. If you ever call
-- Supabase directly from the browser, enable RLS and add policies first.
alter table chats disable row level security;
alter table messages disable row level security;
alter table tasks disable row level security;
