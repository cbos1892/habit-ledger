-- User-owned profile data is kept separate from Supabase's auth schema so it
-- can be queried through the Data API while auth.users remains private.
create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create function private.is_valid_time_zone(value text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = value
  );
$$;

revoke all on function private.is_valid_time_zone(text) from public;
grant usage on schema private to authenticated, service_role;
grant execute on function private.is_valid_time_zone(text) to authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  time_zone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_time_zone_is_valid
    check (private.is_valid_time_zone(time_zone))
);

comment on table public.profiles is
  'Private application settings owned one-to-one by a Supabase Auth user.';
comment on column public.profiles.id is
  'The owning auth.users ID and the profile primary key.';
comment on column public.profiles.time_zone is
  'A PostgreSQL-recognized IANA time zone name used for local calendar dates.';

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (time_zone) on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create function private.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_profile_updated_at() from public;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function private.set_profile_updated_at();

create function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public;

create trigger create_profile_after_auth_user_insert
after insert on auth.users
for each row execute function private.handle_new_auth_user();

-- Cover projects that already contain Auth users when this migration lands.
insert into public.profiles (id)
select id
from auth.users
on conflict (id) do nothing;
