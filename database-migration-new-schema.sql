-- Migration script for new Area and POD schema
-- Run this in your Supabase SQL Editor

-- Add new columns to areas table
ALTER TABLE public.areas 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Update areas status column to support new values
-- First, update existing data to use new status values
UPDATE public.areas 
SET status = CASE 
  WHEN status = 'backlog' THEN 'Backlog'
  WHEN status = 'planned' THEN 'Planned'
  ELSE 'Backlog'
END;

-- Add new columns to pods table
ALTER TABLE public.pods 
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Update pods status column to support new values
-- First, update existing data to use new status values
UPDATE public.pods 
SET status = CASE 
  WHEN status = 'backlog' THEN 'Awaiting development'
  WHEN status = 'planning' THEN 'Awaiting development'
  WHEN status = 'in development' THEN 'In development'
  WHEN status = 'testing' THEN 'In testing'
  WHEN status = 'released' THEN 'Released'
  ELSE 'Awaiting development'
END;

-- Make area_id nullable in pods table since PODs can exist without areas initially
ALTER TABLE public.pods 
ALTER COLUMN area_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL values
ALTER TABLE public.pods 
DROP CONSTRAINT IF EXISTS pods_area_id_fkey;

ALTER TABLE public.pods 
ADD CONSTRAINT pods_area_id_fkey 
FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE SET NULL;

-- Add check constraints for status values
ALTER TABLE public.areas 
DROP CONSTRAINT IF EXISTS areas_status_check;

ALTER TABLE public.areas 
ADD CONSTRAINT areas_status_check 
CHECK (status IN ('Backlog', 'Planning', 'Planned', 'Executing', 'Released'));

ALTER TABLE public.pods 
DROP CONSTRAINT IF EXISTS pods_status_check;

ALTER TABLE public.pods 
ADD CONSTRAINT pods_status_check 
CHECK (status IN ('Awaiting development', 'In development', 'In testing', 'Released'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_areas_status ON public.areas(status);
CREATE INDEX IF NOT EXISTS idx_pods_status ON public.pods(status);
CREATE INDEX IF NOT EXISTS idx_pods_area_id ON public.pods(area_id);

-- Update RLS policies if needed (they should already exist from previous migrations)
-- No changes needed to RLS policies as they are already set up correctly
