-- Fix RLS Infinite Recursion Error
-- Run this in your Supabase SQL Editor

-- Drop ALL existing policies on profiles table to avoid conflicts
DROP POLICY IF EXISTS "Allow all reads" ON public.profiles;
DROP POLICY IF EXISTS "Allow POD committee profile management" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile inserts" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated profile inserts" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated profile management" ON public.profiles;

-- Create new policies that don't cause recursion
-- Allow all reads (no recursion issue here)
CREATE POLICY "Allow all reads" ON public.profiles FOR SELECT USING (true);

-- Allow authenticated users to insert profiles (for signup)
CREATE POLICY "Allow authenticated profile inserts" ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update own profile" ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Allow authenticated users to manage profiles (for POD committee members)
-- This uses auth.uid() directly instead of querying profiles table
CREATE POLICY "Allow authenticated profile management" ON public.profiles FOR ALL 
USING (auth.uid() IS NOT NULL);
