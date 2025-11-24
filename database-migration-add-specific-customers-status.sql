-- Migration script to add 'Released to specific customers' status to PODs
-- Run this in your Supabase SQL Editor

-- First, drop the existing check constraint
ALTER TABLE public.pods 
DROP CONSTRAINT IF EXISTS pods_status_check;

-- Update the check constraint to include the new status
ALTER TABLE public.pods 
ADD CONSTRAINT pods_status_check 
CHECK (status IN ('Awaiting development', 'In development', 'In testing', 'Released to specific customers', 'Released'));

-- Update the index to ensure good performance with the new status
DROP INDEX IF EXISTS idx_pods_status;
CREATE INDEX IF NOT EXISTS idx_pods_status ON public.pods(status);

-- Update any existing 'Released' PODs that should be 'Released to specific customers'
-- This is optional - only run if you have existing PODs that should be in this new status
-- UPDATE public.pods 
-- SET status = 'Released to specific customers'
-- WHERE status = 'Released' AND [your_condition_here];
