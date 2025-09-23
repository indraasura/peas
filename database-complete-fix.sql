-- Complete fix for authentication issues
-- This script should work without errors

-- Step 1: Disable RLS temporarily
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile insertion" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile deletion" ON public.profiles;

-- Step 3: Clear all profiles
DELETE FROM public.profiles;

-- Step 4: Create a profile for swaruph@linecraft.ai
INSERT INTO public.profiles (id, email, name, team, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'swaruph@linecraft.ai',
    'Swarup',
    'POD committee',
    NOW(),
    NOW()
);

-- Step 5: Create simple policies
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (true);

CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE USING (true);

-- Step 6: Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 7: Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;

-- Step 8: Verify everything works
SELECT COUNT(*) as profile_count FROM public.profiles;

-- Step 9: Show the created profile
SELECT id, email, name, team, created_at
FROM public.profiles 
WHERE email = 'swaruph@linecraft.ai';
