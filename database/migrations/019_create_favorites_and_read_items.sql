-- Migration 019: Create User Favorites and Read Items Tables
-- This enables persistence for the Favorites tab and Read status across devices.

-- 1. Create user_favorites table
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('summary', 'topic')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, item_id, item_type)
);

-- 2. Create user_read_items table
CREATE TABLE IF NOT EXISTS public.user_read_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('summary', 'topic')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, item_id, item_type)
);

-- 3. Enable RLS
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_read_items ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for user_favorites
CREATE POLICY "Users can view their own favorites" 
    ON public.user_favorites FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" 
    ON public.user_favorites FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" 
    ON public.user_favorites FOR DELETE 
    USING (auth.uid() = user_id);

-- 5. Create RLS Policies for user_read_items
CREATE POLICY "Users can view their own read items" 
    ON public.user_read_items FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own read items" 
    ON public.user_read_items FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own read items" 
    ON public.user_read_items FOR DELETE 
    USING (auth.uid() = user_id);

-- 6. Create Indices for performance
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_read_items_user_id ON public.user_read_items(user_id);
-- Index for specific lookups (optional but good for syncing)
CREATE INDEX IF NOT EXISTS idx_user_favorites_lookup ON public.user_favorites(user_id, item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_user_read_items_lookup ON public.user_read_items(user_id, item_id, item_type);

-- 7. Grant access to authenticated users
GRANT ALL ON public.user_favorites TO authenticated;
GRANT ALL ON public.user_read_items TO authenticated;
GRANT ALL ON public.user_favorites TO service_role;
GRANT ALL ON public.user_read_items TO service_role;
