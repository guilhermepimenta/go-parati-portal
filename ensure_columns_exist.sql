
-- Garante que as colunas necessárias existem.
-- Se já existirem, esse comando não fará nada (não gera erro).

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS schedule text DEFAULT '';

-- Atualiza datas nulas para evitar problemas de ordenação
UPDATE public.events 
SET created_at = timezone('utc'::text, now()) 
WHERE created_at IS NULL;
