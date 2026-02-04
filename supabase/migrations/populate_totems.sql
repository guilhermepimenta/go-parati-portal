-- Clean up existing bad data (optional, but good for clean slate)
DELETE FROM public.totems;

-- Insert original data from constants.tsx
INSERT INTO public.totems (name, address, lat, lng, status) VALUES 
('Totem Praça da Matriz', 'Praça da Matriz, S/N - Centro', -23.2212, -44.7128, 'online'),
('Totem Cais do Porto', 'Rua Beira Rio, Próximo ao Cais', -23.2205, -44.7115, 'online'),
('Totem Rodoviária', 'Rua Jabaquara - Entrada Rodoviária', -23.2185, -44.7192, 'online'),
('Totem Estacionamento Jabaquara', 'Av. Jabaquara, Orla', -23.2105, -44.7155, 'offline');
