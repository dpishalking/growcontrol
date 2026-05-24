-- Seed primary admin (runs as migration superuser, bypasses RLS).
insert into public.admin_users (user_id, email)
select id, email
from auth.users
where lower(email) = lower('d.pishalkin@gmail.com')
on conflict (user_id) do update
  set email = excluded.email;
