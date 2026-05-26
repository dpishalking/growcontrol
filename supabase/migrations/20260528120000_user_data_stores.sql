-- Полный снимок данных приложения на пользователя (кросс-устройственная синхронизация).

create table if not exists public.user_data_stores (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  store      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data_stores enable row level security;

create policy "owner read own data store"
  on public.user_data_stores for select
  using (user_id = auth.uid());

create policy "owner write own data store"
  on public.user_data_stores for insert
  with check (user_id = auth.uid());

create policy "owner update own data store"
  on public.user_data_stores for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "admin read all data stores"
  on public.user_data_stores for select
  using (public.is_admin());

-- ─── RPC: загрузить store ────────────────────────────────────────────────────

create or replace function public.get_user_data_store()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select store
  from public.user_data_stores
  where user_id = auth.uid();
$$;

revoke execute on function public.get_user_data_store() from public;
grant execute on function public.get_user_data_store() to authenticated;

-- ─── RPC: сохранить store ────────────────────────────────────────────────────

create or replace function public.upsert_user_data_store(p_store jsonb)
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

  if p_store is null or jsonb_typeof(p_store) <> 'object' then
    raise exception 'invalid store payload';
  end if;

  insert into public.user_data_stores (user_id, store, updated_at)
  values (v_user_id, p_store, now())
  on conflict (user_id) do update set
    store = excluded.store,
    updated_at = excluded.updated_at;
end;
$$;

revoke execute on function public.upsert_user_data_store(jsonb) from public;
grant execute on function public.upsert_user_data_store(jsonb) to authenticated;
