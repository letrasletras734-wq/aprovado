-- Drop table if exists to ensure clean creation
DROP TABLE IF EXISTS topics CASCADE;

-- Create topics table
CREATE TABLE topics (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('folder', 'file')),
    content TEXT,
    parent_id TEXT REFERENCES topics(id) ON DELETE CASCADE,
    is_vip BOOLEAN DEFAULT false,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Allow public read-only access to topics
CREATE POLICY "Allow public read-only access to topics" ON topics FOR SELECT USING (true);

-- Allow admins full access to topics
CREATE POLICY "Allow admins full access to topics" ON topics TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Initial root node
INSERT INTO topics (id, title, type, parent_id) VALUES ('root', 'Disciplinas', 'folder', NULL) ON CONFLICT (id) DO NOTHING;
