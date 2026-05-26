-- Admin UI reads experiments alongside projects/hypotheses (see AdminProjectsPage).
grant select on public.experiments to authenticated;
