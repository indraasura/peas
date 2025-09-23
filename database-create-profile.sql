-- Create a profile for swaruph@linecraft.ai
-- Simple script that should work

-- First check if profile already exists
SELECT id, email, name, team 
FROM public.profiles 
WHERE email = 'swaruph@linecraft.ai';

-- Create the profile (this will work even if profile exists due to ON CONFLICT)
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

-- Verify the profile was created
SELECT id, email, name, team, created_at
FROM public.profiles 
WHERE email = 'swaruph@linecraft.ai';
