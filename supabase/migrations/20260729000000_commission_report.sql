alter table public.quote
  add column if not exists policy_type text;

alter table public.quote
  add column if not exists fee numeric;
