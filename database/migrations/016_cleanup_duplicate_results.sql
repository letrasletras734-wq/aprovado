-- Migration 016: Cleanup Duplicate Results
-- This script identifies and removes duplicate simulado_results 
-- that were created by the same user within the same second/minute (due to the async side-effect bug).

-- 1. Identify duplicates: rows with same user_id, preset_id, score, and very close completed_at
WITH Duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY user_id, preset_id, mode, score, percentage, floor(extract(epoch from completed_at) / 2)
               ORDER BY completed_at
           ) as row_num
    FROM simulado_results
    WHERE mode != 'manual_adjustment' -- Keep manual adjustments safe
)
DELETE FROM simulado_results
WHERE id IN (
    SELECT id FROM Duplicates WHERE row_num > 1
);

-- Note: This is a one-time cleanup to fix the "double points" already in the DB.
-- The code fix in App.tsx will prevent new ones.
