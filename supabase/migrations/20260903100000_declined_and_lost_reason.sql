-- "Declined" is an insurer that would not quote, which is a different thing
-- from losing the case. It closes only its own card; Lost closes the lot.
alter table quote
  drop constraint if exists quote_outcome_check;

alter table quote
  add constraint quote_outcome_check
  check (outcome in ('Won','Lost','NTU','Declined'));

-- Why a case was lost. The reason is a short list so it can be counted; the
-- note is for the detail that never fits a list.
alter table quote
  add column if not exists lost_reason text,
  add column if not exists lost_note text;
