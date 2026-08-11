-- Habit management stays owner-scoped and transactional. Reordering rewrites
-- active positions to a dense sequence so repeated moves cannot accumulate
-- ties or gaps. Archived habits keep their completion and schedule history.

alter table public.habits
drop constraint habits_icon_is_valid;

alter table public.habits
add constraint habits_icon_is_valid
check (icon = btrim(icon) and char_length(icon) between 1 and 64);

create function public.move_habit(
  p_habit_id uuid,
  p_direction text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_habit_ids uuid[];
  v_current_index integer;
  v_target_index integer;
  v_swap_id uuid;
begin
  if p_direction not in ('up', 'down') then
    raise exception 'Direction must be up or down' using errcode = '22023';
  end if;

  perform habit.id
  from public.habits as habit
  where habit.owner_id = (select auth.uid())
    and habit.archived_at is null
  order by habit.display_order, habit.id
  for update;

  select array_agg(habit.id order by habit.display_order, habit.id)
  into v_habit_ids
  from public.habits as habit
  where habit.owner_id = (select auth.uid())
    and habit.archived_at is null;

  v_current_index := array_position(v_habit_ids, p_habit_id);
  if v_current_index is null then
    raise exception 'Active habit not found' using errcode = 'P0002';
  end if;

  v_target_index := v_current_index
    + case when p_direction = 'up' then -1 else 1 end;

  if v_target_index between 1 and coalesce(array_length(v_habit_ids, 1), 0) then
    v_swap_id := v_habit_ids[v_target_index];
    v_habit_ids[v_target_index] := v_habit_ids[v_current_index];
    v_habit_ids[v_current_index] := v_swap_id;
  end if;

  update public.habits as habit
  set display_order = (ordered.position - 1)::integer
  from unnest(v_habit_ids) with ordinality as ordered(id, position)
  where habit.id = ordered.id
    and habit.owner_id = (select auth.uid());

  return p_habit_id;
end;
$$;

create function public.archive_habit(p_habit_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_habit_id uuid;
begin
  perform habit.id
  from public.habits as habit
  where habit.owner_id = (select auth.uid())
  order by habit.display_order, habit.id
  for update;

  update public.habits as habit
  set archived_at = now()
  where habit.id = p_habit_id
    and habit.owner_id = (select auth.uid())
    and habit.archived_at is null
  returning habit.id into v_habit_id;

  if v_habit_id is null then
    raise exception 'Active habit not found' using errcode = 'P0002';
  end if;

  with ordered as (
    select
      habit.id,
      (row_number() over (order by habit.display_order, habit.id) - 1)::integer as position
    from public.habits as habit
    where habit.owner_id = (select auth.uid())
      and habit.archived_at is null
  )
  update public.habits as habit
  set display_order = ordered.position
  from ordered
  where habit.id = ordered.id;

  return v_habit_id;
end;
$$;

create function public.restore_habit(p_habit_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_habit_id uuid;
  v_display_order integer;
begin
  perform habit.id
  from public.habits as habit
  where habit.owner_id = (select auth.uid())
  order by habit.display_order, habit.id
  for update;

  select coalesce(max(habit.display_order), -1) + 1
  into v_display_order
  from public.habits as habit
  where habit.owner_id = (select auth.uid())
    and habit.archived_at is null;

  update public.habits as habit
  set archived_at = null, display_order = v_display_order
  where habit.id = p_habit_id
    and habit.owner_id = (select auth.uid())
    and habit.archived_at is not null
  returning habit.id into v_habit_id;

  if v_habit_id is null then
    raise exception 'Archived habit not found' using errcode = 'P0002';
  end if;

  return v_habit_id;
end;
$$;

revoke all on function public.move_habit(uuid, text) from public, anon;
grant execute on function public.move_habit(uuid, text) to authenticated, service_role;

revoke all on function public.archive_habit(uuid) from public, anon;
grant execute on function public.archive_habit(uuid) to authenticated, service_role;

revoke all on function public.restore_habit(uuid) from public, anon;
grant execute on function public.restore_habit(uuid) to authenticated, service_role;

comment on function public.move_habit(uuid, text) is
  'Moves an active habit one position for the authenticated owner and normalizes active ordering.';
comment on function public.archive_habit(uuid) is
  'Soft-archives an active habit for the authenticated owner without deleting schedules or completions.';
comment on function public.restore_habit(uuid) is
  'Restores an archived habit for the authenticated owner at the end of the active list.';
