-- Migration 013: Fix Ranking Visibility
-- This update ensures that ALL users (regardless of role) appear in the ranking.
-- It also improves the COALESCE logic for safer name display.

CREATE OR REPLACE FUNCTION get_weekly_ranking()
RETURNS TABLE (
    id UUID,
    name TEXT,
    score BIGINT,
    "questionsSolved" BIGINT,
    accuracy NUMERIC,
    "avatarUrl" TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        COALESCE(p.username, TRIM(p.full_name), 'Estudante Sem Nome') as name,
        COALESCE(SUM(sr.score), 0)::BIGINT as score,
        COALESCE(SUM(sr.total_questions), 0)::BIGINT as "questionsSolved",
        CASE 
            WHEN SUM(sr.total_questions) > 0 
            THEN ROUND((SUM(sr.correct_answers)::NUMERIC / SUM(sr.total_questions)::NUMERIC) * 100, 1)
            ELSE 0 
        END as accuracy,
        p.avatar_url as "avatarUrl"
    FROM profiles p
    LEFT JOIN simulado_results sr ON p.id = sr.user_id AND sr.created_at >= NOW() - INTERVAL '7 days'
    -- REMOVED the role filter to show EVERYONE
    GROUP BY p.id
    ORDER BY score DESC, accuracy DESC, name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-grant access just in case
GRANT EXECUTE ON FUNCTION get_weekly_ranking() TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_ranking() TO service_role;
