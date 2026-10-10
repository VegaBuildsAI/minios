-- ============================================================
-- MiniOS · 0004_web_bucket
-- Bucket público para servir el frontend (SPA) desde Supabase Storage.
-- El build de Vite (dist/) se sube acá con scripts/deploy-web.mjs.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('web', 'web', true)
on conflict (id) do nothing;

-- Lectura pública de los archivos del sitio.
create policy "web_public_read"
  on storage.objects for select
  using (bucket_id = 'web');
