begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

select has_table('public', 'completions', 'completions table exists');
select col_is_pk(
  'public',
  'completions',
  'id',
  'completions.id is the primary key'
);
select col_not_null(
  'public',
  'completions',
  'habit_id',
  'completion habit is required'
);
select col_not_null(
  'public',
  'completions',
  'owner_id',
  'completion owner is required'
);
select col_not_null(
  'public',
  'completions',
  'local_date',
  'completion local date is required'
);
select col_type_is(
  'public',
  'completions',
  'local_date',
  'date',
  'completion local date is stored without a time zone'
);
select col_not_null(
  'public',
  'completions',
  'created_at',
  'completion creation timestamp is required'
);
select col_type_is(
  'public',
  'completions',
  'created_at',
  'timestamp with time zone',
  'completion audit timestamp is stored in UTC-capable form'
);
select is(
  (
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.completions'::regclass
  ),
  true,
  'row-level security is enabled for completions'
);
select policies_are(
  'public',
  'completions',
  array[
    'Users can create their own completions',
    'Users can delete their own completions',
    'Users can read their own completions'
  ],
  'completions has only the intended ownership policies'
);
select has_index(
  'public',
  'completions',
  'completions_habit_local_date_unique',
  'habit and local date have a unique index'
);
select has_index(
  'public',
  'completions',
  'completions_owner_date_idx',
  'owner and date range queries have an index'
);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'completion-one@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'completion-two@example.test');

insert into public.habits (
  id,
  owner_id,
  name,
  icon,
  color,
  display_order,
  start_date
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'Morning walk',
    '🚶',
    'fern',
    0,
    '2026-08-10'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'Private habit',
    '🔒',
    'plum',
    0,
    '2026-08-10'
  );

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select lives_ok(
  $$insert into public.completions (id, habit_id, owner_id, local_date)
    values (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      '2026-08-10'
    )$$,
  'a user can complete their own habit for a local date'
);

select is(
  (
    select local_date
    from public.completions
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ),
  '2026-08-10'::date,
  'the local calendar date is retained exactly'
);

select throws_ok(
  $$insert into public.completions (habit_id, owner_id, local_date)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      '2026-08-10'
    )$$,
  '23505',
  'duplicate key value violates unique constraint "completions_habit_local_date_unique"',
  'a habit cannot be completed twice on the same local date'
);

select throws_ok(
  $$insert into public.completions (habit_id, owner_id, local_date)
    values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '11111111-1111-4111-8111-111111111111',
      '2026-08-10'
    )$$,
  '23503',
  'insert or update on table "completions" violates foreign key constraint "completions_habit_owner_fk"',
  'a completion owner must match the habit owner'
);

select throws_ok(
  $$insert into public.completions (habit_id, owner_id, local_date)
    values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '22222222-2222-4222-8222-222222222222',
      '2026-08-10'
    )$$,
  '42501',
  'new row violates row-level security policy for table "completions"',
  'a user cannot create a completion for another owner'
);

reset role;
insert into public.completions (id, habit_id, owner_id, local_date)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '22222222-2222-4222-8222-222222222222',
  '2026-08-10'
);
set local role authenticated;

select results_eq(
  $$select id from public.completions order by id$$,
  $$values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid)$$,
  'a user can read only their own completions'
);

select results_eq(
  $$delete from public.completions
    where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
    returning id$$,
  $$select null::uuid where false$$,
  'a user cannot delete another owner''s completion'
);

select throws_ok(
  $$update public.completions
    set local_date = '2026-08-11'
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  '42501',
  'permission denied for table completions',
  'authenticated clients cannot mutate completion records'
);

select lives_ok(
  $$update public.habits
    set name = 'Evening walk', archived_at = now()
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'a user can edit and archive the completed habit'
);

select is(
  (
    select count(*)
    from public.completions
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ),
  1::bigint,
  'completion history survives habit edits and archiving'
);

select lives_ok(
  $$delete from public.completions
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  'a user can uncheck their own completion by deleting it'
);

select is(
  (
    select count(*)
    from public.completions
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ),
  0::bigint,
  'unchecking removes the completion row'
);

select * from finish();

rollback;
