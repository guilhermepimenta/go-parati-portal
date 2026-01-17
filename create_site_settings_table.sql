-- Create Site Settings Table
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hero_background_url text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public site settings are viewable by everyone" 
ON public.site_settings FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can update site settings" 
ON public.site_settings FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert site settings" 
ON public.site_settings FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Insert default row if not exists
INSERT INTO public.site_settings (hero_background_url)
SELECT 'https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?q=80&w=2070&auto=format&fit=crop'
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings);
