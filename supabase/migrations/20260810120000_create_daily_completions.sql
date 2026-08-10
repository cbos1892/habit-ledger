-- A completion represents the checked state of one habit on one local
-- calendar date. Rows are immutable for authenticated clients: checking a
-- habit inserts a row, and unchecking it deletes that row.
create table public.completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  owner_id uuid not null,
  local_date date not null,
  created_at timestamptz not null default now(),
  constraint completions_habit_owner_fk
    foreign key (habit_id, owner_id)
    references public.habits (id, owner_id)
    on delete cascade,
  constraint completions_habit_local_date_unique unique (habit_id, local_date)
);

comment on table public.completions is
  'One completed state per habit and local calendar date. Unchecking deletes the row.';
comment on column public.completions.owner_id is
  'The immutable owner copied from the related habit and enforced by a composite foreign key.';
comment on column public.completions.local_date is
  'The owner-local calendar date represented independently from the UTC audit timestamp.';
comment on column public.completions.created_at is
  'The UTC audit timestamp at which the completion was recorded.';

create index completions_owner_date_idx
on public.completions (owner_id, local_date, habit_id);

alter table public.completions enable row level security;

revoke all on table public.completions from anon, authenticated;
grant select, insert, delete on table public.completions to authenticated;
grant select, insert, update, delete on table public.completions to service_role;

create policy "Users can read their own completions"
on public.completions
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can create their own completions"
on public.completions
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own completions"
on public.completions
for delete
to authenticated
using ((select auth.uid()) = owner_id);
