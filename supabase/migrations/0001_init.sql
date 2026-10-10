-- ============================================================
-- MiniOS · 0001_init
-- Esquema base: usuarios/roles, catálogo, ventas, inventario,
-- compras, caja y bitácora. RLS por rol + triggers de stock.
-- ============================================================

-- ---------- Helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles (extiende auth.users) ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'staff' check (role in ('superadmin', 'owner', 'staff')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Rol del usuario actual (SECURITY DEFINER evita recursión de RLS).
create or replace function public.auth_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_owner_up()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_role() in ('owner', 'superadmin'), false);
$$;

-- Crea el profile automáticamente al registrarse (magic link).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'staff')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Catálogo ----------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  color       text,
  icon        text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  visit_days  text[] not null default '{}',
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_suppliers_updated before update on public.suppliers
  for each row execute function public.set_updated_at();

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sku         text unique,
  barcode     text,
  category_id uuid references public.categories(id) on delete set null,
  unit        text not null default 'unidad',
  cost_price  numeric(12,2) not null default 0,
  sale_price  numeric(12,2) not null default 0,
  stock_qty   numeric(12,2) not null default 0,
  min_qty     numeric(12,2) not null default 0,
  supplier_id uuid references public.suppliers(id) on delete set null,
  is_active   boolean not null default true,
  image_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_products_category on public.products(category_id);
create index idx_products_supplier on public.products(supplier_id);
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- ---------- Clientes (fíado) ----------
create table public.customers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  phone        text,
  balance_debt numeric(12,2) not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_customers_updated before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------- Caja / Turnos ----------
create table public.shifts (
  id           uuid primary key default gen_random_uuid(),
  staff_id     uuid references public.profiles(id) on delete set null,
  opened_at    timestamptz not null default now(),
  closed_at    timestamptz,
  opening_cash numeric(12,2) not null default 0,
  closing_cash numeric(12,2),
  total_sales  numeric(12,2) not null default 0
);
create index idx_shifts_staff on public.shifts(staff_id);

-- ---------- Ventas ----------
create table public.sales (
  id             uuid primary key default gen_random_uuid(),
  staff_id       uuid references public.profiles(id) on delete set null,
  customer_id    uuid references public.customers(id) on delete set null,
  shift_id       uuid references public.shifts(id) on delete set null,
  payment_method text not null check (payment_method in ('efectivo', 'sinpe', 'tarjeta', 'fiado')),
  subtotal       numeric(12,2) not null default 0,
  tax            numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  change_given   numeric(12,2) not null default 0,
  created_at     timestamptz not null default now()
);
create index idx_sales_created on public.sales(created_at);
create index idx_sales_shift on public.sales(shift_id);

create table public.sale_items (
  id         uuid primary key default gen_random_uuid(),
  sale_id    uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  qty        numeric(12,2) not null,
  unit_price numeric(12,2) not null
);
create index idx_sale_items_sale on public.sale_items(sale_id);
create index idx_sale_items_product on public.sale_items(product_id);

