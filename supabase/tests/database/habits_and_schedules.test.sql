begin;

create extension if not exists pgtap with schema extensions;

select plan(38);

select has_table('public', 'habits', 'habits table exists');
select has_table(
  'public',
  'habit_schedules',
  'habit schedules table exists'
);
select col_is_pk('public', 'habits', 'id', 'habits.id is the primary key');
select col_is_pk(
  'public',
  'habit_schedules',
  'id',
  'habit_schedules.id is the primary key'
);
select col_not_null('public', 'habits', 'owner_id', 'habit owner is required');
select col_not_null('public', 'habits', 'name', 'habit name is required');
select col_not_null('public', 'habits', 'icon', 'habit icon is required');
select col_not_null('public', 'habits', 'color', 'habit color is required');
select col_not_null(
  'public',
  'habits',
  'display_order',
  'habit display order is required'
);
select col_not_null(
  'public',
  'habits',
  'start_date',
  'habit start date is required'
);
select col_type_is(
  'public',
  'habits',
  'archived_at',
  'timestamp with time zone',
  'archive state is represented by a timestamp'
);
select col_not_null(
  'public',
  'habits',
  'created_at',
  'habit creation timestamp is required'
);
select col_not_null(
  'public',
  'habits',
  'updated_at',
  'habit update timestamp is required'
);
select col_not_null(
  'public',
  'habit_schedules',
  'weekday',
  'schedule weekday is required'
);
select col_not_null(
  'public',
  'habit_schedules',
  'created_at',
  'schedule creation timestamp is required'
);

select is(
  (
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.habits'::regclass
  ),
  true,
  'row-level security is enabled for habits'
);
select is(
  (
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.habit_schedules'::regclass
  ),
  true,
  'row-level security is enabled for habit schedules'
);

select policies_are(
  'public',
  'habits',
  array[
    'Users can create their own habits',
    'Users can read their own habits',
    'Users can update their own habits'
  ],
  'habits has only the intended ownership policies'
);
select policies_are(
  'public',
  'habit_schedules',
  array[
    'Users can create their own habit schedules',
    'Users can delete their own habit schedules',
    'Users can read their own habit schedules'
  ],
  'habit schedules has only the intended ownership policies'
);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'habit-one@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'habit-two@example.test');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select lives_ok(
  $$insert into public.habits (id, owner_id, name, icon, color, display_order, start_date)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      'Morning walk',
      '🚶',
      'fern',
      0,
      '2026-08-06'
    )$$,
  'a user can create their own habit'
);

select throws_ok(
  $$insert into public.habits (owner_id, name, icon, color, display_order, start_date)
    values (
      '22222222-2222-4222-8222-222222222222',
      'Someone else''s habit',
      '⭐',
      'sun',
      0,
      '2026-08-06'
    )$$,
  '42501',
  'new row violates row-level security policy for table "habits"',
  'a user cannot create a habit for another owner'
);

reset role;
insert into public.habits (
  id,
  owner_id,
  name,
  icon,
  color,
  display_order,
  start_date
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '22222222-2222-4222-8222-222222222222',
  'Private habit',
  '🔒',
  'plum',
  0,
  '2026-08-06'
);
set local role authenticated;

select results_eq(
  $$select id from public.habits order by id$$,
  $$values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)$$,
  'a user can read only their own habits'
);

select lives_ok(
  $$update public.habits
    set name = 'Evening walk', archived_at = now()
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'a user can edit and archive their own habit'
);

select ok(
  (
    select archived_at is not null
    from public.habits
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  'archiving retains the habit row'
);

select results_eq(
  $$update public.habits
    set name = 'Exposed'
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    returning id$$,
  $$select null::uuid where false$$,
  'a user cannot update another owner''s habit'
);

select throws_ok(
  $$delete from public.habits
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501',
  'permission denied for table habits',
  'authenticated clients cannot hard-delete habits'
);

select lives_ok(
  $$insert into public.habit_schedules (habit_id, owner_id, weekday)
    select
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      weekday
    from generate_series(1, 7) as weekday$$,
  'seven schedule rows represent an every-day habit'
);

select is(
  (
    select count(*)
    from public.habit_schedules
    where habit_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  7::bigint,
  'all seven weekdays are retained'
);

select throws_ok(
  $$insert into public.habit_schedules (habit_id, owner_id, weekday)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      8
    )$$,
  '23514',
  'new row for relation "habit_schedules" violates check constraint "habit_schedules_weekday_is_valid"',
  'invalid weekdays are rejected'
);

select throws_ok(
  $$insert into public.habit_schedules (habit_id, owner_id, weekday)
    values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '11111111-1111-4111-8111-111111111111',
      1
    )$$,
  '23503',
  'insert or update on table "habit_schedules" violates foreign key constraint "habit_schedules_habit_owner_fk"',
  'a schedule owner must match the habit owner'
);

select results_eq(
  $$select distinct habit_id from public.habit_schedules$$,
  $$values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)$$,
  'a user can read only their own schedules'
);

select lives_ok(
  $$delete from public.habit_schedules
    where habit_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and weekday = 7$$,
  'a user can remove a weekday from their own schedule'
);

select is(
  (
    select count(*)
    from public.habit_schedules
    where habit_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  6::bigint,
  'selected-weekday schedules retain only their chosen days'
);

select throws_ok(
  $$insert into public.habits (owner_id, name, icon, color, display_order, start_date)
    values (
      '11111111-1111-4111-8111-111111111111',
      ' ',
      '⭐',
      'sun',
      1,
      '2026-08-06'
    )$$,
  '23514',
  'new row for relation "habits" violates check constraint "habits_name_is_valid"',
  'blank habit names are rejected'
);

select throws_ok(
  $$insert into public.habits (owner_id, name, icon, color, display_order, start_date)
    values (
      '11111111-1111-4111-8111-111111111111',
      'Invalid order',
      '⭐',
      'sun',
      -1,
      '2026-08-06'
    )$$,
  '23514',
  'new row for relation "habits" violates check constraint "habits_display_order_is_valid"',
  'negative display ordering is rejected'
);

select throws_ok(
  $$insert into public.habits (owner_id, name, icon, color, display_order, start_date)
    values (
      '11111111-1111-4111-8111-111111111111',
      'Invalid color',
      '⭐',
      'chartreuse',
      1,
      '2026-08-06'
    )$$,
  '23514',
  'new row for relation "habits" violates check constraint "habits_color_is_valid"',
  'unknown habit colors are rejected'
);

select has_index(
  'public',
  'habits',
  'habits_owner_order_idx',
  'habits has an owner/order query index'
);
select has_index(
  'public',
  'habit_schedules',
  'habit_schedules_owner_weekday_idx',
  'schedules has an owner/weekday query index'
);

select * from finish();

rollback;
