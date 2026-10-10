-- ============================================================
-- MiniOS · audit_hardening (auditoría 2026-10-10)
-- Endurecimiento sin cambio de comportamiento para la app:
--  1. anon sin privilegios sobre tablas de public (RLS ya lo bloqueaba; defensa en
--     profundidad) y sin TRUNCATE/TRIGGER/REFERENCES para nadie desde la API.
--  2. ai_sales_summary: anon no la ejecuta (quedaba con el grant explícito de Supabase).
--  3. Turnos: el personal solo puede cerrar un turno abierto (closed_at, closing_cash,
--     total_sales); ya no puede cambiar la apertura ni tocar turnos cerrados.
--  4. Ventas: staff_id debe ser quien registra (antes se podía firmar a nombre de otro).
--  5. Bitácora (Storage): solo el autor del archivo o owner+ lo modifica.
--  6. Índices de claves foráneas usadas por el tablero y los joins.
-- ============================================================

-- 1. Privilegios de tablas
revoke all on all tables in schema public from anon;
revoke truncate, trigger, references on all tables in schema public from authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke truncate, trigger, references on tables from authenticated;

-- 2. RPC de resumen de ventas
revoke execute on function public.ai_sales_summary(timestamptz, timestamptz) from anon;

-- 3. Turnos
drop policy if exists shifts_update on public.shifts;
create policy shifts_update on public.shifts for update to authenticated
  using (closed_at is null or public.is_owner_up())
  with check (true);
revoke update on public.shifts from authenticated;
grant update (closed_at, closing_cash, total_sales) on public.shifts to authenticated;

-- 4. Ventas a nombre de quien registra
drop policy if exists sales_insert on public.sales;
create policy sales_insert on public.sales for insert to authenticated
  with check (staff_id = auth.uid());

-- 5. Archivos de Bitácora
drop policy if exists bitacora_update on storage.objects;
create policy bitacora_update on storage.objects for update to authenticated
  using (bucket_id = 'bitacora' and (owner_id = auth.uid()::text or public.is_owner_up()));

-- 6. Índices
create index if not exists idx_sales_staff on public.sales(staff_id);
create index if not exists idx_po_supplier on public.purchase_orders(supplier_id);
create index if not exists idx_purchase_items_product on public.purchase_items(product_id);
create index if not exists idx_stock_movements_created on public.stock_movements(created_at);
