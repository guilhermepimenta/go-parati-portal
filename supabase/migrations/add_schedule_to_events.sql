
-- Add a 'schedule' column to the events table to store the full programming text
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS schedule text DEFAULT '';
