-- A prospect who does not want a quote is not a case you lost. Keeping them
-- apart keeps the Lost tab meaning "we quoted and did not get it".
alter table business
  drop constraint if exists business_pipeline_status_check;

alter table business
  add constraint business_pipeline_status_check
  check (pipeline_status in
    ('prospect','contacted','quoting','won','lost','not_interested'));
