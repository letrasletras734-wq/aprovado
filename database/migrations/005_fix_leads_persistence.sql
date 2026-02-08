-- 1. Check if column exists, if not add it (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_data') THEN
        ALTER TABLE profiles ADD COLUMN onboarding_data JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Update RLS policies to ensure users can read/write their own onboarding_data
-- First, drop existing policies to be clean (or create new ones if they don't exist)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Re-create permissive policies for authenticated users
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Allow admins to view ALL profiles (crucial for "Leads" tab)
CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
USING (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  )
);

CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- 3. Grant proper permissions just in case
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- 4. Enable RLS generally
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
