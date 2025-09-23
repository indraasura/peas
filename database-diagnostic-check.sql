-- Diagnostic script to check database state
-- Run this to see what profiles exist and identify the issue

-- Step 1: Check total profile count
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- Step 2: Show all profiles with their details
SELECT 
    id,
    email,
    name,
    team,
    created_at,
    updated_at
FROM public.profiles 
ORDER BY created_at DESC;

-- Step 3: Check for profiles by specific email (replace with your email)
-- Replace 'your-email@example.com' with the actual email you're trying to login with
SELECT 
    id,
    email,
    name,
    team,
    created_at
FROM public.profiles 
WHERE email = 'swaruph@linecraft.ai'  -- Replace with your actual email
ORDER BY created_at DESC;

-- Step 4: Check RLS policies on profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 5: Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- Step 6: Check table permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'profiles' 
AND table_schema = 'public';

SELECT 'Diagnostic check completed' as status;
