-- Admin dashboard: project sync fields, activity read, invite RPC hook.

alter table public.projects
  add column if not exists app_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists idx_projects_user_app_id
  on public.projects (user_id, app_id)
  where app_id is not null;

drop policy if exists "Admins read all project events" on public.project_events;
create policy "Admins read all project events"
  on public.project_events for select
  using (public.is_admin());

-- Upsert project mirror from app (owner only).
create or replace function public.sync_app_project(
  p_app_id text,
  p_name text,
  p_description text default null,
  p_website_url text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_project_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.projects (
    user_id,
    app_id,
    name,
    description,
    website_url,
    metadata,
    last_activity_at
  )
  values (
    v_user_id,
    p_app_id,
    p_name,
    p_description,
    p_website_url,
    coalesce(p_metadata, '{}'::jsonb),
    now()
  )
  on conflict (user_id, app_id)
  do update set
    name = excluded.name,
    description = excluded.description,
    website_url = excluded.website_url,
    metadata = excluded.metadata,
    last_activity_at = now(),
    updated_at = now()
  returning id into v_project_id;

  return v_project_id;
end;
$$;

revoke execute on function public.sync_app_project(text, text, text, text, jsonb) from public;
grant execute on function public.sync_app_project(text, text, text, text, jsonb) to authenticated;
