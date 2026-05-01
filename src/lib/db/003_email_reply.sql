-- Add email tracking to reply_history
-- Run in Supabase Dashboard -> SQL Editor

alter table reply_history add column if not exists customer_email text;
alter table reply_history add column if not exists email_subject text;
alter table reply_history add column if not exists sent_via_email boolean default false;
alter table reply_history add column if not exists sent_at timestamptz;
