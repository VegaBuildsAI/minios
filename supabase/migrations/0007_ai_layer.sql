-- ============================================================
-- MiniOS · 0007_ai_layer
-- Capa de IA: lectura de documentos (transcripción + datos estructurados),
-- búsqueda de texto, control de gasto y herramientas de consulta del asistente.
--  · captures: texto extraído, estado/confianza de la lectura, hash del archivo
--    (para no pagar dos veces por el mismo documento) y búsqueda full-text
--  · ai_usage: bitácora de tokens/costo (la escriben SOLO las Edge Functions)
--  · business_settings: interruptor de IA y presupuesto diario
--  · ai_sales_summary(): resumen de ventas ya agregado (barato en tokens)
-- ============================================================

-- ---------- captures: resultado de la lectura ----------
alter table public.captures
  add column if not exists extracted_text  text,       -- transcripción compacta (para búsqueda)
  add column if not exists ai_status       text not null default 'sin_procesar'
    check (ai_status in ('sin_procesar', 'procesando', 'listo', 'error')),
  add column if not exists ai_error        text,
  add column if not exists ai_confidence   numeric(3,2),
  add column if not exists ai_model        text,
  add column if not exists ai_processed_at timestamptz,
  add column if not exists file_hash       text;       -- sha256 del archivo

create index if not exists idx_captures_file_hash on public.captures(file_hash) where file_hash is not null;

-- Búsqueda de texto completo en español (nota + transcripción + nombre de archivo).
alter table public.captures
  add column if not exists search tsvector generated always as (
    to_tsvector('spanish'::regconfig,
      coalesce(raw_input, '') || ' ' || coalesce(extracted_text, '') || ' ' || coalesce(file_name, ''))
  ) stored;
create index if not exists idx_captures_search on public.captures using gin (search);

-- ---------- ai_usage: gasto de la IA ----------
create table if not exists public.ai_usage (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id) on delete set null,
  fn                text not null check (fn in ('capture-parse', 'assistant')),
  model             text not null,
  input_tokens      int not null default 0,
  output_tokens     int not null default 0,
  cache_read_tokens int not null default 0,
  cache_write_tokens int not null default 0,
  cost_usd          numeric(10,6) not null default 0,
  ref_id            uuid,                 -- p. ej. la captura leída
  created_at        timestamptz not null default now()
);
create index if not exists idx_ai_usage_created on public.ai_usage(created_at);
create index if not exists idx_ai_usage_user on public.ai_usage(user_id, created_at);

alter table public.ai_usage enable row level security;
drop policy if exists ai_usage_read on public.ai_usage;
-- Solo dueño/superadmin ven el gasto. Sin policy de INSERT: únicamente el service role
-- (las Edge Functions) escribe, así un cliente no puede falsear ni borrar el registro.
create policy ai_usage_read on public.ai_usage for select to authenticated
  using (public.is_owner_up());

-- Gasto de hoy (hora de Costa Rica), en USD. SECURITY DEFINER: lo consulta cualquier
-- sesión autenticada para mostrar la barra de presupuesto, pero solo devuelve el total.
create or replace function public.ai_spend_today()
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(cost_usd), 0)
    from public.ai_usage
   where created_at >= (date_trunc('day', now() at time zone 'America/Costa_Rica') at time zone 'America/Costa_Rica');
$$;
revoke all on function public.ai_spend_today() from public, anon;
grant execute on function public.ai_spend_today() to authenticated, service_role;

-- ---------- configuración de IA ----------
alter table public.business_settings
  add column if not exists ai_enabled          boolean       not null default true,
  add column if not exists ai_daily_budget_usd numeric(8,2)  not null default 2.00;

-- ---------- resumen de ventas para el asistente ----------
-- Devuelve ya agregado (totales, por método y top 5 por ganancia) en vez de filas:
-- así el asistente recibe unos pocos cientos de tokens aunque haya miles de ventas.
-- SECURITY INVOKER: respeta RLS del usuario que consulta.
create or replace function public.ai_sales_summary(p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable security invoker set search_path = public as $$
  with it as (
    select si.qty, si.unit_price, p.id as pid, p.name, coalesce(p.cost_price, 0) as cost
      from public.sale_items si
      join public.sales s on s.id = si.sale_id
      left join public.products p on p.id = si.product_id
     where s.created_at >= p_from and s.created_at <= p_to
  ),
  tot as (
    select coalesce(sum(qty * unit_price), 0) as rev, coalesce(sum(qty * cost), 0) as cst from it
  ),
  top as (
    select name, sum(qty) as u, sum(qty * (unit_price - cost)) as g
      from it group by pid, name order by g desc limit 5
  )
  select jsonb_build_object(
    'ventas',   (select round(rev) from tot),
    'ganancia', (select round(rev - cst) from tot),
    'tickets',  (select count(*) from public.sales where created_at >= p_from and created_at <= p_to),
    'por_metodo', coalesce((
        select jsonb_object_agg(payment_method, t)
          from (select payment_method, round(sum(total)) as t from public.sales
                 where created_at >= p_from and created_at <= p_to group by 1) m), '{}'::jsonb),
    'top', coalesce((select jsonb_agg(jsonb_build_object('p', name, 'u', u, 'g', round(g))) from top), '[]'::jsonb)
  );
$$;
grant execute on function public.ai_sales_summary(timestamptz, timestamptz) to authenticated;
