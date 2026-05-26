-- Таблица экспериментов для Supabase-зеркала (admin-видимость + scheduled reminders).
-- Богатая модель хранится в localStorage; здесь — плоское зеркало для бота и дайджестов.

create table if not exists public.experiments (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  hypothesis_id uuid references public.hypotheses(id) on delete set null,

  -- app-side ids для upsert
  app_id         text not null,
  app_hyp_id     text,

  owner          text,
  start_date     timestamptz,
  end_date       timestamptz,
  budget         text,
  status         text not null default 'active'
                   check (status in ('active', 'finished', 'cancelled')),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Уникальный ключ per project
create unique index if not exists idx_experiments_project_app_id
  on public.experiments (project_id, app_id);

-- Быстрый поиск активных тестов с дедлайном для напоминаний
create index if not exists idx_experiments_end_date_status
  on public.experiments (end_date, status)
  where status = 'active';

-- RLS
alter table public.experiments enable row level security;

-- Владелец видит свои (через проект)
create policy "owner can read experiments"
  on public.experiments for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = experiments.project_id
        and p.user_id = auth.uid()
    )
  );

-- Владелец может менять через sync-функцию (SECURITY DEFINER)
create policy "owner can manage experiments"
  on public.experiments for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = experiments.project_id
        and p.user_id = auth.uid()
    )
  );

-- Admins read all
create policy "admin read all experiments"
  on public.experiments for select
  using (public.is_admin());

-- Триггер updated_at
create trigger experiments_updated_at
  before update on public.experiments
  for each row execute function public.set_updated_at();

-- ─── RPC: upsert эксперимента из приложения ────────────────────────────────

create or replace function public.sync_app_experiment(
  p_app_project_id text,
  p_experiment     jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_project_id  uuid;
  v_hyp_id      uuid;
  v_app_id      text := p_experiment->>'app_id';
  v_app_hyp_id  text := p_experiment->>'app_hyp_id';
  v_status      text := coalesce(nullif(p_experiment->>'status', ''), 'active');
  v_owner       text := nullif(p_experiment->>'owner', '');
  v_start_date  timestamptz;
  v_end_date    timestamptz;
  v_budget      text := nullif(p_experiment->>'budget', '');
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if v_app_id is null or v_app_id = '' then
    raise exception 'app_id is required';
  end if;

  select id into v_project_id
  from public.projects
  where user_id = v_user_id
    and app_id = p_app_project_id;

  if v_project_id is null then return; end if;

  -- resolve hypothesis uuid if provided
  if v_app_hyp_id is not null and v_app_hyp_id <> '' then
    select id into v_hyp_id
    from public.hypotheses
    where project_id = v_project_id
      and app_id = v_app_hyp_id
    limit 1;
  end if;

  -- parse dates safely
  begin
    v_start_date := (p_experiment->>'start_date')::timestamptz;
  exception when others then
    v_start_date := null;
  end;

  begin
    v_end_date := (p_experiment->>'end_date')::timestamptz;
  exception when others then
    v_end_date := null;
  end;

  insert into public.experiments (
    project_id, hypothesis_id, app_id, app_hyp_id,
    owner, start_date, end_date, budget, status
  )
  values (
    v_project_id, v_hyp_id, v_app_id, v_app_hyp_id,
    v_owner, v_start_date, v_end_date, v_budget, v_status
  )
  on conflict (project_id, app_id)
  do update set
    hypothesis_id = excluded.hypothesis_id,
    app_hyp_id    = excluded.app_hyp_id,
    owner         = excluded.owner,
    start_date    = excluded.start_date,
    end_date      = excluded.end_date,
    budget        = excluded.budget,
    status        = excluded.status,
    updated_at    = now();
end;
$$;

revoke execute on function public.sync_app_experiment(text, jsonb) from public;
grant  execute on function public.sync_app_experiment(text, jsonb) to authenticated;
