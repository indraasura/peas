-- Fix foreign key constraint issue for member management
-- This script modifies the profiles table to handle both auth and non-auth users

-- Step 1: Drop the existing foreign key constraint if it exists
DO $$ 
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
        RAISE NOTICE 'Dropped existing profiles_id_fkey constraint';
    ELSE
        RAISE NOTICE 'profiles_id_fkey constraint does not exist';
    END IF;
END $$;

-- Step 2: Create a new constraint that allows both auth users and generated UUIDs
-- This constraint will only apply to POD committee members (auth users)
-- For other teams, we'll use generated UUIDs without foreign key constraints

-- First, let's create a function to check if an ID is a valid auth user
CREATE OR REPLACE FUNCTION is_valid_auth_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the user_id exists in auth.users (Supabase auth table)
    -- Note: This might need to be adjusted based on your Supabase setup
    RETURN EXISTS (
        SELECT 1 FROM auth.users WHERE id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Add a check constraint that validates POD committee members have auth users
-- but allows other teams to have generated UUIDs
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_auth_check 
CHECK (
    -- If team is POD committee, the ID must be a valid auth user
    (team = 'POD committee' AND is_valid_auth_user(id)) OR
    -- If team is not POD committee, allow any UUID (no auth requirement)
    (team != 'POD committee')
);

-- Step 4: Update RLS policies to handle both auth and non-auth users
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new policies that work for both auth and non-auth users
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (
        -- Auth users can view their own profile
        (auth.uid() IS NOT NULL AND id = auth.uid()) OR
        -- POD committee members can view all profiles
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND team = 'POD committee'
        )) OR
        -- Non-auth users (team members) can view all profiles
        (auth.uid() IS NULL)
    );

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (
        -- Auth users can update their own profile
        (auth.uid() IS NOT NULL AND id = auth.uid()) OR
        -- POD committee members can update any profile
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND team = 'POD committee'
        ))
    );

-- Create policy for POD committee to insert profiles
CREATE POLICY "POD committee can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND team = 'POD committee'
        )
    );

-- Create policy for POD committee to delete profiles
CREATE POLICY "POD committee can delete profiles" ON public.profiles
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND team = 'POD committee'
        )
    );

-- Step 5: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
-- Note: Function permissions are handled by SECURITY DEFINER in the function definition

-- Step 6: Add comment explaining the setup
COMMENT ON CONSTRAINT profiles_auth_check ON public.profiles IS 
'Ensures POD committee members have valid auth users, while allowing other teams to use generated UUIDs';

COMMENT ON FUNCTION is_valid_auth_user(UUID) IS 
'Checks if a UUID corresponds to a valid auth user in the Supabase auth system';
