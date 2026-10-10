-- ============================================================
-- MiniOS · 0002_storage
-- Bucket para adjuntos de Bitácora (fotos de facturas/notas, audios).
-- ============================================================

insert into storage.buckets (id, name, public)
values ('bitacora', 'bitacora', true)
on conflict (id) do nothing;

-- Lectura y subida para usuarios autenticados en el bucket 'bitacora'.
create policy "bitacora_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'bitacora');

create policy "bitacora_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'bitacora');

create policy "bitacora_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'bitacora');
