-- Add profile tracking to reply history
-- Run after 001_brand_profiles.sql

alter table reply_history add column if not exists profile_id uuid references brand_profiles(id) on delete set null;
