-- Напоминания о дедлайнах экспериментов в Telegram (cron edge function).

create table if not exists public.experiment_telegram_reminders (
  id             uuid primary key default gen_random_uuid(),
  experiment_id  uuid not null references public.experiments(id) on delete cascade,
  reminder_kind  text not null check (reminder_kind in ('day_before', 'due_day', 'overdue')),
  sent_at        timestamptz not null default now(),
  unique (experiment_id, reminder_kind)
);

create index if not exists idx_experiment_telegram_reminders_experiment
  on public.experiment_telegram_reminders (experiment_id);

alter table public.experiment_telegram_reminders enable row level security;

revoke all on public.experiment_telegram_reminders from anon, authenticated;
grant all on public.experiment_telegram_reminders to service_role;

-- Эксперименты, по которым нужно отправить напоминание (вызывается cron-функцией).
create or replace function public.get_experiments_for_telegram_reminders()
returns table (
  experiment_id    uuid,
  experiment_app_id text,
  project_app_id   text,
  project_name     text,
  hypothesis_title text,
  owner            text,
  end_date         timestamptz,
  reminder_kind    text
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

create or replace function public.mark_experiment_reminder_sent(
  p_experiment_id uuid,
  p_reminder_kind text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.experiment_telegram_reminders (experiment_id, reminder_kind)
  values (p_experiment_id, p_reminder_kind)
  on conflict (experiment_id, reminder_kind) do nothing;
end;
$$;

revoke execute on function public.get_experiments_for_telegram_reminders() from public;
grant execute on function public.get_experiments_for_telegram_reminders() to service_role;

revoke execute on function public.mark_experiment_reminder_sent(uuid, text) from public;
grant execute on function public.mark_experiment_reminder_sent(uuid, text) to service_role;
