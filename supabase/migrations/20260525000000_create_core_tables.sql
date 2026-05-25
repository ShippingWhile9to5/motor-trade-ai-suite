create extension if not exists "pgcrypto";

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  client_name text not null,
  trading_name text,
  business_type text,
  contact_name text,
  email text,
  phone text,
  renewal_date date,
  notes text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cases_status_check check (
    status in ('draft', 'review', 'ready', 'submitted', 'closed')
  )
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id text not null,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  storage_path text not null,
  status text not null default 'uploaded',
  created_at timestamptz not null default now(),
  constraint documents_size_bytes_check check (size_bytes >= 0),
  constraint documents_status_check check (
    status in ('uploaded', 'queued', 'processing', 'complete', 'failed')
  )
);

create table public.extractions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id text not null,
  status text not null default 'queued',
  raw_result_json jsonb,
  reviewed_result_json jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint extractions_status_check check (
    status in ('queued', 'processing', 'review_required', 'approved', 'failed')
  )
);

create table public.submission_outputs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id text not null,
  acturis_notes text,
  insurer_email_subject text,
  insurer_email_body text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submission_outputs_status_check check (
    status in ('draft', 'approved')
  )
);

alter table public.cases enable row level security;
alter table public.documents enable row level security;
alter table public.extractions enable row level security;
alter table public.submission_outputs enable row level security;

create index cases_user_id_idx on public.cases(user_id);
create index cases_status_idx on public.cases(status);
create index cases_updated_at_idx on public.cases(updated_at);

create index documents_case_id_idx on public.documents(case_id);
create index documents_user_id_idx on public.documents(user_id);

create index extractions_case_id_idx on public.extractions(case_id);
create index extractions_document_id_idx on public.extractions(document_id);
create index extractions_user_id_idx on public.extractions(user_id);

create index submission_outputs_case_id_idx on public.submission_outputs(case_id);
create index submission_outputs_user_id_idx on public.submission_outputs(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cases_set_updated_at
before update on public.cases
for each row
execute function public.set_updated_at();

create trigger extractions_set_updated_at
before update on public.extractions
for each row
execute function public.set_updated_at();

create trigger submission_outputs_set_updated_at
before update on public.submission_outputs
for each row
execute function public.set_updated_at();
