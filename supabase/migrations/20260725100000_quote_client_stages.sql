alter table public.quote
  drop constraint if exists quote_stage_check;

alter table public.quote
  add constraint quote_stage_check check (stage between 1 and 6);

alter table public.quote
  add column if not exists initial_quoted_premium numeric;
