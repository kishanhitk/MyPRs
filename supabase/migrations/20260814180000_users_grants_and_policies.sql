-- Capture the users-table access rules that previously existed only as
-- dashboard-managed state in production. Without these, a fresh local
-- stack fails every profile query with 42501 (permission denied).

alter table public.users enable row level security;

grant select on public.users to anon, authenticated;
grant update on public.users to authenticated;
grant all on public.users to service_role;

drop policy if exists "Public profiles are viewable by everyone" on public.users;
create policy "Public profiles are viewable by everyone"
  on public.users for select
  using (true);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
