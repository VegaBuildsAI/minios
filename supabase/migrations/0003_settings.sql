-- ============================================================
-- MiniOS · 0003_settings
-- Configuración del negocio (fila única) — M6.
-- ============================================================

create table public.business_settings (
  id         int primary key default 1 check (id = 1),
  name       text not null default 'Mi Minisúper',
  address    text,
  phone      text,
  tax_rate   numeric(5,4) not null default 0.13,
  currency   text not null default 'CRC' check (currency in ('CRC', 'USD')),
  logo_url   text,
  updated_at timestamptz not null default now()
);

insert into public.business_settings (id, name) values (1, 'Minisúper AXIO') on conflict (id) do nothing;

create trigger trg_settings_updated before update on public.business_settings
  for each row execute function public.set_updated_at();

alter table public.business_settings enable row level security;

create policy settings_read on public.business_settings for select to authenticated using (true);
create policy settings_write on public.business_settings for update to authenticated
  using (public.is_owner_up()) with check (public.is_owner_up());
