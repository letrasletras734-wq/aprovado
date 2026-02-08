-- CRITICAL FIX: The previous policy caused an infinite loop (recursion).
-- 1. DROP the recursive policy immediately.
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- 2. Restore sanity: Users can ONLY view their own profile via standard API.
-- This unblocks the "Sincronizando..." screen.
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

-- 3. Create a Secure Function that explicitly allows Admins to see EVERYONE.
-- This function runs with "SECURITY DEFINER" privileges, bypassing RLS laws,
-- but contains its own strict check to ensure only Admins can use it.
CREATE OR REPLACE FUNCTION get_admin_profiles_view()
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify if the requester is an admin
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
      -- If admin, return ALL profiles (including onboarding_data)
      RETURN QUERY SELECT * FROM profiles ORDER BY created_at DESC;
  ELSE
      -- If not admin, return empty set (or could raise exception)
      RETURN;
  END IF;
END;
$$;
