begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

select has_table('public', 'profiles', 'profiles table exists');
select col_is_pk('public', 'profiles', 'id', 'profiles.id is the primary key');
select col_type_is('public', 'profiles', 'id', 'uuid', 'profiles.id is a UUID');
select col_not_null('public', 'profiles', 'time_zone', 'time_zone is required');
select col_type_is(
  'public',
  'profiles',
  'time_zone_confirmed_at',
  'timestamp with time zone',
  'time-zone confirmation is stored as a timestamp'
);
select col_not_null('public', 'profiles', 'created_at', 'created_at is required');
select col_not_null('public', 'profiles', 'updated_at', 'updated_at is required');

select is(
  (
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.profiles'::regclass
  ),
  true,
  'row-level security is enabled'
);

select policies_are(
  'public',
  'profiles',
  array[
    'Users can read their own profile',
    'Users can update their own profile'
  ],
  'profiles has only the intended ownership policies'
);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'profile-one@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'profile-two@example.test');

select is(
  (
    select count(*)
    from public.profiles
    where id in (
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222'
    )
  ),
  2::bigint,
  'an Auth insert creates exactly one profile per user'
);

select is(
  (
    select time_zone
    from public.profiles
    where id = '11111111-1111-4111-8111-111111111111'
  ),
  'UTC',
  'new profiles default to UTC'
);

select ok(
  (
    select time_zone_confirmed_at is null
    from public.profiles
    where id = '11111111-1111-4111-8111-111111111111'
  ),
  'new profiles require explicit time-zone confirmation'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  $$select id from public.profiles order by id$$,
  $$values ('11111111-1111-4111-8111-111111111111'::uuid)$$,
  'a user can read only their own profile'
);

select lives_ok(
  $$update public.profiles set time_zone = 'America/New_York', time_zone_confirmed_at = now() where id = '11111111-1111-4111-8111-111111111111'$$,
  'a user can update their own time zone'
);

select ok(
  (
    select time_zone_confirmed_at is not null
    from public.profiles
    where id = '11111111-1111-4111-8111-111111111111'
  ),
  'confirming a time zone records completion of onboarding'
);

select results_eq(
  $$update public.profiles set time_zone = 'America/Chicago' where id = '22222222-2222-4222-8222-222222222222' returning id$$,
  $$select null::uuid where false$$,
  'a user cannot update another profile'
);

select throws_ok(
  $$update public.profiles set time_zone = 'Not/A_Time_Zone' where id = '11111111-1111-4111-8111-111111111111'$$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_time_zone_is_valid"',
  'invalid time zones are rejected by the database'
);

select throws_ok(
  $$insert into public.profiles (id) values ('33333333-3333-4333-8333-333333333333')$$,
  '42501',
  'permission denied for table profiles',
  'authenticated clients cannot insert profiles directly'
);

select throws_ok(
  $$delete from public.profiles where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  'permission denied for table profiles',
  'authenticated clients cannot delete profiles'
);

select * from finish();

rollback;
