-- POD Management Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  status TEXT NOT NULL DEFAULT 'backlog',
  one_pager_url TEXT,
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

-- Create area_comments table for area discussions
CREATE TABLE public.area_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_decision_quorum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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
    'POD committee' -- Force POD committee team for all new users
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    team = 'POD committee', -- Force POD committee team
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile automatically
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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

-- Add constraint to ensure valid status values for areas
ALTER TABLE public.areas 
ADD CONSTRAINT check_area_status CHECK (status IN ('backlog', 'planned'));

-- Insert sample data
INSERT INTO public.areas (name, description, revenue_impact, business_enablement, efforts, end_user_impact, status) VALUES
('Customer Experience', 'Improving customer satisfaction and retention', 'High', 'High', 'Medium', 'High', 'backlog'),
('Product Innovation', 'Developing new features and capabilities', 'Medium', 'High', 'High', 'Medium', 'backlog'),
('Operational Efficiency', 'Streamlining internal processes', 'Low', 'Medium', 'Low', 'Low', 'backlog'),
('Market Expansion', 'Entering new markets and segments', 'High', 'Medium', 'High', 'Medium', 'backlog');

-- Insert sample PODs
INSERT INTO public.pods (name, description, area_id, status) VALUES
('Mobile App Redesign', 'Complete redesign of mobile application', (SELECT id FROM public.areas WHERE name = 'Customer Experience'), 'planning'),
('AI Chatbot Integration', 'Implement AI-powered customer support', (SELECT id FROM public.areas WHERE name = 'Product Innovation'), 'backlog'),
('Performance Optimization', 'Improve system performance and speed', (SELECT id FROM public.areas WHERE name = 'Operational Efficiency'), 'in development'),
('International Expansion', 'Launch in European markets', (SELECT id FROM public.areas WHERE name = 'Market Expansion'), 'backlog');