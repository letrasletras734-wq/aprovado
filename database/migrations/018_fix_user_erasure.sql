-- Migration 018: Fix User Erasure and Ranking Persistence
-- Fixes ghost points by ensuring all related data is wiped on user delete.

-- 1. Fix Profiles -> Auth.Users cascade
ALTER TABLE IF EXISTS profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Ensure simulado_results -> Auth.Users cascade
ALTER TABLE IF EXISTS simulado_results DROP CONSTRAINT IF EXISTS simulado_results_user_id_fkey CASCADE;
ALTER TABLE simulado_results ADD CONSTRAINT simulado_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Trigger to delete auth.user when profile is deleted (backup for direct DB deletes)
CREATE OR REPLACE FUNCTION delete_auth_user_on_profile_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_delete_auth_user ON profiles;
CREATE TRIGGER tr_delete_auth_user AFTER DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION delete_auth_user_on_profile_delete();

-- 4. Update ranking function to be clean
CREATE OR REPLACE FUNCTION get_weekly_ranking() RETURNS TABLE (id UUID, name TEXT, score BIGINT, "questionsSolved" BIGINT, accuracy NUMERIC, "avatarUrl" TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, COALESCE(p.username, TRIM(p.full_name))::TEXT, COALESCE(SUM(sr.score), 0)::BIGINT, 
           COALESCE(SUM(sr.total_questions), 0)::BIGINT, 
           CASE WHEN SUM(sr.total_questions) > 0 THEN ROUND((SUM(sr.correct_answers)::NUMERIC / SUM(sr.total_questions)::NUMERIC) * 100, 1) ELSE 0 END,
           p.avatar_url
    FROM profiles p
    LEFT JOIN simulado_results sr ON p.id = sr.user_id AND sr.completed_at >= NOW() - INTERVAL '7 days'
    GROUP BY p.id, p.username, p.full_name, p.avatar_url
    ORDER BY score DESC, accuracy DESC, name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
