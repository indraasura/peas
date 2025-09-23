-- Prevent future duplicate profiles by adding unique constraint
-- Run this after cleaning up existing duplicates

-- Step 1: Add unique constraint on email column
-- This will prevent duplicate profiles with the same email
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- Step 2: Verify the constraint was added
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    confrelid::regclass as table_name
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
AND conname = 'profiles_email_unique';

-- Step 3: Test the constraint works
-- This should fail if you try to insert a duplicate email
-- INSERT INTO public.profiles (id, email, name, team) VALUES ('test-id', 'existing@email.com', 'Test', 'Engineering');

SELECT 'Unique constraint added successfully - duplicate profiles prevented' as status;
