begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

select has_function(
  'public',
  'create_habit_with_schedule',
  array['text', 'text', 'text', 'date', 'smallint[]'],
  'the atomic create mutation exists'
);
select has_function(
  'public',
  'update_habit_with_schedule',
  array['uuid', 'text', 'text', 'text', 'date', 'smallint[]'],
  'the atomic update mutation exists'
);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'schedule-one@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'schedule-two@example.test');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select lives_ok(
  $$select public.create_habit_with_schedule(
    'Morning walk',
    '🚶',
    'fern',
    '2026-08-10',
    array[1, 3, 5]::smallint[]
  )$$,
  'a habit and selected-weekday schedule are created together'
);

select is(
  (select count(*) from public.habits),
  1::bigint,
  'the create mutation inserts one habit'
);
select results_eq(
  $$select weekday from public.habit_schedules order by weekday$$,
  $$values (1::smallint), (3::smallint), (5::smallint)$$,
  'the create mutation persists the complete selected schedule'
);

insert into public.completions (habit_id, owner_id, local_date)
select id, owner_id, '2026-08-10'
from public.habits;

select lives_ok(
  $$select public.update_habit_with_schedule(
    (select id from public.habits limit 1),
    'Morning run',
    '🏃',
    'ocean',
    '2026-08-11',
    array[2, 4, 6]::smallint[]
  )$$,
  'habit identity and schedule can be replaced together'
);
select results_eq(
  $$select weekday from public.habit_schedules order by weekday$$,
  $$values (2::smallint), (4::smallint), (6::smallint)$$,
  'the update mutation replaces all prior schedule rows'
);
select is(
  (select count(*) from public.completions where local_date = '2026-08-10'),
  1::bigint,
  'schedule changes retain recorded completion dates'
);

select throws_ok(
  $$select public.update_habit_with_schedule(
    (select id from public.habits limit 1),
    'Should roll back',
    '⭐',
    'sun',
    '2026-08-12',
    array[]::smallint[]
  )$$,
  '22023',
  'At least one valid ISO weekday is required',
  'an empty schedule is rejected before any update'
);
select is(
  (select name from public.habits limit 1),
  'Morning run',
  'a rejected schedule leaves habit identity unchanged'
);

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

select throws_ok(
  $$select public.update_habit_with_schedule(
    (select id from public.habits limit 1),
    'Not mine',
    '🔒',
    'plum',
    '2026-08-12',
    array[1]::smallint[]
  )$$,
  'P0002',
  'Active habit not found',
  'a user cannot update another owner''s habit or schedule'
);

select * from finish();

rollback;
