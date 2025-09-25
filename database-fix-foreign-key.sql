-- Fix foreign key constraint issue
-- Remove the foreign key constraint that prevents creating profiles with random UUIDs

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
