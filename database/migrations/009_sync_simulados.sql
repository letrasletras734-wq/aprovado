-- Add stats column to profiles if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stats') THEN
        ALTER TABLE profiles ADD COLUMN stats JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Create simulado_results table
CREATE TABLE IF NOT EXISTS simulado_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    preset_id TEXT, -- Can be UUID from presets table or string ID for legacy
    mode TEXT NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    score INTEGER NOT NULL,
    percentage INTEGER NOT NULL,
    current_level TEXT, -- For progressive challenges
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE simulado_results ENABLE ROW LEVEL SECURITY;

-- Policies for simulado_results
CREATE POLICY "Users can view their own results" 
ON simulado_results FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own results" 
ON simulado_results FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all results" 
ON simulado_results FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_simulado_results_user_id ON simulado_results(user_id);
CREATE INDEX IF NOT EXISTS idx_simulado_results_completed_at ON simulado_results(completed_at DESC);
