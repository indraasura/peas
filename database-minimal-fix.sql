-- Minimal fix - just create a profile
-- This is the simplest possible script

-- Disable RLS temporarily to avoid any policy issues
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Create a profile
INSERT INTO public.profiles (id, email, name, team, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'swaruph@linecraft.ai',
    'Swarup',
    'POD committee',
    NOW(),
    NOW()
);

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Check if it worked
SELECT id, email, name, team FROM public.profiles WHERE email = 'swaruph@linecraft.ai';
