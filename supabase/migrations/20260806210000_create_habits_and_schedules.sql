-- Habits are soft-archived so later completion records can retain a stable
-- parent. Schedules are normalized to one row per scheduled ISO weekday
-- (Monday = 1 through Sunday = 7).
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  icon text not null,
  color text not null,
  display_order integer not null,
  start_date date not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habits_id_owner_id_unique unique (id, owner_id),
  constraint habits_name_is_valid
    check (name = btrim(name) and char_length(name) between 1 and 100),
  constraint habits_icon_is_valid
    check (icon = btrim(icon) and char_length(icon) between 1 and 16),
  constraint habits_color_is_valid
    check (color in ('fern', 'ocean', 'sun', 'plum', 'rose')),
  constraint habits_display_order_is_valid check (display_order >= 0)
);

comment on table public.habits is
  'User-owned binary habits. Rows are archived with archived_at instead of deleted in normal application flows.';
comment on column public.habits.owner_id is
  'The profile that owns the habit and all of its schedule rows.';
comment on column public.habits.color is
  'A token from the application habit identity palette.';
comment on column public.habits.display_order is
  'A non-negative, owner-scoped sort position; ties are resolved by habit ID.';
comment on column public.habits.start_date is
  'The first local calendar date on which this habit can be scheduled.';
comment on column public.habits.archived_at is
  'When the habit was archived. NULL means the habit is active.';

create index habits_owner_order_idx
on public.habits (owner_id, archived_at, display_order, id);

create table public.habit_schedules (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  owner_id uuid not null,
  weekday smallint not null,
  created_at timestamptz not null default now(),
  constraint habit_schedules_habit_owner_fk
    foreign key (habit_id, owner_id)
    references public.habits (id, owner_id)
    on delete cascade,
  constraint habit_schedules_habit_weekday_unique unique (habit_id, weekday),
  constraint habit_schedules_weekday_is_valid check (weekday between 1 and 7)
);

comment on table public.habit_schedules is
  'Scheduled ISO weekdays for a habit. Seven rows represent an every-day schedule.';
comment on column public.habit_schedules.weekday is
  'ISO weekday number: Monday = 1 through Sunday = 7.';

create index habit_schedules_owner_weekday_idx
on public.habit_schedules (owner_id, weekday, habit_id);

alter table public.habits enable row level security;
alter table public.habit_schedules enable row level security;

revoke all on table public.habits from anon, authenticated;
grant select, insert on table public.habits to authenticated;
grant update (
  name,
  icon,
  color,
  display_order,
  start_date,
  archived_at
) on table public.habits to authenticated;
grant select, insert, update, delete on table public.habits to service_role;

revoke all on table public.habit_schedules from anon, authenticated;
grant select, insert, delete on table public.habit_schedules to authenticated;
grant select, insert, update, delete on table public.habit_schedules to service_role;

create policy "Users can read their own habits"
on public.habits
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can create their own habits"
on public.habits
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Users can update their own habits"
on public.habits
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Users can read their own habit schedules"
on public.habit_schedules
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can create their own habit schedules"
on public.habit_schedules
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own habit schedules"
on public.habit_schedules
for delete
to authenticated
using ((select auth.uid()) = owner_id);

create function private.set_habit_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_habit_updated_at() from public;

create trigger set_habits_updated_at
before update on public.habits
for each row execute function private.set_habit_updated_at();
