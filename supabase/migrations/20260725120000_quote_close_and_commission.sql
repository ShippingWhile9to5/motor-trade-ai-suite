alter table public.quote
  add column if not exists closed_at date;

alter table public.quote
  add column if not exists commission numeric;

create index if not exists quote_user_closed_at_idx
  on public.quote (user_id, closed_at)
  where closed_at is not null;
