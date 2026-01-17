-- Create Events table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    button_text TEXT,
    button_link TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read access" ON public.events
    FOR SELECT USING (true);

CREATE POLICY "Admin full access" ON public.events
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert a sample event if table is empty
INSERT INTO public.events (title, description, image_url, button_text, button_link, is_active)
SELECT 'Festival da Cachaça', 'Venha provar os melhores sabores de Paraty no tradicional festival.', 'https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e', 'Saiba Mais', '#', true
WHERE NOT EXISTS (SELECT 1 FROM public.events);
