-- Minimal database fix - just add necessary columns and functions
-- This avoids all foreign key constraint issues

-- Add bandwidth fields to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bandwidth INTEGER DEFAULT 100;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS available_bandwidth INTEGER DEFAULT 100;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS used_bandwidth INTEGER DEFAULT 0;

-- Add password field for non-auth users
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create a function to authenticate regular members (non-Supabase auth)
CREATE OR REPLACE FUNCTION public.authenticate_profile(
  p_email TEXT,
  p_password TEXT
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT *
  FROM public.profiles
  WHERE email = p_email AND password_hash = p_password; -- In production, compare with hashed password
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.authenticate_profile(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.authenticate_profile(TEXT, TEXT) TO authenticated;

-- Create a function to create new members in the profiles table (for POD committee)
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
  generated_uuid UUID;
  attempts INTEGER := 0;
  max_attempts INTEGER := 5;
BEGIN
  -- Check if caller is authenticated (POD committee member)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Only POD committee members can create members';
  END IF;
  
  LOOP
    generated_uuid := uuid_generate_v4();
    BEGIN
      INSERT INTO public.profiles (id, email, password_hash, name, team, bandwidth, available_bandwidth, used_bandwidth)
      VALUES (generated_uuid, p_email, p_password, p_name, p_team, p_bandwidth, p_bandwidth, 0)
      RETURNING * INTO new_profile;
      EXIT; -- Exit loop if insert is successful
    EXCEPTION
      WHEN unique_violation THEN
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
          RAISE EXCEPTION 'Failed to create unique profile ID after % attempts', max_attempts;
        END IF;
        -- Log the collision and retry
        RAISE WARNING 'UUID collision detected, retrying... Attempt %', attempts;
    END;
  END LOOP;
  
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
