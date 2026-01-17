
-- 1. Create Profiles Table (extends auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  name text,
  role text check (role in ('admin', 'user', 'intern')) default 'user',
  email text
);

-- 2. Create Businesses Table
create table public.businesses (
  id text primary key, -- Keeping text to match "1", "2" from mock, can be uuid later
  name text not null,
  category text not null,
  description text,
  long_description text,
  rating numeric,
  review_count integer,
  price_level integer,
  image_url text,
  gallery text[],
  location jsonb, -- Stores { lat, lng, address }
  amenities text[],
  opening_hours jsonb,
  is_featured boolean default false,
  status text default 'published',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Create Totems Table
create table public.totems (
  id text primary key,
  name text not null,
  status text not null,
  location jsonb,
  last_maintenance timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Create Events Table
create table public.events (
  id text primary key,
  title text,
  description text,
  image_url text,
  button_text text,
  button_link text,
  is_active boolean default true
);

-- 5. Enable Row Level Security (RLS) - Optional for now but good practice
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.totems enable row level security;
alter table public.events enable row level security;

-- Policies (Public Read Access)
create policy "Public businesses are viewable by everyone" on public.businesses for select using (true);
create policy "Public totems are viewable by everyone" on public.totems for select using (true);
create policy "Public events are viewable by everyone" on public.events for select using (true);

-- Insert Initial Data (From MOCK_DATA)
insert into public.businesses 
(id, name, category, description, long_description, rating, review_count, price_level, image_url, gallery, location, amenities, opening_hours, is_featured)
values
('1', 'Restaurante do Porto', 'Gastronomia', 'Culinária caiçara tradicional com frutos do mar frescos e vista para o cais.', 'Aninhado no coração do Centro Histórico de Paraty, o Restaurante do Porto oferece uma jornada culinária através dos sabores ricos da cozinha costeira brasileira. Alojado num edifício colonial preservado do século XVIII, o nosso ambiente combina o charme rústico com o conforto moderno.', 4.8, 120, 3, 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&q=80&w=800', ARRAY['https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&q=80&w=800', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=800', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=800'], '{"lat": -23.2201, "lng": -44.7135, "address": "Rua do Comércio, 12 - Centro Histórico"}', ARRAY['Wi-Fi Grátis', 'Ar Condicionado', 'Mesas Externas', 'Pet Friendly', 'Música ao Vivo'], '{"Seg - Qui": "12:00 - 22:00", "Sex - Sáb": "12:00 - 23:30", "Dom": "12:00 - 22:00"}', true),

('2', 'Igreja Santa Rita', 'História', 'O cartão postal de Paraty, construída em 1722 por pardos libertos.', 'Símbolo máximo de Paraty, esta igreja em estilo barroco-rococó abriga o Museu de Arte Sacra. Sua arquitetura é um testemunho da sofisticação colonial brasileira.', 4.9, 450, 1, 'https://images.unsplash.com/photo-1582234033109-cc86a60e0d5e?auto=format&fit=crop&q=80&w=800', null, '{"lat": -23.2198, "lng": -44.7118, "address": "Largo de Santa Rita - Centro Histórico"}', null, null, true),

('3', 'Caminho do Ouro', 'Aventura', 'Trilha histórica pavimentada por escravos no século XVIII.', 'Siga os passos dos colonizadores nesta trilha preservada que liga Paraty a Minas Gerais. Uma imersão na Mata Atlântica e na história do ciclo do ouro.', 4.7, 85, 2, 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=800', null, '{"lat": -23.2355, "lng": -44.8021, "address": "Estrada Paraty-Cunha, km 10"}', null, null, false),

('4', 'Pousada Literária', 'Hospedagem', 'Luxo e cultura no coração do Centro Histórico.', null, 4.9, 320, 4, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800', null, '{"lat": -23.2215, "lng": -44.7145, "address": "Rua do Comércio, 362"}', null, null, false),

('5', 'Armazém Paraty', 'Comércio', 'Artesanato local, cerâmicas e souvenirs feitos por artistas da região.', null, 4.6, 64, 2, 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=800', null, '{"lat": -23.2192, "lng": -44.7138, "address": "Rua da Lapa, 15"}', null, null, false),

('6', 'Forte Defensor Perpétuo', 'História', 'Museu e antigo forte com vista panorâmica da baía.', null, 4.8, 215, 1, 'https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?auto=format&fit=crop&q=80&w=800', null, '{"lat": -23.2136, "lng": -44.7126, "address": "Morro da Vila Velha"}', null, null, false);

-- Insert Initial Totems
insert into public.totems (id, name, status, location) values
('t1', 'Totem Praça da Matriz', 'online', '{"lat": -23.2212, "lng": -44.7128, "address": "Praça da Matriz, S/N - Centro"}'),
('t2', 'Totem Cais do Porto', 'online', '{"lat": -23.2205, "lng": -44.7115, "address": "Rua Beira Rio, Próximo ao Cais"}'),
('t3', 'Totem Rodoviária', 'online', '{"lat": -23.2185, "lng": -44.7192, "address": "Rua Jabaquara - Entrada Rodoviária"}'),
('t4', 'Totem Estacionamento Jabaquara', 'offline', '{"lat": -23.2105, "lng": -44.7155, "address": "Av. Jabaquara, Orla"}');

-- Insert Featured Event
insert into public.events (id, title, description, image_url, button_text, button_link, is_active) values
('evt-1', 'Festival da Cachaça, Cultura e Sabores', 'Venha celebrar a tradição de Paraty! Degustações exclusivas, música ao vivo e o melhor da gastronomia local esperam por você no coração do centro histórico.', 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?auto=format&fit=crop&q=80&w=1200', 'Ver Programação Completa', '#', true);
