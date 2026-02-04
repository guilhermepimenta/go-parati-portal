
-- 1. Habilita RLS na tabela events (segurança)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 2. Limpa políticas antigas para evitar conflitos/duplicatas
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can do everything on events" ON public.events;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.events;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.events;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.events;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.events;

-- 3. Cria política de LEITURA para TODOS (público)
CREATE POLICY "Public events are viewable by everyone" 
ON public.events FOR SELECT 
USING (true);

-- 4. Cria política de ESCRITA TOTAL para usuários logados (Admin)
CREATE POLICY "Authenticated users can do everything on events" 
ON public.events FOR ALL 
USING (auth.role() = 'authenticated');
