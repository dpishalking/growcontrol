-- Mirror app hypotheses into public.hypotheses for admin visibility.

alter table public.hypotheses
  add column if not exists app_id text;

create unique index if not exists idx_hypotheses_project_app_id
  on public.hypotheses (project_id, app_id)
  where app_id is not null;

create or replace function public.sync_app_hypotheses(
  p_app_id text,
  p_hypotheses jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_project_id uuid;
  v_item jsonb;
  v_app_hyp_id text;
  v_keep_ids text[] := '{}';
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select id into v_project_id
  from public.projects
  where user_id = v_user_id
    and app_id = p_app_id;

  if v_project_id is null then
    return;
  end if;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_hypotheses, '[]'::jsonb))
  loop
    v_app_hyp_id := v_item->>'app_id';
    if v_app_hyp_id is null or v_app_hyp_id = '' then
      continue;
    end if;

    v_keep_ids := array_append(v_keep_ids, v_app_hyp_id);

    insert into public.hypotheses (
      project_id,
      app_id,
      title,
      description,
      status,
      priority,
      expected_impact
    )
    values (
      v_project_id,
      v_app_hyp_id,
      coalesce(nullif(v_item->>'title', ''), 'Без названия'),
      nullif(v_item->>'description', ''),
      coalesce(nullif(v_item->>'status', ''), 'new'),
      coalesce(nullif(v_item->>'priority', ''), 'medium'),
      nullif(v_item->>'expected_impact', '')
    )
    on conflict (project_id, app_id) where app_id is not null
    do update set
      title = excluded.title,
      description = excluded.description,
      status = excluded.status,
      priority = excluded.priority,
      expected_impact = excluded.expected_impact,
      updated_at = now();
  end loop;

  delete from public.hypotheses h
  where h.project_id = v_project_id
    and h.app_id is not null
    and not (h.app_id = any(v_keep_ids));
end;
$$;

revoke execute on function public.sync_app_hypotheses(text, jsonb) from public;
grant execute on function public.sync_app_hypotheses(text, jsonb) to authenticated;
