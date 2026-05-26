-- Telegram на уровне аккаунта: один набор чатов на пользователя, уведомления по всем проектам.

-- ─── Чаты пользователя ───────────────────────────────────────────────────────

create table if not exists public.user_telegram_chats (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  chat_id     text not null,
  chat_title  text,
  chat_type   text check (chat_type in ('private', 'group', 'supergroup', 'channel')),
  linked_by   uuid references auth.users(id) on delete set null,
  linked_at   timestamptz not null default now(),
  is_active   boolean not null default true,

  unique (user_id, chat_id)
);

create unique index if not exists idx_user_telegram_chats_active_chat
  on public.user_telegram_chats (chat_id)
  where is_active = true;

create index if not exists idx_user_telegram_chats_user
  on public.user_telegram_chats (user_id)
  where is_active = true;

alter table public.user_telegram_chats enable row level security;

create policy "owner read user telegram chats"
  on public.user_telegram_chats for select
  using (user_id = auth.uid());

create policy "owner unlink user telegram chats"
  on public.user_telegram_chats for update
  using (user_id = auth.uid());

create policy "admin read all user telegram chats"
  on public.user_telegram_chats for select
  using (public.is_admin());

-- Миграция данных из project_telegram_chats (по владельцу проекта)
insert into public.user_telegram_chats (user_id, chat_id, chat_title, chat_type, linked_by, linked_at, is_active)
select distinct on (p.user_id, c.chat_id)
  p.user_id,
  c.chat_id,
  c.chat_title,
  c.chat_type,
  c.linked_by,
  c.linked_at,
  c.is_active
from public.project_telegram_chats c
join public.projects p on p.id = c.project_id
where c.is_active = true
order by p.user_id, c.chat_id, c.linked_at desc
on conflict (user_id, chat_id) do update set
  chat_title = excluded.chat_title,
  chat_type  = excluded.chat_type,
  is_active  = true,
  linked_at  = greatest(public.user_telegram_chats.linked_at, excluded.linked_at);

-- Коды активации: project_id / app_id необязательны
alter table public.telegram_connect_codes
  alter column project_id drop not null;

alter table public.telegram_connect_codes
  alter column app_id drop not null;

-- ─── RPC: код активации (аккаунт) ────────────────────────────────────────────

create or replace function public.create_user_telegram_connect_code()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_code     text;
  v_expires  timestamptz := now() + interval '30 minutes';
  v_attempts int := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  update public.telegram_connect_codes
  set used_at = now()
  where user_id = v_user_id
    and used_at is null
    and expires_at > now();

  loop
    v_attempts := v_attempts + 1;
    if v_attempts > 20 then
      raise exception 'failed to generate code';
    end if;
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.telegram_connect_codes where code = v_code);
  end loop;

  insert into public.telegram_connect_codes (code, user_id, expires_at)
  values (v_code, v_user_id, v_expires);

  return jsonb_build_object('code', v_code, 'expires_at', v_expires);
end;
$$;

revoke execute on function public.create_user_telegram_connect_code() from public;
grant  execute on function public.create_user_telegram_connect_code() to authenticated;

-- ─── RPC: список чатов аккаунта ─────────────────────────────────────────────

create or replace function public.get_user_telegram_chats()
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
    from public.user_telegram_chats c
    where c.user_id = v_user_id
      and c.is_active = true
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.get_user_telegram_chats() from public;
grant  execute on function public.get_user_telegram_chats() to authenticated;

-- ─── RPC: отвязать чат (из приложения) ──────────────────────────────────────

create or replace function public.unlink_user_telegram_chat(p_chat_id text)
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

  update public.user_telegram_chats
  set is_active = false
  where user_id = v_user_id
    and chat_id = p_chat_id
    and is_active = true;
end;
$$;

revoke execute on function public.unlink_user_telegram_chat(text) from public;
grant  execute on function public.unlink_user_telegram_chat(text) to authenticated;

-- ─── RPC: chat_ids для cron / service role ───────────────────────────────────

