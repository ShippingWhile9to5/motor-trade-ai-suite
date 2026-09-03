-- The date a policy went on cover. Renewal is twelve months later, worked out
-- rather than stored, so correcting this date moves the renewal with it.
alter table quote
  add column if not exists cover_start date;
