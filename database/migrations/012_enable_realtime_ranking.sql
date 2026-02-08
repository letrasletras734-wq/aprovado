-- Migration 012: Enable Realtime for Ranking Tables
-- This allows the frontend to listen for changes and update the ranking in real-time.

-- Enable Realtime for specific tables
BEGIN;
  -- remove the tables from the publication first to avoid "already exists" errors if previously added
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS simulado_results;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS profiles;
  
  -- add them back
  ALTER PUBLICATION supabase_realtime ADD TABLE simulado_results;
  ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
COMMIT;
