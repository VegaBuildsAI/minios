# MiniOS — Auditoría de cambios, Mini determinístico y datos demo

Fecha: 2026-10-10 · Alcance: **solo local** (sin push ni despliegue).

## 1. Origen de los commits
| Commit | Origen | Estado |
|---|---|---|
| `d980c59` … `6d74aa9` | Esta sesión | En la rama |
| `67b228a`, `28e22f9`, `e000294` | Otra sesión (`session_01TSS…`): commitearon trabajo de esta sesión + handoffs | Aceptados (los handoffs se siguieron por pedido de Michael) |
| `31595ee` … `5a44eee` | Esta sesión | En la rama |
| `31d7b46` | Otra sesión: «Mini fuera del recuadro y chat al tocar el mensaje» | Revertido en `a7c1001`; luego Michael pidió ese diseño **sin chat ni sugerencias**, que se reimplementó en esta sesión |
| `cf30785` en adelante | Esta sesión | En la rama |

Regla aplicada: antes de cada commit se revisó `git log` para detectar commits ajenos nuevos.

## 2. Estado verificado
- Migraciones locales al día hasta `20261011090000_mini_playbook` (`migration list`).
- `tsc -b` + `vite build` limpios; `oxlint` 0 errores (2 warnings preexistentes del React Compiler).
- Consola del navegador sin errores en el Inicio.

## 3. Mini: una llamada a la IA por día
- **Edge Function `mini-daily`**: `ml.ts` (determinístico, sin IA) calcula pronóstico por producto (índice semanal × suavizado exponencial), días para agotarse, stock de seguridad, pedido sugerido hasta la próxima visita, ABC por ganancia, tendencia, anomalía (z), hora pico y pares que se compran juntos. Una sola llamada a **Claude Haiku 5.5** redacta textos por franja horaria y consejos desde un resumen compacto.
- **Programación** (`pg_cron` + `pg_net`, URL y secreto en Vault): 8:00 CR envía un **Message Batch (−50 %)**; 9:00 CR lo recoge (si no terminó, lo cancela y llama directo).
- **Costo medido**: lote US$0.000208/día (1220 tokens de entrada + 590 de salida); llamada directa US$0.0004. Sin IA (apagada, sin presupuesto o error) queda la redacción local.
- **Inicio**: globo blanco con el mensaje y Mini afuera a la derecha; **sin chat ni sugerencias**, 0 llamadas a funciones al abrir. Las cifras del momento ({v} ventas, {t} tiquetes, {m} % meta, {e} efectivo) se rellenan en vivo. Tocar a Mini pasa al siguiente aviso.
- Panel de Control → Bitácora e IA: estado del plan (hora, tokens, costo) y botón **Regenerar** (owner+).
- Todas las funciones de IA pasaron a `claude-haiku-5-5` (US$0.10 / 0.50 por MTok) con razonamiento apagado y manejo de `refusal`. La pantalla **Asistente** sigue usando IA bajo demanda.

## 4. Datos demo
`python scripts/demo/seed_demo.py` (semilla fija) — visible para superadmin y dueños:
- 56 días: 1927 tiquetes (₡6.8 M), estacionalidad viernes/sábado y quincena, pares (pan+natilla, arroz+frijoles, café+leche, cerveza+maní), 50 compras recibidas, 56 turnos con cuadre (2 con faltante), gastos, pagos, retiros y abonos, 4 clientes de fiado, ajustes de merma/vencimiento/robo.
- 3 productos dejan de reponerse (Aceite, Huevos, Leche Semidescremada) → quedan agotados para que Mini y el Panel los marquen.
- Bitácora: 3 facturas ya aplicadas y **pendientes para probar la IA**: factura Dos Pinos (foto nítida), Distribuidora CR (foto torcida con ruido), La Económica (PDF), 2 tiquetes de registradora (uno con nombres abreviados), cierre Z y nota manuscrita.
- Para presentar: correrlo la mañana del día (hoy queda con las ventas hasta la hora en que se ejecuta).
- Para pasar a datos reales: `python scripts/demo/purge_demo.py` (o `--catalog` para borrar también el catálogo). No toca usuarios ni configuración.

## 5. Para producción (cuando se apruebe)
- Migraciones hasta `20261011090000`; `supabase functions deploy mini-daily ai-assistant ai-capture-parse`; secrets `MINI_CRON_SECRET`, `AI_MODEL_*=claude-haiku-5-5`.
- En Vault de la nube: `mini_cron_secret` (mismo valor) y `mini_daily_url` = `https://<ref>.supabase.co/functions/v1/mini-daily`.
