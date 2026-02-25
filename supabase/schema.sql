-- Run this SQL in your Supabase project: SQL Editor > New query

-- User watchlist: tickers the user has starred
create table if not exists public.user_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  created_at timestamptz default now(),
  unique(user_id, ticker)
);

-- User export selection: tickers selected for export
create table if not exists public.user_export_selection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  created_at timestamptz default now(),
  unique(user_id, ticker)
);

-- RLS: users can only access their own data
alter table public.user_watchlist enable row level security;
alter table public.user_export_selection enable row level security;

create policy "Users can manage own watchlist"
  on public.user_watchlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own export selection"
  on public.user_export_selection for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
