-- ============================================================
-- MiniOS · caja_tickets
-- La venta se cobra en la caja registradora (imprime tiquete). MiniOS ya no es punto de
-- venta: la Caja es el libro de entradas y salidas de efectivo.
--  · Cada tiquete se fotografía, la IA lo lee y el usuario enruta cada línea a un
--    producto: se registra como venta (sales + sale_items) y el trigger baja inventario.
--  · Salidas/entradas de efectivo que no son ventas (pago a proveedor, gasto, retiro del
--    dueño, fondo para cambio) van en cash_movements.
-- ============================================================

-- ---------- Tiquetes: la venta recuerda su foto y su número ----------
alter table public.sales
  add column if not exists capture_id    uuid references public.captures(id) on delete set null,
  add column if not exists ticket_number text;

-- Un tiquete (foto) se registra una sola vez.
create unique index if not exists uq_sales_capture on public.sales(capture_id) where capture_id is not null;

-- ---------- Entradas y salidas de efectivo ----------
create table if not exists public.cash_movements (
  id          uuid primary key default gen_random_uuid(),
  shift_id    uuid references public.shifts(id) on delete set null,
  kind        text not null check (kind in ('ingreso', 'pago_proveedor', 'gasto', 'retiro')),
  amount      numeric(12,2) not null check (amount > 0 and amount <= 100000000),
  note        text check (char_length(note) <= 300),
  supplier_id uuid references public.suppliers(id) on delete set null,
  created_by  uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);
create index if not exists idx_cash_movements_created on public.cash_movements(created_at);
create index if not exists idx_cash_movements_shift on public.cash_movements(shift_id);

alter table public.cash_movements enable row level security;

-- Todos leen y registran (el que registra queda como autor); solo owner+ borra.
drop policy if exists cash_movements_read on public.cash_movements;
create policy cash_movements_read on public.cash_movements for select to authenticated using (true);
drop policy if exists cash_movements_insert on public.cash_movements;
create policy cash_movements_insert on public.cash_movements for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists cash_movements_delete on public.cash_movements;
create policy cash_movements_delete on public.cash_movements for delete to authenticated
  using (public.is_owner_up());

revoke all on table public.cash_movements from anon;
grant select, insert, delete on table public.cash_movements to authenticated;

-- ---------- Registrar un tiquete (todo o nada) ----------
-- Crea la venta con el total del tiquete y una línea por producto enrutado; el trigger
-- deduct_stock_on_sale baja el inventario. Marca la foto como procesada.
-- p_lines: [{ "product_id": uuid, "qty": número > 0, "price": número >= 0 }, ...]
create or replace function public.register_ticket(
  p_capture uuid,
  p_shift   uuid,
  p_payment text,
  p_number  text,
  p_total   numeric,
  p_tax     numeric,
  p_lines   jsonb
)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_sale uuid;
  l      jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida' using errcode = '42501';
  end if;
  if p_payment not in ('efectivo', 'sinpe', 'tarjeta', 'fiado') then
    raise exception 'Método de pago inválido';
  end if;
  if p_total is null or p_total <= 0 or p_total > 100000000 then
    raise exception 'Total del tiquete inválido';
  end if;
  if coalesce(p_tax, 0) < 0 or coalesce(p_tax, 0) > p_total then
    raise exception 'IVA inválido';
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 or jsonb_array_length(p_lines) > 100 then
    raise exception 'El tiquete debe tener entre 1 y 100 productos';
  end if;
  if p_capture is not null and exists (select 1 from public.sales where capture_id = p_capture) then
    raise exception 'Este tiquete ya fue registrado';
  end if;

  for l in select * from jsonb_array_elements(p_lines) loop
    if (l->>'product_id') is null
       or (l->>'qty')::numeric <= 0 or (l->>'qty')::numeric > 100000
       or (l->>'price')::numeric < 0 then
      raise exception 'Cada línea necesita producto, cantidad y precio válidos';
    end if;
  end loop;

  insert into public.sales (staff_id, shift_id, payment_method, subtotal, tax, total, change_given, capture_id, ticket_number)
  values (auth.uid(), p_shift, p_payment, p_total - coalesce(p_tax, 0), coalesce(p_tax, 0), p_total, 0,
          p_capture, nullif(left(trim(coalesce(p_number, '')), 40), ''))
  returning id into v_sale;

  for l in select * from jsonb_array_elements(p_lines) loop
    insert into public.sale_items (sale_id, product_id, qty, unit_price)
    values (v_sale, (l->>'product_id')::uuid, (l->>'qty')::numeric, (l->>'price')::numeric);
  end loop;

  if p_capture is not null then
    update public.captures
       set status = 'procesado',
           confirmed_at = now(),
           parsed_json = coalesce(parsed_json, '{}'::jsonb)
                         || jsonb_build_object('applied', jsonb_build_object('sale_id', v_sale, 'at', now()))
     where id = p_capture;
  end if;

  return v_sale;
end;
$$;

revoke all on function public.register_ticket(uuid, uuid, text, text, numeric, numeric, jsonb) from public, anon;
grant execute on function public.register_ticket(uuid, uuid, text, text, numeric, numeric, jsonb) to authenticated;
