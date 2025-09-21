-- POD Management Database Schema - UPDATE VERSION
-- This version handles existing tables gracefully
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.pod_notes CASCADE;
DROP TABLE IF EXISTS public.pod_dependencies CASCADE;
DROP TABLE IF EXISTS public.pod_members CASCADE;
DROP TABLE IF EXISTS public.pods CASCADE;
DROP TABLE IF EXISTS public.area_decision_quorum CASCADE;
DROP TABLE IF EXISTS public.areas CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  team TEXT NOT NULL DEFAULT 'Member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create areas table
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  revenue_impact TEXT DEFAULT 'Low',
  business_enablement TEXT DEFAULT 'Low',
  efforts TEXT DEFAULT 'Low',
  end_user_impact TEXT DEFAULT 'Low',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pods table
CREATE TABLE public.pods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'backlog',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pod_dependencies table
CREATE TABLE public.pod_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  dependent_pod_id UUID NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pod_id, dependent_pod_id)
);

-- Create pod_members table
CREATE TABLE public.pod_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bandwidth_percentage INTEGER NOT NULL DEFAULT 25,
  is_leader BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pod_id, member_id)
);

-- Create pod_notes table
CREATE TABLE public.pod_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  review_date DATE NOT NULL,
  blockers TEXT,
  learnings TEXT,
  current_state TEXT,
  deviation_to_plan TEXT,
  dependencies_risks TEXT,
  misc TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create area_decision_quorum table
CREATE TABLE public.area_decision_quorum (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(area_id, member_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_decision_quorum ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all reads" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile inserts" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON public.profiles;
DROP POLICY IF EXISTS "Allow all reads" ON public.areas;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.areas;
DROP POLICY IF EXISTS "Allow all reads" ON public.pods;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.pods;
DROP POLICY IF EXISTS "Allow all reads" ON public.pod_dependencies;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.pod_dependencies;
DROP POLICY IF EXISTS "Allow all reads" ON public.pod_members;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.pod_members;
DROP POLICY IF EXISTS "Allow all reads" ON public.pod_notes;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.pod_notes;
DROP POLICY IF EXISTS "Allow all reads" ON public.area_decision_quorum;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.area_decision_quorum;

-- Create RLS policies
-- Profiles policies
CREATE POLICY "Allow all reads" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow profile inserts" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow profile updates" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Areas policies
CREATE POLICY "Allow all reads" ON public.areas FOR SELECT USING (true);
CREATE POLICY "Allow authenticated inserts" ON public.areas FOR ALL USING (auth.uid() IS NOT NULL);

-- PODs policies
CREATE POLICY "Allow all reads" ON public.pods FOR SELECT USING (true);
CREATE POLICY "Allow authenticated inserts" ON public.pods FOR ALL USING (auth.uid() IS NOT NULL);

-- POD dependencies policies
CREATE POLICY "Allow all reads" ON public.pod_dependencies FOR SELECT USING (true);
CREATE POLICY "Allow authenticated inserts" ON public.pod_dependencies FOR ALL USING (auth.uid() IS NOT NULL);

-- POD members policies
CREATE POLICY "Allow all reads" ON public.pod_members FOR SELECT USING (true);
CREATE POLICY "Allow authenticated inserts" ON public.pod_members FOR ALL USING (auth.uid() IS NOT NULL);

-- POD notes policies
CREATE POLICY "Allow all reads" ON public.pod_notes FOR SELECT USING (true);
CREATE POLICY "Allow authenticated inserts" ON public.pod_notes FOR ALL USING (auth.uid() IS NOT NULL);

-- Area decision quorum policies
CREATE POLICY "Allow all reads" ON public.area_decision_quorum FOR SELECT USING (true);
CREATE POLICY "Allow authenticated inserts" ON public.area_decision_quorum FOR ALL USING (auth.uid() IS NOT NULL);

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Function to create profile on signup
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
    COALESCE(NEW.raw_user_meta_data ->> 'team', 'Member')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    team = COALESCE(EXCLUDED.team, profiles.team),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile automatically
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Insert sample data (only if tables are empty)
INSERT INTO public.areas (name, description, revenue_impact, business_enablement, efforts, end_user_impact) 
SELECT * FROM (VALUES
('Customer Experience', 'Improving customer satisfaction and retention', 'High', 'High', 'Medium', 'High'),
('Product Innovation', 'Developing new features and capabilities', 'Medium', 'High', 'High', 'Medium'),
('Operational Efficiency', 'Streamlining internal processes', 'Low', 'Medium', 'Low', 'Low'),
('Market Expansion', 'Entering new markets and segments', 'High', 'Medium', 'High', 'Medium')
) AS v(name, description, revenue_impact, business_enablement, efforts, end_user_impact)
WHERE NOT EXISTS (SELECT 1 FROM public.areas WHERE areas.name = v.name);

-- Insert sample PODs (only if tables are empty)
INSERT INTO public.pods (name, description, area_id, status) 
SELECT * FROM (VALUES
('Mobile App Redesign', 'Complete redesign of mobile application', (SELECT id FROM public.areas WHERE name = 'Customer Experience'), 'planning'),
('AI Chatbot Integration', 'Implement AI-powered customer support', (SELECT id FROM public.areas WHERE name = 'Product Innovation'), 'backlog'),
('Performance Optimization', 'Improve system performance and speed', (SELECT id FROM public.areas WHERE name = 'Operational Efficiency'), 'in development'),
('International Expansion', 'Launch in European markets', (SELECT id FROM public.areas WHERE name = 'Market Expansion'), 'backlog')
) AS v(name, description, area_id, status)
WHERE NOT EXISTS (SELECT 1 FROM public.pods WHERE pods.name = v.name);
