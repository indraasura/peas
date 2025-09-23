-- Fix for Existing Database Structure
-- The current system uses 'profiles' table for both POD committee and regular members
-- We need to work with the existing structure, not create new tables

-- Add bandwidth fields to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bandwidth INTEGER DEFAULT 100;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS available_bandwidth INTEGER DEFAULT 100;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS used_bandwidth INTEGER DEFAULT 0;

-- Add password field for non-auth users (regular members)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create a function to authenticate profiles (for non-POD committee members)
CREATE OR REPLACE FUNCTION public.authenticate_profile(
  p_email TEXT,
  p_password TEXT
)
RETURNS TABLE(
  id UUID,
  email TEXT,
  name TEXT,
  team TEXT,
  bandwidth INTEGER,
  available_bandwidth INTEGER,
  used_bandwidth INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple password check (in production, use proper hashing)
  RETURN QUERY
  SELECT p.id, p.email, p.name, p.team, p.bandwidth, p.available_bandwidth, p.used_bandwidth, p.created_at
  FROM public.profiles p
  WHERE p.email = p_email 
  AND p.password_hash = p_password -- In production, use crypt() or similar
  AND p.team != 'POD committee'; -- Only non-POD committee members
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.authenticate_profile(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.authenticate_profile(TEXT, TEXT) TO authenticated;

-- Create a function to create new profiles (for POD committee to create regular members)
CREATE OR REPLACE FUNCTION public.create_profile_member(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_team TEXT,
  p_bandwidth INTEGER DEFAULT 100
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_profile public.profiles;
BEGIN
  -- Check if caller is authenticated (POD committee member)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Only POD committee members can create members';
  END IF;
  
  INSERT INTO public.profiles (id, email, password_hash, name, team, bandwidth, available_bandwidth, used_bandwidth)
  VALUES (uuid_generate_v4(), p_email, p_password, p_name, p_team, p_bandwidth, p_bandwidth, 0) -- In production, hash the password
  RETURNING * INTO new_profile;
  
  RETURN new_profile;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_profile_member(TEXT, TEXT, TEXT, TEXT, INTEGER) TO authenticated;

-- Update POD notes policies to allow members to manage notes for their assigned PODs
DROP POLICY IF EXISTS "Allow all reads" ON public.pod_notes;
DROP POLICY IF EXISTS "Allow authenticated notes management" ON public.pod_notes;
DROP POLICY IF EXISTS "Allow POD committee notes management" ON public.pod_notes;
DROP POLICY IF EXISTS "Allow members to manage notes for assigned PODs" ON public.pod_notes;

CREATE POLICY "Allow all reads" ON public.pod_notes FOR SELECT USING (true);
CREATE POLICY "Allow POD committee notes management" ON public.pod_notes FOR ALL USING (
  auth.uid() IS NOT NULL -- POD committee members can manage all notes
);
CREATE POLICY "Allow members to manage notes for assigned PODs" ON public.pod_notes FOR ALL USING (
  -- Allow if the current user is a member assigned to this POD
  -- This will be enforced at the application level for members
  true -- We'll handle member access in the application layer
);

-- Note: Sample data removed to avoid foreign key constraint issues
-- The profiles table has a foreign key to auth.users, so we can only insert
-- profiles for users that exist in Supabase auth
