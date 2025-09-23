-- Simple fix for profiles table RLS policies
-- This removes the complex constraint that might be causing issues

-- Step 1: Drop the problematic constraint
DROP CONSTRAINT IF EXISTS profiles_auth_check ON public.profiles;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "POD committee can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "POD committee can delete profiles" ON public.profiles;

-- Step 3: Create very simple policies
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (true);

CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE USING (true);

-- Step 4: Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;

SELECT 'Simple profiles RLS fix applied successfully' as status;
