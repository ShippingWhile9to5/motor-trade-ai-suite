alter table public.business
  add column if not exists follow_up date;

create index if not exists business_user_follow_up_idx
  on public.business (user_id, follow_up)
  where follow_up is not null;
