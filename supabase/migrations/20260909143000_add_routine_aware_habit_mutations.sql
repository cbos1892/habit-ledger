-- Keep habit identity, schedule, and routine membership changes in one database
-- transaction. The existing focused mutation functions remain available for
-- callers that intentionally do not change routine membership.
create function public.create_habit_with_schedule_and_routine(
  p_name text,
  p_icon text,
  p_color text,
  p_start_date date,
  p_weekdays smallint[],
  p_routine_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_habit_id uuid;
begin
  select public.create_habit_with_schedule(
    p_name,
    p_icon,
    p_color,
    p_start_date,
    p_weekdays
  ) into v_habit_id;

  if p_routine_id is not null then
    perform public.assign_habit_to_routine(v_habit_id, p_routine_id);
  end if;

  return v_habit_id;
end;
$$;

create function public.update_habit_with_schedule_and_routine(
  p_habit_id uuid,
  p_name text,
  p_icon text,
  p_color text,
  p_start_date date,
  p_weekdays smallint[],
  p_routine_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_previous_routine_id uuid;
begin
  select habit.routine_id
  into v_previous_routine_id
  from public.habits as habit
  where habit.id = p_habit_id
    and habit.owner_id = (select auth.uid())
    and habit.archived_at is null;

  if not found then
    raise exception 'Active habit not found' using errcode = 'P0002';
  end if;

  perform public.update_habit_with_schedule(
    p_habit_id,
    p_name,
    p_icon,
    p_color,
    p_start_date,
    p_weekdays
  );

  if v_previous_routine_id is distinct from p_routine_id then
    if p_routine_id is null then
      perform public.unassign_habit_from_routine(p_habit_id);
    else
      perform public.assign_habit_to_routine(p_habit_id, p_routine_id);
    end if;
  end if;

  return p_habit_id;
end;
$$;

revoke all on function public.create_habit_with_schedule_and_routine(
  text,
  text,
  text,
  date,
  smallint[],
  uuid
) from public, anon;
grant execute on function public.create_habit_with_schedule_and_routine(
  text,
  text,
  text,
  date,
  smallint[],
  uuid
) to authenticated, service_role;

revoke all on function public.update_habit_with_schedule_and_routine(
  uuid,
  text,
  text,
  text,
  date,
  smallint[],
  uuid
) from public, anon;
grant execute on function public.update_habit_with_schedule_and_routine(
  uuid,
  text,
  text,
  text,
  date,
  smallint[],
  uuid
) to authenticated, service_role;

comment on function public.create_habit_with_schedule_and_routine(
  text,
  text,
  text,
  date,
  smallint[],
  uuid
) is 'Creates a habit, schedule, and optional routine membership atomically for the authenticated user.';

comment on function public.update_habit_with_schedule_and_routine(
  uuid,
  text,
  text,
  text,
  date,
  smallint[],
  uuid
) is 'Updates an active habit, schedule, and optional routine membership atomically without changing completion rows.';

-- Archived members keep their saved positions, but are not invisible stops in
-- the active reorder controls. Swap the two visible habits' stored positions.
create or replace function public.move_habit_in_routine(
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
  v_habit_orders integer[];
  v_current_index integer;
  v_target_index integer;
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

  select
    array_agg(habit.id order by habit.routine_display_order, habit.id),
    array_agg(habit.routine_display_order order by habit.routine_display_order, habit.id)
  into v_habit_ids, v_habit_orders
  from public.habits as habit
  where habit.owner_id = v_owner_id
    and habit.routine_id = v_routine_id
    and habit.archived_at is null;

  v_current_index := array_position(v_habit_ids, p_habit_id);
  v_target_index := v_current_index
    + case when p_direction = 'up' then -1 else 1 end;

  if v_target_index between 1 and coalesce(array_length(v_habit_ids, 1), 0) then
    update public.habits as habit
    set routine_display_order = case
      when habit.id = v_habit_ids[v_current_index]
        then v_habit_orders[v_target_index]
      else v_habit_orders[v_current_index]
    end
    where habit.owner_id = v_owner_id
      and habit.id in (
        v_habit_ids[v_current_index],
        v_habit_ids[v_target_index]
      );
  end if;

  return p_habit_id;
end;
$$;

create function public.move_standalone_habit(
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

  select array_agg(habit.id order by habit.display_order, habit.id)
  into v_habit_ids
  from public.habits as habit
  where habit.owner_id = v_owner_id
    and habit.archived_at is null
    and habit.routine_id is null;

  v_current_index := array_position(v_habit_ids, p_habit_id);
  if v_current_index is null then
    raise exception 'Active standalone habit not found' using errcode = 'P0002';
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
    and habit.owner_id = v_owner_id;

  return p_habit_id;
end;
$$;

revoke all on function public.move_standalone_habit(uuid, text) from public, anon;
grant execute on function public.move_standalone_habit(uuid, text) to authenticated, service_role;

comment on function public.move_standalone_habit(uuid, text) is
  'Moves an active standalone habit among standalone habits without using routine membership order.';
