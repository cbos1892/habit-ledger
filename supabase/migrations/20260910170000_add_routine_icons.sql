alter table public.routines
add column icon text not null default '◌',
add constraint routines_icon_is_valid
  check (icon = btrim(icon) and char_length(icon) between 1 and 16);

drop function public.create_routine(text);
create function public.create_routine(p_name text, p_icon text default '◌')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner_id uuid := (select auth.uid()); v_routine_id uuid; v_display_order integer;
begin
  if v_owner_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  perform private.lock_routine_owner(v_owner_id);
  set constraints public.routines_owner_display_order_unique deferred;
  select coalesce(max(routine.display_order), -1) + 1 into v_display_order from public.routines as routine where routine.owner_id = v_owner_id;
  insert into public.routines (owner_id, name, icon, display_order) values (v_owner_id, p_name, p_icon, v_display_order) returning id into v_routine_id;
  return v_routine_id;
end; $$;

drop function public.rename_routine(uuid, text);
create function public.rename_routine(p_routine_id uuid, p_name text, p_icon text default '◌')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner_id uuid := (select auth.uid()); v_routine_id uuid;
begin
  if v_owner_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  perform private.lock_routine_owner(v_owner_id);
  update public.routines as routine set name = p_name, icon = p_icon where routine.id = p_routine_id and routine.owner_id = v_owner_id returning id into v_routine_id;
  if v_routine_id is null then raise exception 'Routine not found' using errcode = 'P0002'; end if;
  return v_routine_id;
end; $$;
