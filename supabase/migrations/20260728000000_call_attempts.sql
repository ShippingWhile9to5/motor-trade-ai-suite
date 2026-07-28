alter table public.business
  add column if not exists attempts integer not null default 0;

alter table public.business
  add column if not exists last_attempt_at date;
