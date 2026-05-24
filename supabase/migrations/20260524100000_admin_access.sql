-- Admin role check + RLS policies allowing admin read across users.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create policy "Admins manage admin_users"
  on public.admin_users for all
  using (
    exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  );

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = uid);
$$;

revoke execute on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- Admin read across profiles / projects / hypotheses (write — still owner only).
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "Admins read all projects" on public.projects;
create policy "Admins read all projects"
  on public.projects for select
  using (public.is_admin());

drop policy if exists "Admins read all hypotheses" on public.hypotheses;
create policy "Admins read all hypotheses"
  on public.hypotheses for select
  using (public.is_admin());
