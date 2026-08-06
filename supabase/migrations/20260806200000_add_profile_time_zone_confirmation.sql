-- A profile starts with a safe UTC fallback, but remains unconfigured until
-- the user confirms the browser suggestion (or chooses another time zone).
alter table public.profiles
add column time_zone_confirmed_at timestamptz;

comment on column public.profiles.time_zone_confirmed_at is
  'When the user last explicitly confirmed their IANA time-zone setting.';

grant update (time_zone_confirmed_at) on table public.profiles to authenticated;
