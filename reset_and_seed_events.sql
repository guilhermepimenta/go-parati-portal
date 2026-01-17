
-- 1. Limpa todos os eventos existentes para remover duplicatas
DELETE FROM public.events;

-- 2. Insere UM único evento oficial
INSERT INTO public.events (title, description, image_url, button_text, button_link, is_active, created_at)
VALUES (
  'Festival da Cachaça, Cultura e Sabores',
  'Venha celebrar a tradição de Paraty! Degustações exclusivas, música ao vivo e o melhor da gastronomia local esperam por você no coração do centro histórico.',
  'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=1000', 
  'Ver Programação Completa',
  '#',
  true,
  timezone('utc'::text, now())
);
