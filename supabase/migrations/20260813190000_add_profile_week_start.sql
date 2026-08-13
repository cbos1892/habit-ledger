alter table public.profiles
add column week_starts_on smallint not null default 1;

alter table public.profiles
add constraint profiles_week_starts_on_is_valid
check (week_starts_on in (0, 1));

comment on column public.profiles.week_starts_on is
  'The first day of the user''s displayed week: Sunday (0) or Monday (1).';

grant update (week_starts_on) on table public.profiles to authenticated;
