-- Migration 014: Robust Ranking and Permissions
-- This update makes the ranking function extremely resilient and ensures visibility for ALL.

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
        COALESCE(
            NULLIF(p.username, ''), 
            NULLIF(TRIM(p.full_name), ''), 
            'Estudante #' || substr(p.id::text, 1, 4)
        ) as name,
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
    -- NO ROLE FILTERS - Show everybody
    GROUP BY p.id, p.username, p.full_name, p.avatar_url
    ORDER BY score DESC, accuracy DESC, name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Explicitly allow access to everyone authenticated
GRANT EXECUTE ON FUNCTION get_weekly_ranking() TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_ranking() TO anon;
GRANT EXECUTE ON FUNCTION get_weekly_ranking() TO service_role;
