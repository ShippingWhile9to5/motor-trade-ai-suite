alter table public.extractions
add column if not exists document_id uuid references public.documents(id) on delete cascade,
add column if not exists user_id text,
add column if not exists raw_result_json jsonb,
add column if not exists reviewed_result_json jsonb,
add column if not exists error_message text;

create index if not exists extractions_document_id_idx
on public.extractions(document_id);

create index if not exists extractions_user_id_idx
on public.extractions(user_id);
