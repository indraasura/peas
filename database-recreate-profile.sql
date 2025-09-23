-- Recreate profile for swaruph@linecraft.ai
-- Run this if the profile was accidentally deleted

-- Step 1: Check if profile already exists
SELECT 
    id,
    email,
    name,
    team,
    created_at
FROM public.profiles 
WHERE email = 'swaruph@linecraft.ai';

-- Step 2: If no profile exists, create one
-- Note: Replace 'your-user-id-here' with the actual user ID from Supabase auth
-- You can find this in the Supabase auth users table

-- First, let's see what auth users exist
-- (This query might not work depending on permissions, but worth trying)
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE email = 'swaruph@linecraft.ai';

-- Step 3: Create profile manually (replace the ID with actual auth user ID)
-- Uncomment and modify the following lines:

/*
INSERT INTO public.profiles (id, email, name, team, created_at, updated_at)
VALUES (
    'your-auth-user-id-here',  -- Replace with actual user ID from auth.users
    'swaruph@linecraft.ai',
    'Swarup',
    'POD committee',
    NOW(),
    NOW()
);
*/

-- Step 4: Alternative - create profile with generated UUID (for testing)
-- This creates a profile without linking to auth user
INSERT INTO public.profiles (id, email, name, team, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'swaruph@linecraft.ai',
    'Swarup',
    'POD committee',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    team = EXCLUDED.team,
    updated_at = NOW();

-- Step 5: Verify the profile was created
SELECT 
    id,
    email,
    name,
    team,
    created_at
FROM public.profiles 
WHERE email = 'swaruph@linecraft.ai';

SELECT 'Profile recreation completed' as status;
