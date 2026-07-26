create table if not exists public.reminder (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  business_id uuid references public.business (id) on delete set null,
  body        text not null,
  due_date    date not null,
  done        boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists reminder_user_id_idx on public.reminder (user_id);

create index if not exists reminder_user_due_idx
  on public.reminder (user_id, due_date)
  where done = false;

drop trigger if exists reminder_set_updated_at on public.reminder;
create trigger reminder_set_updated_at
  before update on public.reminder
  for each row execute function public.set_updated_at();
