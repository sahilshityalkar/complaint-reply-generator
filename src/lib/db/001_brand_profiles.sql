-- Brand Voice Profiles
-- Run in Supabase Dashboard -> SQL Editor

create table if not exists brand_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references users(id) on delete cascade,
  name        text not null,
  business_name text not null,
  industry    text not null,
  website_url text,
  voice_dna   text,
  sign_off    text,
  preferences jsonb not null default '{
    "languages": {
      "mode": "auto_detect",
      "default": "en",
      "supported": [{"code": "en", "label": "English", "rank": 1}]
    },
    "reply_style": {
      "length": "medium",
      "formality": "casual",
      "emoji": "occasional"
    },
    "rules": [],
    "signature": {
      "include_name": true,
      "include_business": true,
      "custom": ""
    }
  }',
  setup_method text not null default 'quiz',
  is_default  boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_brand_profiles_user on brand_profiles(user_id);
create index if not exists idx_brand_profiles_default on brand_profiles(user_id, is_default) where is_default = true;

-- Enable Row Level Security
alter table brand_profiles enable row level security;

-- Users can only access their own profiles
create policy "brand_profiles_own_data" on brand_profiles
  for all using (user_id = auth.uid()::text);
