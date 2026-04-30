# Database Migrations

## How to Run

1. Go to Supabase Dashboard → SQL Editor
2. Run each .sql file **in order**:
   - 001_brand_profiles.sql
   - 002_reply_history_profile.sql
3. Verify tables appear in Table Editor

## Notes
- RLS is enabled on brand_profiles
- profile_id on reply_history uses ON DELETE SET NULL (deleting a profile doesn't delete history)
