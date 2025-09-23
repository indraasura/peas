-- Clean up duplicate profiles in the database
-- This script removes duplicate profiles and keeps only one profile per email

-- Step 1: Identify duplicate profiles
SELECT 
    email, 
    COUNT(*) as duplicate_count,
    array_agg(id) as profile_ids
FROM public.profiles 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Step 2: Create a temporary table with unique profiles
-- Keep the profile with the earliest created_at timestamp
CREATE TEMP TABLE unique_profiles AS
SELECT DISTINCT ON (email) 
    id,
    email,
    name,
    team,
    created_at,
    updated_at
FROM public.profiles 
ORDER BY email, created_at ASC;

-- Step 3: Show what will be deleted
SELECT 
    p.id as profile_to_delete,
    p.email,
    p.name,
    p.team,
    p.created_at,
    up.id as profile_to_keep,
    up.created_at as kept_profile_created_at
FROM public.profiles p
LEFT JOIN unique_profiles up ON p.email = up.email
WHERE p.id != up.id
ORDER BY p.email, p.created_at;

-- Step 4: Delete duplicate profiles (keep only the first created profile for each email)
DELETE FROM public.profiles 
WHERE id IN (
    SELECT p.id
    FROM public.profiles p
    LEFT JOIN unique_profiles up ON p.email = up.email
    WHERE p.id != up.id
);

-- Step 5: Verify no duplicates remain
SELECT 
    email, 
    COUNT(*) as count
FROM public.profiles 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Step 6: Show final profile count
SELECT COUNT(*) as total_profiles FROM public.profiles;

SELECT 'Duplicate profiles cleaned up successfully' as status;