-- ---------- Inventario ----------
create table public.stock_movements (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  delta        numeric(12,2) not null,
  reason       text not null check (reason in ('sale', 'purchase', 'merma', 'robo', 'vencimiento', 'ajuste', 'entrada')),
  reference_id uuid,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index idx_stock_mov_product on public.stock_movements(product_id);

-- Aplica cada movimiento al stock del producto (SECURITY DEFINER: corre como owner).
create or replace function public.apply_stock_movement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.products
    set stock_qty = stock_qty + new.delta
    where id = new.product_id;
  return new;
end;
$$;
create trigger trg_apply_stock_movement after insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

-- Al insertar una línea de venta, genera el movimiento negativo de stock.
create or replace function public.deduct_stock_on_sale()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.product_id is not null then
    insert into public.stock_movements (product_id, delta, reason, reference_id)
    values (new.product_id, -new.qty, 'sale', new.sale_id);
  end if;
  return new;
end;
$$;
create trigger trg_deduct_stock_on_sale after insert on public.sale_items
  for each row execute function public.deduct_stock_on_sale();

-- ---------- Compras ----------
create table public.purchase_orders (
  id          uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  status      text not null default 'borrador' check (status in ('borrador', 'enviada', 'recibida', 'cancelada')),
  total       numeric(12,2) not null default 0,
  created_at  timestamptz not null default now(),
  received_at timestamptz
);
create table public.purchase_items (
  id           uuid primary key default gen_random_uuid(),
  po_id        uuid not null references public.purchase_orders(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  qty_ordered  numeric(12,2) not null default 0,
  qty_received numeric(12,2) not null default 0,
  unit_cost    numeric(12,2) not null default 0
);
create index idx_purchase_items_po on public.purchase_items(po_id);

-- ---------- Bitácora / captura informal ----------
create table public.captures (
  id           uuid primary key default gen_random_uuid(),
  type         text not null check (type in ('photo', 'voice', 'text')),
  raw_input    text,
  parsed_json  jsonb,
  status       text not null default 'borrador' check (status in ('borrador', 'procesado', 'archivado')),
  created_by   uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  created_at   timestamptz not null default now()
);
create index idx_captures_status on public.captures(status);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.suppliers       enable row level security;
alter table public.products        enable row level security;
alter table public.customers       enable row level security;
alter table public.shifts          enable row level security;
alter table public.sales           enable row level security;
alter table public.sale_items      enable row level security;
alter table public.stock_movements enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_items  enable row level security;
alter table public.captures        enable row level security;

-- profiles: cada quien ve/edita el suyo; owner+ ve/edita todos.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_owner_up());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_owner_up());
create policy profiles_insert on public.profiles for insert to authenticated
  with check (public.is_owner_up());

-- Catálogo: todos leen; owner+ escribe.
create policy categories_read on public.categories for select to authenticated using (true);
create policy categories_write on public.categories for all to authenticated
  using (public.is_owner_up()) with check (public.is_owner_up());

create policy products_read on public.products for select to authenticated using (true);
create policy products_write on public.products for all to authenticated
  using (public.is_owner_up()) with check (public.is_owner_up());

-- Proveedores y compras: solo owner+.
create policy suppliers_all on public.suppliers for all to authenticated
  using (public.is_owner_up()) with check (public.is_owner_up());
create policy po_all on public.purchase_orders for all to authenticated
  using (public.is_owner_up()) with check (public.is_owner_up());
create policy poi_all on public.purchase_items for all to authenticated
  using (public.is_owner_up()) with check (public.is_owner_up());

-- Clientes: todos leen y crean; owner+ edita/borra.
create policy customers_read on public.customers for select to authenticated using (true);
create policy customers_insert on public.customers for insert to authenticated with check (true);
create policy customers_modify on public.customers for update to authenticated
  using (public.is_owner_up()) with check (public.is_owner_up());
create policy customers_delete on public.customers for delete to authenticated
  using (public.is_owner_up());

-- Caja: todos leen y operan su turno.
create policy shifts_read on public.shifts for select to authenticated using (true);
create policy shifts_insert on public.shifts for insert to authenticated with check (true);
create policy shifts_update on public.shifts for update to authenticated using (true);

-- Ventas: todos leen y crean.
create policy sales_read on public.sales for select to authenticated using (true);
create policy sales_insert on public.sales for insert to authenticated with check (true);
create policy sale_items_read on public.sale_items for select to authenticated using (true);
create policy sale_items_insert on public.sale_items for insert to authenticated with check (true);

-- Movimientos de stock: todos leen; owner+ crea manuales (ventas los crea el trigger).
create policy stock_read on public.stock_movements for select to authenticated using (true);
create policy stock_insert on public.stock_movements for insert to authenticated
  with check (public.is_owner_up());

-- Bitácora: todos leen y crean; edita su propio borrador u owner+.
create policy captures_read on public.captures for select to authenticated using (true);
create policy captures_insert on public.captures for insert to authenticated with check (true);
create policy captures_update on public.captures for update to authenticated
  using (created_by = auth.uid() or public.is_owner_up());
