drop policy if exists "Enable insert for authenticated users only" on public.users;
drop policy if exists "Enable read access for all users" on public.users;
drop policy if exists "Enable update for users based on email" on public.users;
drop policy if exists "Public profiles are viewable by everyone" on public.users;
drop policy if exists "Users can update own profile" on public.users;

-- Rows are created only by the on_auth_user_created trigger, and the
-- owner may change only curation columns: github_username drives the
-- public profile lookup, so it must never be client-writable.
revoke all on public.users from anon, authenticated;
grant select on public.users to anon, authenticated;
grant update (excluded_github_repos, featured_github_prs) on public.users to authenticated;

create policy "Public profiles are viewable by everyone"
  on public.users for select
  using (true);

create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke execute on function public.handle_new_user() from public, anon, authenticated;
