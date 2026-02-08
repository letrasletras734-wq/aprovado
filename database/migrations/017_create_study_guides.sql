-- Migration 017: Create Study Guides Table
-- This table stores study guides organized by discipline with topics and subthemes

CREATE TABLE IF NOT EXISTS study_guides (
    id TEXT PRIMARY KEY,
    discipline TEXT NOT NULL,
    topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_study_guides_discipline ON study_guides(discipline);

-- Enable Row Level Security
ALTER TABLE study_guides ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read study guides
CREATE POLICY "Anyone can view study guides"
    ON study_guides
    FOR SELECT
    USING (true);

-- Policy: Only authenticated users can insert/update/delete
CREATE POLICY "Authenticated users can manage study guides"
    ON study_guides
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON study_guides TO anon;
GRANT ALL ON study_guides TO authenticated;
GRANT ALL ON study_guides TO service_role;

-- Add comment
COMMENT ON TABLE study_guides IS 'Study guides organized by discipline with topics and subthemes';
