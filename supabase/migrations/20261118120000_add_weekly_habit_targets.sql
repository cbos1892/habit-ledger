alter table public.habits
  add column weekly_target smallint
    constraint habits_weekly_target_range check (weekly_target between 1 and 7);

grant update (weekly_target) on table public.habits to authenticated;

comment on column public.habits.weekly_target is
  'Check-ins per owner-local week. Null uses the saved ISO weekdays.';

-- Keep the existing signatures available during rollout. The new overloads
-- save the target in the same transaction as the weekday and routine changes.
create function public.create_habit_with_schedule_and_routine(
  p_name text,
  p_icon text,
  p_color text,
  p_start_date date,
  p_weekdays smallint[],
  p_routine_id uuid,
  p_weekly_target smallint
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_habit_id uuid;
begin
  v_habit_id := public.create_habit_with_schedule_and_routine(
    p_name,
    p_icon,
    p_color,
    p_start_date,
    case when p_weekly_target is null then p_weekdays
      else array[1, 2, 3, 4, 5, 6, 7]::smallint[] end,
    p_routine_id
  );

  update public.habits
  set weekly_target = p_weekly_target
  where id = v_habit_id and owner_id = (select auth.uid());

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
  p_routine_id uuid,
  p_weekly_target smallint
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_habit_id uuid;
begin
  v_habit_id := public.update_habit_with_schedule_and_routine(
    p_habit_id,
    p_name,
    p_icon,
    p_color,
    p_start_date,
    case when p_weekly_target is null then p_weekdays
      else array[1, 2, 3, 4, 5, 6, 7]::smallint[] end,
    p_routine_id
  );

  update public.habits
  set weekly_target = p_weekly_target
  where id = v_habit_id and owner_id = (select auth.uid());

  return v_habit_id;
end;
$$;

revoke all on function public.create_habit_with_schedule_and_routine(
  text, text, text, date, smallint[], uuid, smallint
) from public, anon;
grant execute on function public.create_habit_with_schedule_and_routine(
  text, text, text, date, smallint[], uuid, smallint
) to authenticated, service_role;

revoke all on function public.update_habit_with_schedule_and_routine(
  uuid, text, text, text, date, smallint[], uuid, smallint
) from public, anon;
grant execute on function public.update_habit_with_schedule_and_routine(
  uuid, text, text, text, date, smallint[], uuid, smallint
) to authenticated, service_role;
