-- ============================================================
-- MiniOS · 0008_ai_actions
-- Acciones que el asistente/IA PROPONE y el usuario confirma. Se ejecutan como una
-- sola transacción (todo o nada) y solo para dueño/superadmin. SECURITY INVOKER:
-- además del chequeo explícito, RLS sigue aplicándose en cada tabla.
-- ============================================================

-- Aplica una factura de proveedor ya leída: crea la orden RECIBIDA, sus líneas y las
-- entradas de inventario (el trigger de stock_movements sube el inventario), y marca la
-- captura como procesada para que no se aplique dos veces.
-- p_lines: [{ "product_id": uuid, "qty": número > 0, "cost": número >= 0 }, ...]
create or replace function public.apply_invoice(p_capture uuid, p_supplier uuid, p_lines jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_po    uuid;
  v_total numeric := 0;
  l       jsonb;
begin
  if not public.is_owner_up() then
    raise exception 'Solo dueño o superadmin puede aplicar facturas al inventario' using errcode = '42501';
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 or jsonb_array_length(p_lines) > 100 then
    raise exception 'La factura debe tener entre 1 y 100 líneas';
  end if;
  if exists (
    select 1 from public.captures
     where id = p_capture and (status = 'procesado' or parsed_json->'applied' is not null)
  ) then
    raise exception 'Esta factura ya fue aplicada';
  end if;

  for l in select * from jsonb_array_elements(p_lines) loop
    if (l->>'qty')::numeric <= 0 or (l->>'qty')::numeric > 100000 or (l->>'cost')::numeric < 0 then
      raise exception 'Cantidad o costo inválido en una línea';
    end if;
    v_total := v_total + (l->>'qty')::numeric * (l->>'cost')::numeric;
  end loop;

  insert into public.purchase_orders (supplier_id, status, total, received_at)
  values (p_supplier, 'recibida', v_total, now())
  returning id into v_po;

  for l in select * from jsonb_array_elements(p_lines) loop
    insert into public.purchase_items (po_id, product_id, qty_ordered, qty_received, unit_cost)
    values (v_po, (l->>'product_id')::uuid, (l->>'qty')::numeric, (l->>'qty')::numeric, (l->>'cost')::numeric);

    insert into public.stock_movements (product_id, delta, reason, reference_id, created_by)
    values ((l->>'product_id')::uuid, (l->>'qty')::numeric, 'purchase', v_po, auth.uid());
  end loop;

  update public.captures
     set status = 'procesado',
         confirmed_at = now(),
         parsed_json = coalesce(parsed_json, '{}'::jsonb)
                       || jsonb_build_object('applied', jsonb_build_object('po_id', v_po, 'at', now()))
   where id = p_capture;

  return v_po;
end;
$$;

-- Crea una orden de compra en borrador (no mueve inventario hasta recibirla).
-- p_items: [{ "product_id": uuid, "qty": número > 0, "cost": número >= 0 }, ...]
create or replace function public.create_purchase_order(p_supplier uuid, p_items jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_po    uuid;
  v_total numeric := 0;
  l       jsonb;
begin
  if not public.is_owner_up() then
    raise exception 'Solo dueño o superadmin puede crear órdenes de compra' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'La orden debe tener entre 1 y 100 productos';
  end if;

  for l in select * from jsonb_array_elements(p_items) loop
    if (l->>'qty')::numeric <= 0 or (l->>'qty')::numeric > 100000 or (l->>'cost')::numeric < 0 then
      raise exception 'Cantidad o costo inválido en un producto';
    end if;
    v_total := v_total + (l->>'qty')::numeric * (l->>'cost')::numeric;
  end loop;

  insert into public.purchase_orders (supplier_id, status, total)
  values (p_supplier, 'borrador', v_total)
  returning id into v_po;

  for l in select * from jsonb_array_elements(p_items) loop
    insert into public.purchase_items (po_id, product_id, qty_ordered, qty_received, unit_cost)
    values (v_po, (l->>'product_id')::uuid, (l->>'qty')::numeric, 0, (l->>'cost')::numeric);
  end loop;

  return v_po;
end;
$$;

revoke all on function public.apply_invoice(uuid, uuid, jsonb) from public, anon;
revoke all on function public.create_purchase_order(uuid, jsonb) from public, anon;
grant execute on function public.apply_invoice(uuid, uuid, jsonb) to authenticated;
grant execute on function public.create_purchase_order(uuid, jsonb) to authenticated;
