-- Код активации можно использовать для нескольких чатов одного проекта
-- (личный + командный), пока не истёк срок или не сгенерирован новый код.

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

  select * into v_project
  from public.projects
  where id = v_row.project_id;

  -- Чат уже привязан к другому проекту?
  select * into v_existing
  from public.project_telegram_chats
  where chat_id = p_chat_id
    and is_active = true
    and project_id <> v_row.project_id
  limit 1;

  if v_existing.id is not null then
    raise exception 'chat_already_linked';
  end if;

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
    'chat_id', p_chat_id,
    'chat_type', nullif(p_chat_type, '')
  );
end;
$$;

revoke execute on function public.link_telegram_chat_by_code(text, text, text, text, text) from public;
grant  execute on function public.link_telegram_chat_by_code(text, text, text, text, text) to service_role;
