-- Routines are lightweight, owner-scoped containers for habits. A habit can
-- remain standalone or belong to exactly one routine, without changing its
-- schedule, completion history, archive state, or standalone display order.
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routines_id_owner_id_unique unique (id, owner_id),
  constraint routines_name_is_valid
    check (name = btrim(name) and char_length(name) between 1 and 100),
  constraint routines_display_order_is_valid check (display_order >= 0),
  constraint routines_owner_display_order_unique
    unique (owner_id, display_order) deferrable initially immediate
);

comment on table public.routines is
  'Named owner-scoped containers used only to organize habits; routines do not have schedules or completions.';
comment on column public.routines.display_order is
  'A dense non-negative owner-scoped position maintained by routine mutation functions.';

alter table public.habits
add column routine_id uuid,
add column routine_display_order integer,
add constraint habits_routine_owner_fk
  foreign key (routine_id, owner_id)
  references public.routines (id, owner_id)
  on delete restrict,
add constraint habits_routine_membership_is_valid
  check (
    (routine_id is null and routine_display_order is null)
    or (routine_id is not null and routine_display_order >= 0)
  ),
add constraint habits_routine_display_order_unique
  unique (routine_id, routine_display_order) deferrable initially immediate;

comment on column public.habits.routine_id is
  'Optional owner-matched routine membership. Archiving a habit does not clear this value.';
comment on column public.habits.routine_display_order is
  'A dense non-negative position among all habits in its routine, retained while archived.';

create index habits_owner_routine_order_idx
on public.habits (owner_id, routine_id, routine_display_order, id);

alter table public.routines enable row level security;

revoke all on table public.routines from anon, authenticated;
grant select on table public.routines to authenticated;
grant select, insert, update, delete on table public.routines to service_role;

create policy "Users can read their own routines"
on public.routines
for select
to authenticated
using ((select auth.uid()) = owner_id);

create function private.set_routine_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_routine_updated_at() from public;

create trigger set_routines_updated_at
before update on public.routines
for each row execute function private.set_routine_updated_at();

-- Serializing routine mutations by owner gives each operation a stable list
-- to rewrite. The database transaction rolls back the complete mutation if a
-- validation or ownership check fails.
create function private.lock_routine_owner(p_owner_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  select pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text, 0)
  );
$$;

revoke all on function private.lock_routine_owner(uuid) from public;