create or replace function public.get_telegram_chats_for_user(p_user_id uuid)
returns text[]
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(array_agg(c.chat_id), '{}')
  from public.user_telegram_chats c
  where c.user_id = p_user_id
    and c.is_active = true;
$$;

revoke execute on function public.get_telegram_chats_for_user(uuid) from public;
grant  execute on function public.get_telegram_chats_for_user(uuid) to service_role;

-- ─── RPC: привязать чат по коду (webhook) ────────────────────────────────────

create or replace function public.link_telegram_chat_by_code(
  p_code             text,
  p_chat_id          text,
  p_chat_title       text default null,
  p_chat_type        text default null,
  p_telegram_user_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row      public.telegram_connect_codes%rowtype;
  v_existing public.user_telegram_chats%rowtype;
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

  select * into v_existing
  from public.user_telegram_chats
  where chat_id = p_chat_id
    and is_active = true
    and user_id <> v_row.user_id
  limit 1;

  if v_existing.id is not null then
    raise exception 'chat_already_linked';
  end if;

  insert into public.user_telegram_chats (
    user_id, chat_id, chat_title, chat_type, linked_by
  )
  values (
    v_row.user_id,
    p_chat_id,
    nullif(p_chat_title, ''),
    nullif(p_chat_type, ''),
    v_row.user_id
  )
  on conflict (user_id, chat_id)
  do update set
    chat_title = excluded.chat_title,
    chat_type  = excluded.chat_type,
    is_active  = true,
    linked_at  = now();

  return jsonb_build_object(
    'user_id', v_row.user_id,
    'chat_id', p_chat_id,
    'chat_type', nullif(p_chat_type, '')
  );
end;
$$;

-- ─── RPC: отвязать чат из Telegram (webhook) ─────────────────────────────────

create or replace function public.unlink_telegram_chat_by_id(p_chat_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unlinked boolean := false;
begin
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

-- ─── RPC: статус чата (webhook) ──────────────────────────────────────────────

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
      'linked_at', c.linked_at
    )
    from public.user_telegram_chats c
    where c.chat_id = p_chat_id
      and c.is_active = true
    limit 1
  ), jsonb_build_object('linked', false));
end;
$$;

-- Обратная совместимость: project RPC → user chats владельца
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

  if not exists (
    select 1 from public.projects p
    where p.app_id = p_app_id and p.user_id = v_user_id
  ) then
    raise exception 'project not found';
  end if;

  return public.get_user_telegram_chats();
end;
$$;

-- Дедлайны: добавить owner_user_id
drop function if exists public.get_experiments_for_telegram_reminders();

create or replace function public.get_experiments_for_telegram_reminders()
returns table (
  experiment_id     uuid,
  experiment_app_id text,
  project_app_id    text,
  project_name      text,
  owner_user_id     uuid,
  hypothesis_title  text,
  owner             text,
  end_date          timestamptz,
  reminder_kind     text
)
language sql
security definer
set search_path = public
stable
as $$
  with candidates as (
    select
      e.id as experiment_id,
      e.app_id as experiment_app_id,
      p.app_id as project_app_id,
      p.name as project_name,
      p.user_id as owner_user_id,
      coalesce(h.title, 'Тест') as hypothesis_title,
      e.owner,
      e.end_date,
      case
        when e.end_date::date = (current_date + 1) then 'day_before'
        when e.end_date::date = current_date then 'due_day'
        when e.end_date::date < current_date
          and e.end_date::date >= (current_date - 7) then 'overdue'
      end as reminder_kind
    from public.experiments e
    join public.projects p on p.id = e.project_id
    left join public.hypotheses h on h.id = e.hypothesis_id
    where e.status = 'active'
      and e.end_date is not null
  )
  select c.*
  from candidates c
  where c.reminder_kind is not null
    and not exists (
      select 1
      from public.experiment_telegram_reminders r
      where r.experiment_id = c.experiment_id
        and r.reminder_kind = c.reminder_kind
    );
$$;

revoke execute on function public.get_experiments_for_telegram_reminders() from public;
grant execute on function public.get_experiments_for_telegram_reminders() to service_role;
