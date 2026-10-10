-- ============================================================
-- MiniOS · 0005_bitacora_files
-- Subida de archivos en Bitácora (fotos, PDF de facturas/recibos/cierres):
--  · nuevo tipo 'file', categoría y metadatos del archivo en captures
--  · bucket 'bitacora' PRIVADO (se accede con URLs firmadas temporales),
--    tope de 10 MB y solo JPG / PNG / WebP / PDF
--  · borrado solo para owner+ (archivo y registro)
-- ============================================================

-- ---------- captures: tipo, categoría y metadatos ----------
alter table public.captures drop constraint if exists captures_type_check;
alter table public.captures
  add constraint captures_type_check check (type in ('photo', 'voice', 'text', 'file'));

alter table public.captures
  add column if not exists category  text not null default 'notas'
    check (category in ('inventario', 'caja', 'notas')),
  add column if not exists file_path text,      -- ruta dentro del bucket 'bitacora'
  add column if not exists file_name text,      -- nombre original del archivo
  add column if not exists file_mime text,
  add column if not exists file_size integer;   -- bytes

create index if not exists idx_captures_category on public.captures(category);

-- Fotos anteriores: guardaban la URL pública en parsed_json.image_url → pasar a ruta.
update public.captures
   set file_path = regexp_replace(parsed_json->>'image_url', '^.*/object/public/bitacora/', ''),
       file_name = coalesce(file_name, 'foto'),
       file_mime = coalesce(file_mime, 'image/jpeg')
 where file_path is null
   and parsed_json->>'image_url' is not null;

-- ---------- bucket privado + límites ----------
update storage.buckets
   set public             = false,
       file_size_limit    = 10485760,  -- 10 MB
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
 where id = 'bitacora';

-- ---------- borrado solo owner+ ----------
drop policy if exists "bitacora_delete" on storage.objects;
create policy "bitacora_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'bitacora' and public.is_owner_up());

drop policy if exists captures_delete on public.captures;
create policy captures_delete on public.captures for delete to authenticated
  using (public.is_owner_up());
