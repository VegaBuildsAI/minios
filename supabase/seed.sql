-- ============================================================
-- MiniOS · seed (solo desarrollo local)
-- Usuario superadmin (magic link, sin contraseña) + catálogo CR.
-- ============================================================

-- ---------- Usuario inicial: superadmin ----------
-- Al insertar en auth.users se dispara handle_new_user() que crea el
-- profile con role='superadmin' desde raw_user_meta_data.
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'admin@minios.test',
  null, now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Michael"}',
  now(), now(),
  '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@minios.test"}',
  'email', now(), now(), now()
) on conflict (provider_id, provider) do nothing;

-- El trigger crea todo perfil como 'staff' (el rol ya no viene del cliente).
-- El seed corre como postgres (sin auth.uid()), así que el guard permite ascenderlo.
update public.profiles set role = 'superadmin' where id = '11111111-1111-1111-1111-111111111111';

-- ---------- Catálogo CR ----------
with cat as (
  insert into public.categories (name, color, icon, sort_order) values
    ('Granos y Abarrotes', '#f59e0b', '🌾', 1),
    ('Bebidas',            '#3b82f6', '🥤', 2),
    ('Lácteos y Huevos',   '#22c55e', '🥛', 3),
    ('Panadería',          '#a855f7', '🍞', 4),
    ('Limpieza',           '#06b6d4', '🧼', 5),
    ('Cuidado Personal',   '#ec4899', '🪥', 6),
    ('Snacks y Golosinas', '#ef4444', '🍫', 7),
    ('Enlatados',          '#64748b', '🥫', 8)
  returning id, name
),
sup as (
  insert into public.suppliers (name, phone, visit_days) values
    ('Distribuidora CR', '2200-1010', array['lunes','jueves']),
    ('Dos Pinos',        '2100-2020', array['martes','viernes']),
    ('FEMSA',            '2300-3030', array['miercoles']),
    ('La Económica',     '2400-4040', array['lunes'])
  returning id, name
)
insert into public.products (name, sku, category_id, unit, cost_price, sale_price, stock_qty, min_qty, supplier_id)
select p.name, p.sku, cat.id, p.unit, p.cost, p.price, p.stock, p.min, sup.id
from (values
  -- Granos y Abarrotes
  ('Arroz Blanco 1kg','ABA-001','Granos y Abarrotes','unidad',700,900,38,10,'Distribuidora CR'),
  ('Frijol Negro 900g','ABA-002','Granos y Abarrotes','unidad',1050,1350,24,8,'Distribuidora CR'),
  ('Aceite Vegetal 1L','ABA-003','Granos y Abarrotes','unidad',1650,2100,6,8,'Distribuidora CR'),
  ('Azúcar Blanca 2kg','ABA-004','Granos y Abarrotes','unidad',1400,1800,19,6,'Distribuidora CR'),
  ('Sal 1kg','ABA-005','Granos y Abarrotes','unidad',400,600,40,8,'Distribuidora CR'),
  ('Café Molido 500g','ABA-006','Granos y Abarrotes','unidad',2500,3200,9,5,'Distribuidora CR'),
  ('Pasta Espagueti 200g','ABA-007','Granos y Abarrotes','unidad',450,650,55,12,'Distribuidora CR'),
  ('Harina de Trigo 1kg','ABA-008','Granos y Abarrotes','unidad',750,1000,21,6,'Distribuidora CR'),
  ('Avena 400g','ABA-009','Granos y Abarrotes','unidad',800,1100,14,5,'Distribuidora CR'),
  ('Salsa de Tomate 215g','ABA-010','Granos y Abarrotes','unidad',500,750,28,8,'Distribuidora CR'),
  -- Bebidas
  ('Gaseosa Cola 2.5L','BEB-001','Bebidas','unidad',1300,1700,31,10,'FEMSA'),
  ('Gaseosa Naranja 2.5L','BEB-002','Bebidas','unidad',1300,1700,12,10,'FEMSA'),
  ('Agua Embotellada 600ml','BEB-003','Bebidas','unidad',250,500,60,20,'FEMSA'),
  ('Jugo de Naranja 1L','BEB-004','Bebidas','unidad',900,1300,8,6,'FEMSA'),
  ('Cerveza Imperial 350ml','BEB-005','Bebidas','unidad',700,1100,48,24,'FEMSA'),
  ('Té Frío 500ml','BEB-006','Bebidas','unidad',500,800,22,10,'FEMSA'),
  ('Bebida Energética 250ml','BEB-007','Bebidas','unidad',900,1400,15,8,'FEMSA'),
  ('Gaseosa Lata 350ml','BEB-008','Bebidas','unidad',450,700,40,15,'FEMSA'),
  -- Lácteos y Huevos
  ('Leche Entera 1L','LAC-001','Lácteos y Huevos','unidad',700,950,4,12,'Dos Pinos'),
  ('Leche Semidescremada 1L','LAC-002','Lácteos y Huevos','unidad',700,950,16,12,'Dos Pinos'),
  ('Huevos 30u','LAC-003','Lácteos y Huevos','unidad',2800,3600,15,5,'Dos Pinos'),
  ('Queso Turrialba 500g','LAC-004','Lácteos y Huevos','unidad',2200,2900,7,4,'Dos Pinos'),
  ('Yogurt 1L','LAC-005','Lácteos y Huevos','unidad',1200,1600,11,6,'Dos Pinos'),
  ('Natilla 400g','LAC-006','Lácteos y Huevos','unidad',900,1250,13,6,'Dos Pinos'),
  ('Mantequilla 200g','LAC-007','Lácteos y Huevos','unidad',1100,1500,9,5,'Dos Pinos'),
  ('Queso Amarillo 200g','LAC-008','Lácteos y Huevos','unidad',1300,1750,6,5,'Dos Pinos'),
  -- Panadería
  ('Pan Cuadrado','PAN-001','Panadería','unidad',1050,1450,9,6,'Distribuidora CR'),
  ('Pan Baguette','PAN-002','Panadería','unidad',500,800,14,6,'Distribuidora CR'),
  ('Tortillas de Maíz 500g','PAN-003','Panadería','unidad',550,800,22,8,'Distribuidora CR'),
  ('Galletas Soda 200g','PAN-004','Panadería','unidad',600,900,26,10,'Distribuidora CR'),
  ('Repostería Surtida','PAN-005','Panadería','unidad',400,700,12,6,'Distribuidora CR'),
  -- Limpieza
  ('Jabón en Barra','LIM-001','Limpieza','unidad',450,650,27,10,'La Económica'),
  ('Papel Higiénico 4u','LIM-002','Limpieza','unidad',1800,2400,12,6,'La Económica'),
  ('Detergente 1kg','LIM-003','Limpieza','unidad',1600,2100,10,5,'La Económica'),
  ('Cloro 1L','LIM-004','Limpieza','unidad',700,1000,18,6,'La Económica'),
  ('Lavaplatos 500ml','LIM-005','Limpieza','unidad',900,1300,14,6,'La Económica'),
  ('Servilletas 100u','LIM-006','Limpieza','unidad',600,900,20,8,'La Económica'),
  ('Bolsas de Basura 10u','LIM-007','Limpieza','unidad',800,1200,16,6,'La Económica'),
  -- Cuidado Personal
  ('Pasta Dental 100ml','CUI-001','Cuidado Personal','unidad',900,1300,13,6,'La Económica'),
  ('Jabón de Baño','CUI-002','Cuidado Personal','unidad',600,950,19,8,'La Económica'),
  ('Shampoo 400ml','CUI-003','Cuidado Personal','unidad',1700,2300,8,4,'La Económica'),
  ('Desodorante','CUI-004','Cuidado Personal','unidad',1400,1950,10,5,'La Económica'),
  ('Papel Toalla 2u','CUI-005','Cuidado Personal','unidad',1200,1650,9,5,'La Económica'),
  -- Snacks y Golosinas
  ('Papas Fritas 150g','SNK-001','Snacks y Golosinas','unidad',700,1100,30,12,'Distribuidora CR'),
  ('Chocolate Barra','SNK-002','Snacks y Golosinas','unidad',450,750,44,15,'Distribuidora CR'),
  ('Chicles','SNK-003','Snacks y Golosinas','unidad',200,400,60,20,'Distribuidora CR'),
  ('Galletas Dulces 120g','SNK-004','Snacks y Golosinas','unidad',500,800,25,10,'Distribuidora CR'),
  ('Maní Salado 100g','SNK-005','Snacks y Golosinas','unidad',550,850,18,8,'Distribuidora CR'),
  -- Enlatados
  ('Atún en Lata 140g','ENL-001','Enlatados','unidad',900,1250,33,10,'Distribuidora CR'),
  ('Frijoles Molidos 400g','ENL-002','Enlatados','unidad',700,1000,20,8,'Distribuidora CR'),
  ('Sardinas 155g','ENL-003','Enlatados','unidad',750,1100,15,6,'Distribuidora CR'),
  ('Maíz Dulce 220g','ENL-004','Enlatados','unidad',600,900,17,6,'Distribuidora CR'),
  ('Salchichas en Lata 200g','ENL-005','Enlatados','unidad',950,1350,12,6,'Distribuidora CR')
) as p(name, sku, cat_name, unit, cost, price, stock, min, sup_name)
join cat on cat.name = p.cat_name
join sup on sup.name = p.sup_name;
