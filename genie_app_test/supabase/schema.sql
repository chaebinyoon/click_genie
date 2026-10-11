-- 지니 앱 사용자 라이브러리
-- Supabase 대시보드 → SQL Editor 에 붙여 넣고 한 번 실행하세요.
-- 이미 만든 테이블이 있으면 이 스크립트는 그대로 다시 실행해도 됩니다.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  provider text,
  updated_at timestamptz not null default now()
);

create table if not exists public.playlists (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null default '',
  sub text,
  time_label text,
  color text,
  cover text,
  source_id text,
  position integer not null default 0,
  tracks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.liked_tracks (
  user_id uuid not null references auth.users (id) on delete cascade,
  track_key text not null,
  title text not null,
  artist text not null default '',
  cover text,
  preview_url text,
  color text,
  liked_at timestamptz not null default now(),
  primary key (user_id, track_key)
);

create table if not exists public.library_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  queue_tracks jsonb not null default '[]'::jsonb,
  recent_searches jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.playlists enable row level security;
alter table public.liked_tracks enable row level security;
alter table public.library_state enable row level security;

drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "playlists_own" on public.playlists;
create policy "playlists_own" on public.playlists
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "liked_tracks_own" on public.liked_tracks;
create policy "liked_tracks_own" on public.liked_tracks
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "library_state_own" on public.library_state;
create policy "library_state_own" on public.library_state
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.playlists to authenticated;
grant select, insert, update, delete on public.liked_tracks to authenticated;
grant select, insert, update, delete on public.library_state to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, provider)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'user_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    coalesce(new.raw_app_meta_data->>'provider', 'unknown')
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    provider = excluded.provider,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
