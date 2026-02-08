-- Migration: Add CASCADE DELETE policies for user deletion
-- This ensures that when a user is deleted from auth.users, all related data is also deleted

-- ================================================
-- 1. USER FAVORITES
-- ================================================
ALTER TABLE user_favorites
DROP CONSTRAINT IF EXISTS user_favorites_user_id_fkey CASCADE;

ALTER TABLE user_favorites
ADD CONSTRAINT user_favorites_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- ================================================
-- 2. USER READ ITEMS
-- ================================================
ALTER TABLE user_read_items
DROP CONSTRAINT IF EXISTS user_read_items_user_id_fkey CASCADE;

ALTER TABLE user_read_items
ADD CONSTRAINT user_read_items_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- ================================================
-- 3. EXAM ACCESS RECORDS
-- ================================================
ALTER TABLE exam_access_records
DROP CONSTRAINT IF EXISTS exam_access_records_user_id_fkey CASCADE;

ALTER TABLE exam_access_records
ADD CONSTRAINT exam_access_records_user_id_fkey
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- ================================================
-- 4. PROFILES -> AUTH.USERS
-- ================================================
-- Supabase automatically handles CASCADE from auth.users -> profiles
-- But let's verify it exists:

-- Check if foreign key exists (run this query to verify):
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    confdeltype AS on_delete_action
FROM
    pg_constraint
WHERE
    conname = 'profiles_id_fkey';

-- If needed, recreate the constraint:
-- ALTER TABLE profiles
-- DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;
--
-- ALTER TABLE profiles
-- ADD CONSTRAINT profiles_id_fkey
--   FOREIGN
