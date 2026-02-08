DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        CREATE TABLE audit_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            action TEXT NOT NULL,
            performed_by UUID NULL, -- ID do Admin
            target_user UUID NULL,  -- ID do Usuário alvo
            details JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT now()
        );
        -- Security
        ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
        
        -- Policies: Only Admins can insert and view logs
        -- (Assuming 'profiles' table has 'role' column)
        CREATE POLICY "Admins can insert audit logs" ON audit_logs FOR INSERT 
        WITH CHECK (
            exists (select 1 from profiles where id = auth.uid() and role = 'admin')
        );

        CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT 
        USING (
            exists (select 1 from profiles where id = auth.uid() and role = 'admin')
        );
    END IF;
END $$;
