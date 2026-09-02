begin;

create extension if not exists pgtap with schema extensions;

select plan(50);

select has_table('public', 'routines', 'routines table exists');
select col_is_pk('public', 'routines', 'id', 'routine id is the primary key');
select col_not_null('public', 'routines', 'owner_id', 'routine owner is required');
select col_not_null('public', 'routines', 'name', 'routine name is required');
select col_not_null('public', 'routines', 'display_order', 'routine order is required');
select col_is_null('public', 'habits', 'routine_id', 'habit routine membership is optional');
select col_is_null('public', 'habits', 'routine_display_order', 'habit routine position is optional');
select is(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.routines'::regclass),
  true,
  'row-level security is enabled for routines'
);
select policies_are(
  'public',
  'routines',
  array['Users can read their own routines'],
  'routines have only the intended owner-read policy'
);

select has_function('public', 'create_routine', array['text']);
select has_function('public', 'rename_routine', array['uuid', 'text']);
select has_function('public', 'delete_routine', array['uuid']);
select has_function('public', 'move_routine', array['uuid', 'text']);
select has_function('public', 'assign_habit_to_routine', array['uuid', 'uuid']);
select has_function('public', 'move_habit_in_routine', array['uuid', 'text']);
select has_function('public', 'unassign_habit_from_routine', array['uuid']);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'routine-one@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'routine-two@example.test');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select lives_ok($$select public.create_routine('Morning')$$, 'an owner can create an empty routine');
select lives_ok($$select public.create_routine('Morning')$$, 'routine names may be repeated');
select results_eq(
  $$select name from public.routines order by display_order$$,
  $$values ('Morning'::text), ('Morning'::text)$$,
  'both empty routines are retained in owner order'
);
select lives_ok(
  $$select public.rename_routine((select id from public.routines order by display_order limit 1), 'Start')$$,
  'an owner can rename a routine'
);
select is(
  (select name from public.routines order by display_order limit 1),
  'Start',
  'renaming changes only the routine name'
);
select lives_ok(
  $$select public.move_routine((select id from public.routines order by display_order desc limit 1), 'up')$$,
  'an owner can move a routine'
);
select results_eq(
  $$select display_order from public.routines order by display_order$$,
  $$values (0), (1)$$,
  'routine moves keep a dense owner-scoped order'
);
select throws_ok(
  $$select public.move_routine((select id from public.routines limit 1), 'sideways')$$,
  '22023', 'Direction must be up or down', 'invalid routine directions are rejected atomically'
);

insert into public.habits (id, owner_id, name, icon, color, display_order, start_date)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', (select auth.uid()), 'Walk', '🚶', 'fern', 0, '2026-08-10'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', (select auth.uid()), 'Read', '📖', 'ocean', 1, '2026-08-10'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', (select auth.uid()), 'Stretch', '🧘', 'sun', 2, '2026-08-10');
insert into public.habit_schedules (habit_id, owner_id, weekday)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', (select auth.uid()), 1);
insert into public.completions (habit_id, owner_id, local_date)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', (select auth.uid()), '2026-08-10');

select lives_ok(
  $$select public.assign_habit_to_routine(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    (select id from public.routines order by display_order limit 1)
  )$$,
  'an active habit can be assigned to an owner routine'
);
select lives_ok(
  $$select public.assign_habit_to_routine(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    (select id from public.routines order by display_order limit 1)
  )$$,
  'another habit can join the same routine'
);
select results_eq(
  $$select routine_display_order from public.habits where routine_id is not null order by routine_display_order$$,
  $$values (0), (1)$$,
  'membership appends habits in dense routine-local order'
);
select lives_ok(
  $$select public.move_habit_in_routine('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'up')$$,
  'a habit can move within its routine'
);
select results_eq(
  $$select name from public.habits where routine_id is not null order by routine_display_order$$,
  $$values ('Read'::text), ('Walk'::text)$$,
  'routine-local movement does not use standalone habit order'
);
select results_eq(
  $$select display_order from public.habits order by display_order$$,
  $$values (0), (1), (2)$$,
  'routine membership does not alter standalone habit order'
);
select lives_ok(
  $$select public.archive_habit('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  'an assigned habit can be archived'
);
select ok(
  (select routine_id is not null and routine_display_order = 1 from public.habits where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'archiving retains routine membership and routine-local position'
);
select lives_ok(
  $$select public.restore_habit('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  'an assigned habit can be restored'
);
select ok(
  (select routine_id is not null and routine_display_order = 1 from public.habits where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'restoring retains the prior routine membership and position'
);
select lives_ok(
  $$select public.unassign_habit_from_routine('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  'an assigned active habit can be unassigned'
);
select ok(
  (select routine_id is null and routine_display_order is null from public.habits where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'unassigning clears both membership fields together'
);
select throws_ok(
  $$select public.unassign_habit_from_routine('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  'P0002', 'Habit is not assigned to a routine', 'unassigning an unassigned habit has no partial effect'
);
select throws_ok(
  $$select public.move_habit_in_routine('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'down')$$,
  'P0002', 'Habit is not assigned to a routine', 'moving an unassigned habit is rejected'
);

select lives_ok(
  $$select public.assign_habit_to_routine(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    (select id from public.routines order by display_order desc limit 1)
  )$$,
  'a habit can be assigned to a second routine'
);
select lives_ok(
  $$select public.assign_habit_to_routine(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    (select id from public.routines order by display_order limit 1)
  )$$,
  'assigning to another routine moves the membership atomically'
);
select results_eq(
  $$select routine_display_order from public.habits where routine_id = (select id from public.routines order by display_order limit 1) order by routine_display_order$$,
  $$values (0), (1)$$,
  'moving membership appends to the destination routine without duplicate positions'
);
select lives_ok(
  $$select public.delete_routine((select id from public.routines order by display_order limit 1))$$,
  'an owner can delete a routine'
);
select is((select count(*) from public.habits where routine_id is not null), 0::bigint, 'deleting a routine unlinks every member');
select is((select count(*) from public.habit_schedules), 1::bigint, 'deleting a routine preserves member schedules');
select is((select count(*) from public.completions), 1::bigint, 'deleting a routine preserves completion history');
select is((select count(*) from public.habits), 3::bigint, 'deleting a routine preserves habit rows and archive history');

reset role;
insert into public.routines (id, owner_id, name, display_order)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '22222222-2222-4222-8222-222222222222', 'Private', 0);
set local role authenticated;

select results_eq(
  $$select id from public.routines order by id$$,
  $$select id from public.routines where owner_id = (select auth.uid()) order by id$$,
  'a user can read only their own routines'
);
select throws_ok(
  $$select public.rename_routine('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Exposed')$$,
  'P0002', 'Routine not found', 'a user cannot rename another owner''s routine'
);
select throws_ok(
  $$select public.assign_habit_to_routine('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')$$,
  'P0002', 'Routine not found', 'a user cannot assign a habit to another owner''s routine'
);
select throws_ok(
  $$update public.habits set routine_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501', 'permission denied for table habits', 'direct membership changes are not granted to authenticated clients'
);

select * from finish();

rollback;
