-- Create a function to generate unique UUIDs for member profiles
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.create_member_profile(
  p_email TEXT,
  p_name TEXT,
  p_team TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_profile public.profiles;
  attempts INTEGER := 0;
  max_attempts INTEGER := 5;
BEGIN
  -- Retry loop to handle UUID collisions
  WHILE attempts < max_attempts LOOP
    BEGIN
      INSERT INTO public.profiles (id, email, name, team)
      VALUES (uuid_generate_v4(), p_email, p_name, p_team)
      RETURNING * INTO new_profile;
      
      -- If we get here, the insert was successful
      RETURN new_profile;
      
    EXCEPTION
      WHEN unique_violation THEN
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
          RAISE EXCEPTION 'Failed to create member profile after % attempts due to UUID collisions', max_attempts;
        END IF;
        -- Continue the loop to try again
    END;
  END LOOP;
  
  -- This should never be reached, but just in case
  RAISE EXCEPTION 'Unexpected error in create_member_profile function';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_member_profile(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_member_profile(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_member_profile(TEXT, TEXT, TEXT) TO service_role;
