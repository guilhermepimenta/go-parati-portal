
-- 1. Reset Total: Recria a tabela para garantir que todas as colunas existem
DROP TABLE IF EXISTS public.events;

CREATE TABLE public.events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  button_text text DEFAULT 'Saiba Mais',
  button_link text DEFAULT '#',
  is_active boolean DEFAULT true,
  schedule text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Configura Segurança (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public events are viewable by everyone" 
ON public.events FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can do everything on events" 
ON public.events FOR ALL 
USING (auth.role() = 'authenticated');

-- 3. Insere o dado inicial
INSERT INTO public.events (title, description, image_url, button_text, button_link, is_active, schedule, created_at)
VALUES (
  'Festival da Cachaça, Cultura e Sabores',
  'Venha celebrar a tradição de Paraty! Degustações exclusivas, música ao vivo e o melhor da gastronomia local esperam por você no coração do centro histórico.',
  'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=1000', 
  'Ver Programação Completa',
  '#',
  true,
  '12:00 - Abertura Oficial\n14:00 - Degustação Guiada\n19:00 - Show ao Vivo',
  timezone('utc'::text, now())
);
