-- Simple script to check profiles table
-- This should work without errors

-- Check total profile count
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- Show all profiles
SELECT 
    id,
    email,
    name,
    team,
    created_at
FROM public.profiles 
ORDER BY created_at DESC;

-- Check specific email
SELECT 
    id,
    email,
    name,
    team,
    created_at
FROM public.profiles 
WHERE email = 'swaruph@linecraft.ai';
