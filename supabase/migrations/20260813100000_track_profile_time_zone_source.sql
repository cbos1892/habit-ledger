alter table public.profiles
add column time_zone_source text not null default 'automatic';

alter table public.profiles
add constraint profiles_time_zone_source_is_valid
check (time_zone_source in ('automatic', 'manual'));

-- Every pre-migration confirmation came from the explicit Setup form, so keep
-- those choices from being silently overwritten by browser detection.
update public.profiles
set time_zone_source = 'manual'
where time_zone_confirmed_at is not null;

comment on column public.profiles.time_zone_source is
  'Whether browser detection may silently update the time zone or a manual choice must be preserved.';

grant update (time_zone_source) on table public.profiles to authenticated;
