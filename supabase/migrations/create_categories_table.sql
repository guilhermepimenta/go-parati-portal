-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read access"
ON public.categories FOR SELECT
USING (true);

CREATE POLICY "Admin full access"
ON public.categories FOR ALL
USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- Insert default categories
INSERT INTO public.categories (name, slug)
VALUES
    ('Gastronomia', 'gastronomia'),
    ('História', 'historia'),
    ('Aventura', 'aventura'),
    ('Hospedagem', 'hospedagem'),
    ('Comércio', 'comercio'),
    ('Eventos', 'eventos'),
    ('Totem', 'totem')
ON CONFLICT (name) DO NOTHING;
