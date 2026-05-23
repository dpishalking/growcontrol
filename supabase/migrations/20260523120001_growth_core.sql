-- Core domain: projects, growth hypotheses, activity log

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  website_url text,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create index idx_projects_user_activity
  on public.projects (user_id, last_activity_at desc);

create table public.hypotheses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'testing', 'won', 'lost', 'archived')),
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  expected_impact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_hypotheses_project
  on public.hypotheses (project_id, created_at desc);

create table public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  title text not null,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_project_events_project
  on public.project_events (project_id, created_at desc);

alter table public.projects enable row level security;
alter table public.hypotheses enable row level security;
alter table public.project_events enable row level security;

create policy "Users manage own projects"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own hypotheses"
  on public.hypotheses for all
  using (
    exists (
      select 1
      from public.projects p
      where p.id = hypotheses.project_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = hypotheses.project_id
        and p.user_id = auth.uid()
    )
  );

create policy "Users manage own project events"
  on public.project_events for all
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_events.project_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_events.project_id
        and p.user_id = auth.uid()
    )
  );

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger hypotheses_set_updated_at
  before update on public.hypotheses
  for each row execute function public.set_updated_at();
