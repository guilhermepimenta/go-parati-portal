-- 1. Drop the incorrect table to start fresh
DROP TABLE IF EXISTS public.totems;

-- 2. Create the table with ALL required columns
CREATE TABLE public.totems (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL, -- This was missing
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  status text DEFAULT 'online',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Enable Security
ALTER TABLE public.totems ENABLE ROW LEVEL SECURITY;

-- 4. Re-create Policies
CREATE POLICY "Public totems are viewable by everyone" ON public.totems FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert totems" ON public.totems FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update totems" ON public.totems FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete totems" ON public.totems FOR DELETE USING (auth.role() = 'authenticated');

-- 5. Insert Data
INSERT INTO public.totems (name, address, lat, lng, status) VALUES 
('Totem Praça da Matriz', 'Praça da Matriz, S/N - Centro', -23.2212, -44.7128, 'online'),
('Totem Cais do Porto', 'Rua Beira Rio, Próximo ao Cais', -23.2205, -44.7115, 'online'),
('Totem Rodoviária', 'Rua Jabaquara - Entrada Rodoviária', -23.2185, -44.7192, 'online'),
('Totem Estacionamento Jabaquara', 'Av. Jabaquara, Orla', -23.2105, -44.7155, 'offline');
