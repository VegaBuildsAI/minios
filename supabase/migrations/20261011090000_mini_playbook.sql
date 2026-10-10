-- ============================================================
-- MiniOS · mini_playbook
-- «Mini» consulta la IA UNA vez al día. La Edge Function `mini-daily` calcula en el
-- servidor (determinístico + ML liviano) el estado del abastecedor, pide a Claude
-- Haiku la redacción del día (Batches, −50 %) y guarda todo aquí. El Inicio lee esta
-- fila y responde el resto del día sin llamar a la API.
-- Programación: 8:00 CR envía el lote; 9:00 CR lo recoge (o llama directo si no terminó).
-- ============================================================

create table if not exists public.mini_playbook (
  day          date primary key,
  status       text not null default 'pendiente' check (status in ('pendiente', 'enviado', 'listo', 'sin_ia', 'error')),
  facts        jsonb,               -- salida completa del motor determinístico/ML
  text         jsonb,               -- redacción del día (Claude o plantillas locales)
  model        text,
  tokens       int not null default 0,
  cost_usd     numeric(10,6) not null default 0,
  batch_id     text,
  error        text,
  generated_at timestamptz not null default now()
);

alter table public.mini_playbook enable row level security;
drop policy if exists mini_playbook_read on public.mini_playbook;
create policy mini_playbook_read on public.mini_playbook for select to authenticated using (true);
-- Sin políticas de escritura: solo el service role (la Edge Function) escribe.
revoke all on table public.mini_playbook from anon;
grant select on table public.mini_playbook to authenticated;

-- ai_usage acepta la tarea diaria (user_id nulo = ejecutada por el cron).
alter table public.ai_usage drop constraint if exists ai_usage_fn_check;
alter table public.ai_usage add constraint ai_usage_fn_check check (fn in ('capture-parse', 'assistant', 'mini-daily'));

-- ---------- Programación diaria ----------
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Llama a la Edge Function con el secreto del cron. URL y secreto viven en Vault
-- (nombres 'mini_daily_url' y 'mini_cron_secret'); se cargan fuera de la migración
-- para no versionar secretos. Sin ellos, no hace nada.
create or replace function public.mini_daily_kick(p_step text)
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'mini_daily_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'mini_cron_secret';
  if v_url is null or v_secret is null then
    raise notice 'mini_daily_kick: faltan mini_daily_url o mini_cron_secret en Vault';
    return null;
  end if;
  return net.http_post(
    url := v_url,
    body := jsonb_build_object('step', p_step),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    timeout_milliseconds := 120000
  );
end;
$$;
revoke all on function public.mini_daily_kick(text) from public, anon, authenticated;

-- Costa Rica = UTC−6 fijo: 8:00 CR = 14:00 UTC, 9:00 CR = 15:00 UTC.
select cron.unschedule(jobid) from cron.job where jobname in ('mini-daily-submit', 'mini-daily-collect');
select cron.schedule('mini-daily-submit', '0 14 * * *', $$select public.mini_daily_kick('submit')$$);
select cron.schedule('mini-daily-collect', '0 15 * * *', $$select public.mini_daily_kick('collect')$$);
