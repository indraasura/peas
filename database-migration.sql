-- POD Management Database Migration
-- Run this in your Supabase SQL Editor if tables already exist

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Allow all reads" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile inserts" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON public.profiles;
DROP POLICY IF EXISTS "Allow POD committee profile management" ON public.profiles;

DROP POLICY IF EXISTS "Allow all reads" ON public.areas;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.areas;
DROP POLICY IF EXISTS "Allow POD committee area management" ON public.areas;

DROP POLICY IF EXISTS "Allow all reads" ON public.pods;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.pods;
DROP POLICY IF EXISTS "Allow POD committee pod management" ON public.pods;

DROP POLICY IF EXISTS "Allow all reads" ON public.pod_dependencies;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.pod_dependencies;
DROP POLICY IF EXISTS "Allow POD committee dependency management" ON public.pod_dependencies;

DROP POLICY IF EXISTS "Allow all reads" ON public.pod_members;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.pod_members;
DROP POLICY IF EXISTS "Allow POD committee member management" ON public.pod_members;

DROP POLICY IF EXISTS "Allow all reads" ON public.pod_notes;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.pod_notes;
DROP POLICY IF EXISTS "Allow POD committee notes management" ON public.pod_notes;

DROP POLICY IF EXISTS "Allow all reads" ON public.area_decision_quorum;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.area_decision_quorum;
DROP POLICY IF EXISTS "Allow POD committee quorum management" ON public.area_decision_quorum;

DROP POLICY IF EXISTS "Allow all reads" ON public.area_comments;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.area_comments;
DROP POLICY IF EXISTS "Allow POD committee comment management" ON public.area_comments;

-- Add new columns to existing tables if they don't exist
ALTER TABLE public.areas 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'backlog';

ALTER TABLE public.areas 
ADD COLUMN IF NOT EXISTS one_pager_url TEXT;

-- Create area_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.area_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for area_comments if not already enabled
ALTER TABLE public.area_comments ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies for POD committee only access
-- Profiles policies - Fixed to avoid infinite recursion
CREATE POLICY "Allow all reads" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow authenticated profile inserts" ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own profile" ON public.profiles FOR UPDATE 
USING (auth.uid() = id);
CREATE POLICY "Allow authenticated profile management" ON public.profiles FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Areas policies
CREATE POLICY "Allow all reads" ON public.areas FOR SELECT USING (true);
CREATE POLICY "Allow authenticated area management" ON public.areas FOR ALL USING (auth.uid() IS NOT NULL);

-- PODs policies
CREATE POLICY "Allow all reads" ON public.pods FOR SELECT USING (true);
CREATE POLICY "Allow authenticated pod management" ON public.pods FOR ALL USING (auth.uid() IS NOT NULL);

-- POD dependencies policies
CREATE POLICY "Allow all reads" ON public.pod_dependencies FOR SELECT USING (true);
CREATE POLICY "Allow authenticated dependency management" ON public.pod_dependencies FOR ALL USING (auth.uid() IS NOT NULL);

-- POD members policies
CREATE POLICY "Allow all reads" ON public.pod_members FOR SELECT USING (true);
CREATE POLICY "Allow authenticated member management" ON public.pod_members FOR ALL USING (auth.uid() IS NOT NULL);

-- POD notes policies
CREATE POLICY "Allow all reads" ON public.pod_notes FOR SELECT USING (true);
CREATE POLICY "Allow authenticated notes management" ON public.pod_notes FOR ALL USING (auth.uid() IS NOT NULL);

-- Area decision quorum policies
CREATE POLICY "Allow all reads" ON public.area_decision_quorum FOR SELECT USING (true);
CREATE POLICY "Allow authenticated quorum management" ON public.area_decision_quorum FOR ALL USING (auth.uid() IS NOT NULL);

-- Area comments policies
CREATE POLICY "Allow all reads" ON public.area_comments FOR SELECT USING (true);
CREATE POLICY "Allow authenticated comment management" ON public.area_comments FOR ALL USING (auth.uid() IS NOT NULL);

-- Update existing areas to have 'backlog' status if they don't have one
UPDATE public.areas SET status = 'backlog' WHERE status IS NULL;

-- Add constraint to ensure valid status values for areas (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_area_status'
    ) THEN
        ALTER TABLE public.areas 
        ADD CONSTRAINT check_area_status CHECK (status IN ('backlog', 'planned'));
    END IF;
END $$;

-- Update the handle_new_user function to ensure POD committee team
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, team)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'New User'),
    'POD committee' -- Force POD committee team
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    team = 'POD committee', -- Force POD committee team
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists and is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions (if not already granted)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