create function private.normalize_routine_habit_order(
  p_owner_id uuid,
  p_routine_id uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  with ordered as (
    select
      habit.id,
      (row_number() over (
        order by habit.routine_display_order, habit.id
      ) - 1)::integer as position
    from public.habits as habit
    where habit.owner_id = p_owner_id
      and habit.routine_id = p_routine_id
  )
  update public.habits as habit
  set routine_display_order = ordered.position
  from ordered
  where habit.id = ordered.id;
$$;

revoke all on function private.normalize_routine_habit_order(uuid, uuid) from public;

create function public.create_routine(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_routine_id uuid;
  v_display_order integer;
begin
  if v_owner_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  perform private.lock_routine_owner(v_owner_id);
  set constraints public.routines_owner_display_order_unique deferred;

  select coalesce(max(routine.display_order), -1) + 1
  into v_display_order
  from public.routines as routine
  where routine.owner_id = v_owner_id;

  insert into public.routines (owner_id, name, display_order)
  values (v_owner_id, p_name, v_display_order)
  returning id into v_routine_id;

  return v_routine_id;
end;
$$;

create function public.rename_routine(p_routine_id uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_routine_id uuid;
begin
  if v_owner_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  perform private.lock_routine_owner(v_owner_id);

  update public.routines as routine
  set name = p_name
  where routine.id = p_routine_id
    and routine.owner_id = v_owner_id
  returning id into v_routine_id;

  if v_routine_id is null then
    raise exception 'Routine not found' using errcode = 'P0002';
  end if;

  return v_routine_id;
end;
$$;

create function public.delete_routine(p_routine_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_routine_id uuid;
begin
  if v_owner_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  perform private.lock_routine_owner(v_owner_id);
  set constraints public.routines_owner_display_order_unique deferred;
  set constraints public.habits_routine_display_order_unique deferred;

  select routine.id
  into v_routine_id
  from public.routines as routine
  where routine.id = p_routine_id
    and routine.owner_id = v_owner_id;

  if v_routine_id is null then
    raise exception 'Routine not found' using errcode = 'P0002';
  end if;

  -- The explicit unlink precedes deletion because membership includes a
  -- companion position and must not rely on a lossy ON DELETE action.
  update public.habits as habit
  set routine_id = null, routine_display_order = null
  where habit.owner_id = v_owner_id
    and habit.routine_id = v_routine_id;

  delete from public.routines as routine
  where routine.id = v_routine_id
    and routine.owner_id = v_owner_id;

  with ordered as (
    select
      routine.id,
      (row_number() over (order by routine.display_order, routine.id) - 1)::integer as position
    from public.routines as routine
    where routine.owner_id = v_owner_id
  )
  update public.routines as routine
  set display_order = ordered.position
  from ordered
  where routine.id = ordered.id;

  return v_routine_id;
end;
$$;

create function public.move_routine(p_routine_id uuid, p_direction text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_routine_ids uuid[];
  v_current_index integer;
  v_target_index integer;
  v_swap_id uuid;
begin
  if v_owner_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_direction not in ('up', 'down') then
    raise exception 'Direction must be up or down' using errcode = '22023';
  end if;

  perform private.lock_routine_owner(v_owner_id);
  set constraints public.routines_owner_display_order_unique deferred;

  select array_agg(routine.id order by routine.display_order, routine.id)
  into v_routine_ids
  from public.routines as routine
  where routine.owner_id = v_owner_id;

  v_current_index := array_position(v_routine_ids, p_routine_id);
  if v_current_index is null then
    raise exception 'Routine not found' using errcode = 'P0002';
  end if;

  v_target_index := v_current_index
    + case when p_direction = 'up' then -1 else 1 end;

  if v_target_index between 1 and coalesce(array_length(v_routine_ids, 1), 0) then
    v_swap_id := v_routine_ids[v_target_index];
    v_routine_ids[v_target_index] := v_routine_ids[v_current_index];
    v_routine_ids[v_current_index] := v_swap_id;
  end if;

  update public.routines as routine
  set display_order = (ordered.position - 1)::integer
  from unnest(v_routine_ids) with ordinality as ordered(id, position)
  where routine.id = ordered.id;

  return p_routine_id;
end;
$$;

create function public.assign_habit_to_routine(
  p_habit_id uuid,
  p_routine_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_previous_routine_id uuid;
  v_routine_display_order integer;
  v_habit_id uuid;
begin
  if v_owner_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  perform private.lock_routine_owner(v_owner_id);
  set constraints public.habits_routine_display_order_unique deferred;

  if not exists (
    select 1 from public.routines as routine
    where routine.id = p_routine_id and routine.owner_id = v_owner_id
  ) then
    raise exception 'Routine not found' using errcode = 'P0002';
  end if;

  select habit.routine_id
  into v_previous_routine_id
  from public.habits as habit
  where habit.id = p_habit_id
    and habit.owner_id = v_owner_id
    and habit.archived_at is null;

  if not found then
    raise exception 'Active habit not found' using errcode = 'P0002';
  end if;

  if v_previous_routine_id = p_routine_id then
    return p_habit_id;
  end if;

  select coalesce(max(habit.routine_display_order), -1) + 1
  into v_routine_display_order
  from public.habits as habit
  where habit.owner_id = v_owner_id
    and habit.routine_id = p_routine_id;

  update public.habits as habit
  set routine_id = p_routine_id, routine_display_order = v_routine_display_order
  where habit.id = p_habit_id
    and habit.owner_id = v_owner_id
  returning habit.id into v_habit_id;

  if v_previous_routine_id is not null then
    perform private.normalize_routine_habit_order(v_owner_id, v_previous_routine_id);
  end if;

  return v_habit_id;
end;
$$;

create function public.move_habit_in_routine(
  p_habit_id uuid,
  p_direction text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_routine_id uuid;
  v_habit_ids uuid[];
  v_current_index integer;
  v_target_index integer;
  v_swap_id uuid;
begin
  if v_owner_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_direction not in ('up', 'down') then
    raise exception 'Direction must be up or down' using errcode = '22023';
  end if;

  perform private.lock_routine_owner(v_owner_id);
  set constraints public.habits_routine_display_order_unique deferred;

  select habit.routine_id
  into v_routine_id
  from public.habits as habit
  where habit.id = p_habit_id
    and habit.owner_id = v_owner_id
    and habit.archived_at is null;

  if not found then
    raise exception 'Active habit not found' using errcode = 'P0002';
  end if;
  if v_routine_id is null then
    raise exception 'Habit is not assigned to a routine' using errcode = 'P0002';
  end if;

  select array_agg(habit.id order by habit.routine_display_order, habit.id)
  into v_habit_ids
  from public.habits as habit
  where habit.owner_id = v_owner_id
    and habit.routine_id = v_routine_id;

  v_current_index := array_position(v_habit_ids, p_habit_id);
  v_target_index := v_current_index
    + case when p_direction = 'up' then -1 else 1 end;

  if v_target_index between 1 and coalesce(array_length(v_habit_ids, 1), 0) then
    v_swap_id := v_habit_ids[v_target_index];
    v_habit_ids[v_target_index] := v_habit_ids[v_current_index];
    v_habit_ids[v_current_index] := v_swap_id;
  end if;

  update public.habits as habit
  set routine_display_order = (ordered.position - 1)::integer
  from unnest(v_habit_ids) with ordinality as ordered(id, position)
  where habit.id = ordered.id;

  return p_habit_id;
end;
$$;

create function public.unassign_habit_from_routine(p_habit_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_previous_routine_id uuid;
  v_habit_id uuid;
begin
  if v_owner_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  perform private.lock_routine_owner(v_owner_id);
  set constraints public.habits_routine_display_order_unique deferred;

  select habit.routine_id
  into v_previous_routine_id
  from public.habits as habit
  where habit.id = p_habit_id
    and habit.owner_id = v_owner_id
    and habit.archived_at is null;

  if not found then
    raise exception 'Active habit not found' using errcode = 'P0002';
  end if;
  if v_previous_routine_id is null then
    raise exception 'Habit is not assigned to a routine' using errcode = 'P0002';
  end if;

  update public.habits as habit
  set routine_id = null, routine_display_order = null
  where habit.id = p_habit_id
    and habit.owner_id = v_owner_id
  returning habit.id into v_habit_id;

  perform private.normalize_routine_habit_order(v_owner_id, v_previous_routine_id);

  return v_habit_id;
end;
$$;

revoke all on function public.create_routine(text) from public, anon;
grant execute on function public.create_routine(text) to authenticated, service_role;
revoke all on function public.rename_routine(uuid, text) from public, anon;
grant execute on function public.rename_routine(uuid, text) to authenticated, service_role;
revoke all on function public.delete_routine(uuid) from public, anon;
grant execute on function public.delete_routine(uuid) to authenticated, service_role;
revoke all on function public.move_routine(uuid, text) from public, anon;
grant execute on function public.move_routine(uuid, text) to authenticated, service_role;
revoke all on function public.assign_habit_to_routine(uuid, uuid) from public, anon;
grant execute on function public.assign_habit_to_routine(uuid, uuid) to authenticated, service_role;
revoke all on function public.move_habit_in_routine(uuid, text) from public, anon;
grant execute on function public.move_habit_in_routine(uuid, text) to authenticated, service_role;
revoke all on function public.unassign_habit_from_routine(uuid) from public, anon;
grant execute on function public.unassign_habit_from_routine(uuid) to authenticated, service_role;

comment on function public.delete_routine(uuid) is
  'Deletes an owner routine and atomically unlinks its habits without deleting their schedules, completions, or archive history.';
comment on function public.assign_habit_to_routine(uuid, uuid) is
  'Assigns an active owner habit to an owner routine at the end of that routine, preserving all habit history.';
comment on function public.move_habit_in_routine(uuid, text) is
  'Moves an active assigned habit one position within its routine and rewrites the complete routine order.';
