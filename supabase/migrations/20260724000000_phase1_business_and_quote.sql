-- Phase 1: the shared "business" spine plus the quote pipeline.
--
-- A `business` is one motor-trade firm the broker deals with. The same row
-- lives through its whole relationship: prospect -> quoting -> won/lost.
-- Quotes hang off a business, so a client is entered once and carried through.
--
-- Access is service-role (RLS bypassed); ownership is enforced in the
-- repository layer via user_id, so every query is scoped to the Clerk user.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- business
-- ---------------------------------------------------------------------------
create table if not exists public.business (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  name            text not null,
  company_number  text,
  company_status  text,
  incorporated    text,
  location        text,
  address         text,
  directors       jsonb not null default '[]'::jsonb,
  phone           text,
  mobile          text,
  email           text,
  website         text,
  franchise       text,
  services        text,
  profile         text,
  opportunity     text,
  approach_angle  text,
  rating          integer,
  pipeline_status text not null default 'prospect'
    check (pipeline_status in ('prospect','contacted','quoting','won','lost')),
  notes           text,
  source          text not null default 'manual'
    check (source in ('manual','finder','import')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One firm per Companies House number per user (dedup guard). Businesses with
-- no company number (manual adds) are unaffected by this partial index.
create unique index if not exists business_user_company_number_key
  on public.business (user_id, company_number)
  where company_number is not null;

create index if not exists business_user_id_idx on public.business (user_id);
create index if not exists business_pipeline_status_idx
  on public.business (user_id, pipeline_status);

-- ---------------------------------------------------------------------------
-- quote
-- ---------------------------------------------------------------------------
create table if not exists public.quote (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null,
  business_id       uuid not null references public.business (id) on delete cascade,
  insurer           text not null,
  quote_type        text not null default 'New Business',
  submission_date   date not null,
  stage             integer not null default 1 check (stage between 1 and 5),
  notes             text,
  target_premium    numeric,
  last_year_premium numeric,
  quoted_premium    numeric,
  outcome           text check (outcome in ('Won','Lost','NTU')),
  stage_entered_at  timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists quote_user_id_idx on public.quote (user_id);
create index if not exists quote_business_id_idx on public.quote (business_id);

-- ---------------------------------------------------------------------------
-- keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists business_set_updated_at on public.business;
create trigger business_set_updated_at
  before update on public.business
  for each row execute function public.set_updated_at();

drop trigger if exists quote_set_updated_at on public.quote;
create trigger quote_set_updated_at
  before update on public.quote
  for each row execute function public.set_updated_at();
