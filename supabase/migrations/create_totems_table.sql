-- Create Totems Table
CREATE TABLE IF NOT EXISTS public.totems (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  status text DEFAULT 'online', -- 'online' or 'offline'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.totems ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public totems are viewable by everyone" 
ON public.totems FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert totems" 
ON public.totems FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update totems" 
ON public.totems FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete totems" 
ON public.totems FOR DELETE 
USING (auth.role() = 'authenticated');

-- Seed initial data (optional, based on existing constants)
INSERT INTO public.totems (name, address, lat, lng, status)
VALUES 
('Totem Ponte', 'Av. Roberto Silveira - Centro', -23.2198, -44.7185, 'online'),
('Totem Matriz', 'Praça da Matriz - Centro Histórico', -23.2205, -44.7125, 'online'),
('Totem Cais', 'Cais de Turismo', -23.2215, -44.7135, 'offline');
