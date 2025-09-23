-- Database Schema Updates for Kanban Implementation
-- Run this in your Supabase SQL Editor

-- Add status field to areas table (backlog/planned)
ALTER TABLE public.areas 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'backlog';

-- Add one_pager field to areas table for file uploads
ALTER TABLE public.areas 
ADD COLUMN IF NOT EXISTS one_pager_url TEXT;

-- Create area_comments table for area discussions
CREATE TABLE IF NOT EXISTS public.area_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for area_comments
ALTER TABLE public.area_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for area_comments
DROP POLICY IF EXISTS "Allow all reads" ON public.area_comments;
CREATE POLICY "Allow all reads" ON public.area_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.area_comments;
CREATE POLICY "Allow authenticated inserts" ON public.area_comments FOR ALL USING (auth.uid() IS NOT NULL);

-- Grant permissions for area_comments
GRANT ALL ON public.area_comments TO postgres;
GRANT ALL ON public.area_comments TO anon;
GRANT ALL ON public.area_comments TO authenticated;
GRANT ALL ON public.area_comments TO service_role;

-- Update existing areas to have 'backlog' status
UPDATE public.areas SET status = 'backlog' WHERE status IS NULL;

-- Add constraint to ensure valid status values
ALTER TABLE public.areas 
ADD CONSTRAINT check_area_status CHECK (status IN ('backlog', 'planned'));

-- Update areas table RLS policies to include new columns
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.areas;
CREATE POLICY "Allow authenticated inserts" ON public.areas FOR ALL USING (auth.uid() IS NOT NULL);