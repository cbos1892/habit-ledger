begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

select has_function('public', 'move_habit', array['uuid', 'text']);
select has_function('public', 'archive_habit', array['uuid']);
select has_function('public', 'restore_habit', array['uuid']);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'management-one@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'management-two@example.test');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

insert into public.habits (id, owner_id, name, icon, color, display_order, start_date)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', (select auth.uid()), 'First', '1️⃣', 'fern', 10, '2026-08-10'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', (select auth.uid()), 'Second', '2️⃣', 'ocean', 20, '2026-08-10'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', (select auth.uid()), 'Third', '3️⃣', 'sun', 30, '2026-08-10');

select lives_ok(
  $$select public.move_habit('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'up')$$,
  'an active habit moves up'
);
select results_eq(
  $$select name from public.habits where archived_at is null order by display_order$$,
  $$values ('Second'::text), ('First'::text), ('Third'::text)$$,
  'moving rewrites active habits in the requested order'
);
select results_eq(
  $$select display_order from public.habits where archived_at is null order by display_order$$,
  $$values (0), (1), (2)$$,
  'moving normalizes positions'
);
select lives_ok(
  $$select public.move_habit('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'up')$$,
  'moving the first habit up is a safe no-op'
);
select throws_ok(
  $$select public.move_habit('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'sideways')$$,
  '22023',
  'Direction must be up or down'
);

update public.habits
set display_order = 1
where id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
);

select lives_ok(
  $$select public.move_habit('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'up')$$,
  'a move remains deterministic when existing positions collide'
);
select results_eq(
  $$select name from public.habits where archived_at is null order by display_order$$,
  $$values ('Second'::text), ('Third'::text), ('First'::text)$$,
  'the requested habit moves relative to the stable id tie-breaker'
);
select results_eq(
  $$select display_order from public.habits where archived_at is null order by display_order$$,
  $$values (0), (1), (2)$$,
  'moving repairs colliding positions into a dense sequence'
);

insert into public.habit_schedules (habit_id, owner_id, weekday)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', (select auth.uid()), 1);
insert into public.completions (habit_id, owner_id, local_date)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', (select auth.uid()), '2026-08-10');

select lives_ok(
  $$select public.archive_habit('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  'an active habit can be archived'
);
select ok(
  (select archived_at is not null from public.habits where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'archive records a timestamp'
);
select is(
  (select count(*) from public.habit_schedules where habit_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  1::bigint,
  'archive retains the schedule'
);
select is(
  (select count(*) from public.completions where habit_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  1::bigint,
  'archive retains completion history'
);
select results_eq(
  $$select display_order from public.habits where archived_at is null order by display_order$$,
  $$values (0), (1)$$,
  'archive normalizes remaining active positions'
);
select lives_ok(
  $$select public.restore_habit('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  'an archived habit can be restored'
);
select results_eq(
  $$select name from public.habits where archived_at is null order by display_order$$,
  $$values ('Second'::text), ('Third'::text), ('First'::text)$$,
  'restore appends the habit to the active list'
);

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

select throws_ok(
  $$select public.archive_habit('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  'P0002',
  'Active habit not found',
  'a user cannot archive another owner''s habit'
);

select throws_ok(
  $$select public.restore_habit('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  'P0002',
  'Archived habit not found',
  'a user cannot restore another owner''s habit'
);

select throws_ok(
  $$select public.move_habit('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'down')$$,
  'P0002',
  'Active habit not found',
  'a user cannot move another owner''s habit'
);

select * from finish();

rollback;
