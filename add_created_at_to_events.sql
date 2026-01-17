
-- Add the created_at column if it doesn't exist
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Update existing rows to have a valid created_at date (if they were null)
UPDATE public.events 
SET created_at = timezone('utc'::text, now()) 
WHERE created_at IS NULL;
