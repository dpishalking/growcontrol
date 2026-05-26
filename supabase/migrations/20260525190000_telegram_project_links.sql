-- Привязка Telegram-чатов к проектам (multi-tenant).
-- Один бот GrowControl → много клиентских чатов, каждый видит только свой проект.

-- ─── Временные коды активации ───────────────────────────────────────────────

create table if not exists public.telegram_connect_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  project_id  uuid not null references public.projects(id) on delete cascade,
  app_id      text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_telegram_connect_codes_app_id
  on public.telegram_connect_codes (app_id, expires_at desc);

-- ─── Привязанные чаты ─────────────────────────────────────────────────────────

create table if not exists public.project_telegram_chats (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  app_id      text not null,
  chat_id     text not null,
  chat_title  text,
  chat_type   text check (chat_type in ('private', 'group', 'supergroup', 'channel')),
  linked_by   uuid references auth.users(id) on delete set null,
  linked_at   timestamptz not null default now(),
  is_active   boolean not null default true,

  unique (project_id, chat_id)
);

create index if not exists idx_project_telegram_chats_app_id
  on public.project_telegram_chats (app_id)
  where is_active = true;

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table public.telegram_connect_codes enable row level security;
alter table public.project_telegram_chats enable row level security;

create policy "owner manage connect codes"
  on public.telegram_connect_codes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "owner read linked chats"
  on public.project_telegram_chats for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_telegram_chats.project_id
        and p.user_id = auth.uid()
    )
  );

create policy "owner unlink chats"
  on public.project_telegram_chats for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_telegram_chats.project_id
        and p.user_id = auth.uid()
    )
  );

create policy "admin read all telegram chats"
  on public.project_telegram_chats for select
  using (public.is_admin());

-- ─── RPC: создать код активации (из приложения) ─────────────────────────────

create or replace function public.create_telegram_connect_code(p_app_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid := auth.uid();
  v_project_id uuid;
  v_code       text;
  v_expires    timestamptz := now() + interval '30 minutes';
  v_attempts   int := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select id into v_project_id
  from public.projects
  where user_id = v_user_id
    and app_id = p_app_id;

  if v_project_id is null then
    raise exception 'project not found';
  end if;

  -- Инвалидируем старые неиспользованные коды для этого проекта
  update public.telegram_connect_codes
  set used_at = now()
  where project_id = v_project_id
    and used_at is null
    and expires_at > now();

  -- Генерируем уникальный 6-символьный код
  loop
    v_attempts := v_attempts + 1;
    if v_attempts > 20 then
      raise exception 'failed to generate code';
    end if;
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.telegram_connect_codes where code = v_code);
  end loop;

  insert into public.telegram_connect_codes (code, project_id, app_id, user_id, expires_at)
  values (v_code, v_project_id, p_app_id, v_user_id, v_expires);

  return jsonb_build_object(
    'code', v_code,
    'expires_at', v_expires
  );
end;
$$;

revoke execute on function public.create_telegram_connect_code(text) from public;
grant  execute on function public.create_telegram_connect_code(text) to authenticated;

-- ─── RPC: список привязанных чатов ──────────────────────────────────────────

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

revoke execute on function public.get_project_telegram_chats(text) from public;
grant  execute on function public.get_project_telegram_chats(text) to authenticated;

-- ─── RPC: отвязать чат (из приложения) ──────────────────────────────────────

create or replace function public.unlink_project_telegram_chat(
  p_app_id  text,
  p_chat_id text
)
returns void
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

  update public.project_telegram_chats c
  set is_active = false
  from public.projects p
  where c.project_id = p.id
    and p.app_id = p_app_id
    and p.user_id = v_user_id
    and c.chat_id = p_chat_id
    and c.is_active = true;
end;
$$;

revoke execute on function public.unlink_project_telegram_chat(text, text) from public;
grant  execute on function public.unlink_project_telegram_chat(text, text) to authenticated;

-- ─── RPC: привязать чат по коду (вызывается webhook-ом с service role) ───────

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

  -- Помечаем код использованным
  update public.telegram_connect_codes
  set used_at = now()
  where id = v_row.id;

  -- Upsert привязки
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

revoke execute on function public.link_telegram_chat_by_code(text, text, text, text, text) from public;
grant  execute on function public.link_telegram_chat_by_code(text, text, text, text, text) to service_role;

-- ─── RPC: отвязать чат из Telegram (webhook) ────────────────────────────────

create or replace function public.unlink_telegram_chat_by_id(p_chat_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_name text;
begin
  update public.project_telegram_chats c
  set is_active = false
  from public.projects p
  where c.project_id = p.id
    and c.chat_id = p_chat_id
    and c.is_active = true
  returning p.name into v_project_name;

  if v_project_name is null then
    return jsonb_build_object('unlinked', false);
  end if;

  return jsonb_build_object('unlinked', true, 'project_name', v_project_name);
end;
$$;

revoke execute on function public.unlink_telegram_chat_by_id(text) from public;
grant  execute on function public.unlink_telegram_chat_by_id(text) to service_role;

-- ─── RPC: статус чата (webhook) ───────────────────────────────────────────────

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
      'project_name', p.name,
      'app_id', c.app_id,
      'linked_at', c.linked_at
    )
    from public.project_telegram_chats c
    join public.projects p on p.id = c.project_id
    where c.chat_id = p_chat_id
      and c.is_active = true
    limit 1
  ), jsonb_build_object('linked', false));
end;
$$;

revoke execute on function public.get_telegram_chat_status(text) from public;
grant  execute on function public.get_telegram_chat_status(text) to service_role;

-- ─── RPC: chat_ids для уведомлений (service role) ───────────────────────────

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

revoke execute on function public.get_telegram_chats_for_project(text) from public;
grant  execute on function public.get_telegram_chats_for_project(text) to service_role;
