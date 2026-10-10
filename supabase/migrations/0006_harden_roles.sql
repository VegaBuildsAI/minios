-- ============================================================
-- MiniOS · 0006_harden_roles  (SEGURIDAD — cierra dos escaladas de privilegios)
--
-- Problema 1: handle_new_user() tomaba el rol de raw_user_meta_data, que lo
--   escribe el CLIENTE en el registro (auth.signUp / signInWithOtp con `data`).
--   Cualquiera con la anon key pública podía crearse como 'superadmin'.
-- Problema 2: la política profiles_update deja a cada usuario editar su propia
--   fila completa, incluido `role`. Un staff podía ascenderse con un PATCH.
--
-- Arreglo: el rol nunca viene del cliente (todo registro nace 'staff') y los
-- cambios de rol pasan por un guard con reglas explícitas.
-- ============================================================

-- 1) Registro: ignorar cualquier rol enviado por el cliente.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'staff'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2) Cambios de rol solo por quien corresponde.
--    · Sin sesión de usuario (SQL Editor, service role, migraciones): permitido.
--    · superadmin: puede asignar cualquier rol.
--    · owner: puede mover entre 'owner' y 'staff', nunca tocar a un superadmin
--      ni crear uno.
--    · staff: nunca.
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor text;
begin
  if new.role is not distinct from old.role then
    return new;
  end if;
  if auth.uid() is null then
    return new;
  end if;

  actor := public.auth_role();
  if actor = 'superadmin' then
    return new;
  end if;
  if actor = 'owner' and old.role <> 'superadmin' and new.role in ('owner', 'staff') then
    return new;
  end if;

  raise exception 'No tenés permiso para cambiar este rol' using errcode = '42501';
end;
$$;

drop trigger if exists trg_guard_profile_role on public.profiles;
create trigger trg_guard_profile_role
  before update of role on public.profiles
  for each row execute function public.guard_profile_role();
