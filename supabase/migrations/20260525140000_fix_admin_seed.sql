-- Re-link admin after auth signup (seed may have run before user existed).

insert into public.admin_users (user_id, email)
select id, email
from auth.users
where lower(email) = lower('d.pishalkin@gmail.com')
on conflict (user_id) do update
  set email = excluded.email;

-- Ensure authenticated role can read tables protected by admin RLS policies.
grant select on public.profiles to authenticated;
grant select on public.projects to authenticated;
grant select on public.hypotheses to authenticated;
grant select on public.project_events to authenticated;
grant select on public.admin_users to authenticated;

-- Admins can verify their own admin row (for debugging in client).
drop policy if exists "Admins read own admin row" on public.admin_users;
create policy "Admins read own admin row"
  on public.admin_users for select
  using (user_id = auth.uid());
