-- ============================================================
-- MiniOS · business_name
-- Nombre real del negocio (antes: 'Minisúper AXIO', sembrado en 0003_settings).
-- Solo actualiza si sigue con el valor de fábrica, para no pisar un cambio hecho
-- desde Config → Perfil del negocio.
-- ============================================================
update public.business_settings
   set name = 'Minisúper Demo'
 where id = 1
   and name in ('Minisúper AXIO', '');
