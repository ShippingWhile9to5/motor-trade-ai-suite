-- Reviews were never backed by a real table (the app held them in server
-- memory only, which does not survive across serverless invocations).
-- This adds the missing table plus the columns the submission composer
-- needs to actually save its input form and generated outputs.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  extraction_id uuid not null unique references public.extractions(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id text not null,
  review_status text not null default 'pending',
  reviewed_output jsonb,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_review_status_check check (
    review_status in ('pending', 'approved', 'needs_changes')
  )
);

alter table public.reviews enable row level security;

create index reviews_extraction_id_idx on public.reviews(extraction_id);
create index reviews_case_id_idx on public.reviews(case_id);
create index reviews_user_id_idx on public.reviews(user_id);

create trigger reviews_set_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();

-- submission_outputs existed but was never used by the app (submissions
-- were also held in server memory only). Its original status check
-- ('draft'/'approved') doesn't match the statuses the app actually uses
-- ('draft'/'ready'/'submitted') -- replace it. Add the columns needed for
-- the free-text draft flow (submission_text, review_id) and the
-- submission composer's smart-form state + generated outputs.

alter table public.submission_outputs
  drop constraint if exists submission_outputs_status_check;

alter table public.submission_outputs
  add column if not exists review_id uuid references public.extractions(id) on delete cascade,
  add column if not exists submission_text text,
  add column if not exists composer_input_json jsonb,
  add column if not exists motor_trade_additional_information text,
  add column if not exists material_damage_additional_information text,
  add column if not exists underwriter_email text;

alter table public.submission_outputs
  add constraint submission_outputs_status_check check (
    status in ('draft', 'ready', 'submitted')
  );

alter table public.submission_outputs
  alter column status set default 'draft';

create unique index if not exists submission_outputs_case_id_unique_idx
on public.submission_outputs(case_id);
