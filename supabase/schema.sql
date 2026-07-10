-- ArticleHub — run once in Supabase → SQL Editor

-- Articles (managed by admin; readable by everyone)
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  topic text not null default 'general',
  description text not null default '',
  content text not null default '',
  published_at date,
  image text not null default '',
  pdf_url text not null default '',
  pdf_filename text not null default '',
  source text not null default 'ArticleHub Library',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_topic_idx on public.articles (topic);
create index if not exists articles_published_at_idx on public.articles (published_at desc);

-- Registered users (role: user | admin)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text not null unique,
  full_name text not null default '',
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_username_idx on public.users (username);
create index if not exists users_email_idx on public.users (email);

-- RLS: public read articles; no public user table access (server uses service_role)
alter table public.articles enable row level security;
alter table public.users enable row level security;

drop policy if exists "Public read articles" on public.articles;
create policy "Public read articles"
  on public.articles
  for select
  to anon, authenticated
  using (true);

-- No public policies on users — Express + service_role only
