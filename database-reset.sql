-- POD Management Database Reset
-- WARNING: This will delete all data! Use only if you want to start fresh.
-- Run this in your Supabase SQL Editor

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS public.area_comments CASCADE;
DROP TABLE IF EXISTS public.area_decision_quorum CASCADE;
DROP TABLE IF EXISTS public.pod_notes CASCADE;
DROP TABLE IF EXISTS public.pod_members CASCADE;
DROP TABLE IF EXISTS public.pod_dependencies CASCADE;
DROP TABLE IF EXISTS public.pods CASCADE;
DROP TABLE IF EXISTS public.areas CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop the trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Now run the database-schema.sql file to recreate everything fresh
