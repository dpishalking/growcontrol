-- Telegram снова привязан к проекту: код и чаты per project, не с главной.

create or replace function public.get_project_telegram_chats(p_app_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'chat_id', c.chat_id,
        'chat_title', c.chat_title,
        'chat_type', c.chat_type,
        'linked_at', c.linked_at
      )
      order by c.linked_at desc
    )
    from public.project_telegram_chats c
    join public.projects p on p.id = c.project_id
    where p.app_id = p_app_id
      and p.user_id = v_user_id
      and c.is_active = true
  ), '[]'::jsonb);
end;
$$;

create or replace function public.link_telegram_chat_by_code(
  p_code       text,
  p_chat_id    text,
  p_chat_title text default null,
  p_chat_type  text default null,
  p_telegram_user_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row        public.telegram_connect_codes%rowtype;
  v_project    public.projects%rowtype;
  v_existing   public.project_telegram_chats%rowtype;
begin
  if p_code is null or p_code = '' or p_chat_id is null or p_chat_id = '' then
    raise exception 'code and chat_id are required';
  end if;

  select * into v_row
  from public.telegram_connect_codes
  where upper(code) = upper(trim(p_code))
    and used_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if v_row.id is null then
    raise exception 'invalid_or_expired_code';
  end if;

  if v_row.project_id is null or v_row.app_id is null then
    raise exception 'invalid_or_expired_code';
  end if;

  select * into v_project
  from public.projects
  where id = v_row.project_id;

  select * into v_existing
  from public.project_telegram_chats
  where chat_id = p_chat_id
    and is_active = true
    and project_id <> v_row.project_id
  limit 1;

  if v_existing.id is not null then
    raise exception 'chat_already_linked';
  end if;

  update public.telegram_connect_codes
  set used_at = now()
  where id = v_row.id;

  insert into public.project_telegram_chats (
    project_id, app_id, chat_id, chat_title, chat_type, linked_by
  )
  values (
    v_row.project_id,
    v_row.app_id,
    p_chat_id,
    nullif(p_chat_title, ''),
    nullif(p_chat_type, ''),
    v_row.user_id
  )
  on conflict (project_id, chat_id)
  do update set
    chat_title = excluded.chat_title,
    chat_type  = excluded.chat_type,
    is_active  = true,
    linked_at  = now();

  return jsonb_build_object(
    'project_name', v_project.name,
    'app_id', v_row.app_id,
    'chat_id', p_chat_id
  );
end;
$$;

create or replace function public.get_telegram_chat_status(p_chat_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_build_object(
      'linked', true,
      'linked_at', c.linked_at,
      'project_name', p.name
    )
    from public.project_telegram_chats c
    join public.projects p on p.id = c.project_id
    where c.chat_id = p_chat_id
      and c.is_active = true
    order by c.linked_at desc
    limit 1
  ), jsonb_build_object('linked', false));
end;
$$;

create or replace function public.unlink_telegram_chat_by_id(p_chat_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unlinked boolean := false;
begin
  update public.project_telegram_chats
  set is_active = false
  where chat_id = p_chat_id
    and is_active = true;

  if found then
    v_unlinked := true;
  end if;

  update public.user_telegram_chats
  set is_active = false
  where chat_id = p_chat_id
    and is_active = true;

  if found then
    v_unlinked := true;
  end if;

  return jsonb_build_object('unlinked', v_unlinked);
end;
$$;

create or replace function public.get_telegram_chats_for_project(p_app_id text)
returns text[]
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(array_agg(c.chat_id), '{}')
  from public.project_telegram_chats c
  where c.app_id = p_app_id
    and c.is_active = true;
$$;
