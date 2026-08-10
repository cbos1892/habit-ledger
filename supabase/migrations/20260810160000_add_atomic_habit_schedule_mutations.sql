create function public.create_habit_with_schedule(
  p_name text,
  p_icon text,
  p_color text,
  p_start_date date,
  p_weekdays smallint[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_habit_id uuid;
  v_display_order integer;
begin
  if p_weekdays is null
    or cardinality(p_weekdays) = 0
    or exists (
      select 1
      from unnest(p_weekdays) as requested(weekday)
      where requested.weekday is null or requested.weekday not between 1 and 7
    )
  then
    raise exception 'At least one valid ISO weekday is required'
      using errcode = '22023';
  end if;

  select coalesce(max(habits.display_order), -1) + 1
  into v_display_order
  from public.habits
  where habits.owner_id = (select auth.uid());

  insert into public.habits (
    owner_id,
    name,
    icon,
    color,
    display_order,
    start_date
  )
  values (
    (select auth.uid()),
    p_name,
    p_icon,
    p_color,
    v_display_order,
    p_start_date
  )
  returning id into v_habit_id;

  insert into public.habit_schedules (habit_id, owner_id, weekday)
  select v_habit_id, (select auth.uid()), requested.weekday
  from (
    select distinct weekday
    from unnest(p_weekdays) as weekdays(weekday)
  ) as requested;

  return v_habit_id;
end;
$$;

create function public.update_habit_with_schedule(
  p_habit_id uuid,
  p_name text,
  p_icon text,
  p_color text,
  p_start_date date,
  p_weekdays smallint[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_habit_id uuid;
begin
  if p_weekdays is null
    or cardinality(p_weekdays) = 0
    or exists (
      select 1
      from unnest(p_weekdays) as requested(weekday)
      where requested.weekday is null or requested.weekday not between 1 and 7
    )
  then
    raise exception 'At least one valid ISO weekday is required'
      using errcode = '22023';
  end if;

  update public.habits as habit
  set
    name = p_name,
    icon = p_icon,
    color = p_color,
    start_date = p_start_date
  where habit.id = p_habit_id
    and habit.owner_id = (select auth.uid())
    and habit.archived_at is null
  returning habit.id into v_habit_id;

  if v_habit_id is null then
    raise exception 'Active habit not found' using errcode = 'P0002';
  end if;

  delete from public.habit_schedules
  where habit_id = v_habit_id
    and owner_id = (select auth.uid());

  insert into public.habit_schedules (habit_id, owner_id, weekday)
  select v_habit_id, (select auth.uid()), requested.weekday
  from (
    select distinct weekday
    from unnest(p_weekdays) as weekdays(weekday)
  ) as requested;

  return v_habit_id;
end;
$$;

revoke all on function public.create_habit_with_schedule(
  text,
  text,
  text,
  date,
  smallint[]
) from public, anon;
grant execute on function public.create_habit_with_schedule(
  text,
  text,
  text,
  date,
  smallint[]
) to authenticated, service_role;

revoke all on function public.update_habit_with_schedule(
  uuid,
  text,
  text,
  text,
  date,
  smallint[]
) from public, anon;
grant execute on function public.update_habit_with_schedule(
  uuid,
  text,
  text,
  text,
  date,
  smallint[]
) to authenticated, service_role;

comment on function public.create_habit_with_schedule(
  text,
  text,
  text,
  date,
  smallint[]
) is 'Creates a habit and its complete ISO-weekday schedule atomically for the authenticated user.';

comment on function public.update_habit_with_schedule(
  uuid,
  text,
  text,
  text,
  date,
  smallint[]
) is 'Updates an active habit and replaces its complete ISO-weekday schedule atomically without changing completion rows.';
