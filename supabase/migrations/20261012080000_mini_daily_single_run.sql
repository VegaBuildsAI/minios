-- Mini: una sola ejecución diaria a las 8:00 CR (14:00 UTC) con llamada directa a la IA.
-- Reemplaza el par lote 8:00 + recogida 9:00.
select cron.unschedule(jobid) from cron.job where jobname in ('mini-daily-submit', 'mini-daily-collect', 'mini-daily');
select cron.schedule('mini-daily', '0 14 * * *', $$select public.mini_daily_kick('now')$$);
