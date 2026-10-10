# MiniOS — Handoff a Claude Code: desplegar en LOCAL

Fecha: 2026-10-10 · Carpeta: `C:\Users\AXIO\Documents\MINI_OS\minios` · Negocio: **Minisúper Demo**
Alcance: **solo local** (Supabase local en Docker + Vite dev). Producción (Supabase Cloud + Cloudflare Pages) sigue en `docs/HANDOFF.md` / `docs/DEPLOY.md` y se hace después de validar aquí.

## 0. Estado del repo al entregar
Commits nuevos sobre `6d74aa9`:
1. `feat(caja): tiquetes con IA y movimientos de efectivo` — trabajo previo de Claude Code (Caja pasa de POS a registro de tiquetes + `cash_movements`, hojas de inventario, `tickets.ts`, migración `20261009120000_caja_tickets.sql`).
2. `feat(settings): nombre del negocio Minisúper Demo + handoffs` — migración `20261010120000_business_name.sql`, `docs/HANDOFF_PANEL_CONTROL.md`, este archivo.

Verificado antes del commit (copia Linux): `tsc -b` ✅ · `vite build` ✅ · `oxlint` 0 errores (2 warnings de React Compiler ya existentes).
**Pendiente de implementar:** el nuevo Panel de Control + «Conoce la app» (§3). No está en código todavía; solo diseño + especificación.

## 1. Levantar el entorno local
```powershell
cd C:\Users\AXIO\Documents\MINI_OS\minios
git status                      # limpio; git log -3 muestra los 2 commits nuevos
npm install                     # package.json no cambió; solo si falta node_modules
# Docker Desktop abierto
npx supabase start              # imprime API URL y anon key locales
npx supabase db dump --local -f ..\backup_local_2026-10-10.sql   # respaldo antes de migrar
npx supabase migration up       # aplica SOLO las pendientes: 20261009120000_caja_tickets, 20261010120000_business_name
```
- **No usar `npx supabase db reset`**: borra la base local y los usuarios demo (`dueno.demo@minios.test`, `duena.demo@minios.test`).
- Comprobar en Studio (http://127.0.0.1:54323) o con `psql`:
  - `select name from public.business_settings;` → `Minisúper Demo` (si ya lo habías cambiado a mano en Config, la migración no lo pisa: ajustalo en Config).
  - `\d public.cash_movements` existe; `sales` tiene `capture_id` y `ticket_number`.
- `.env.local` debe apuntar a la API local (`VITE_SUPABASE_URL=http://127.0.0.1:54321` + anon key que imprimió `supabase start`).

## 2. Funciones de IA en local (si se van a probar tiquetes/Asistente)
```powershell
npx supabase functions serve --env-file supabase/functions/.env
```
`supabase/functions/.env` necesita `ANTHROPIC_API_KEY` (no está en git; no pegarla en el chat). Sin la llave, la app funciona pero la lectura de tiquetes/facturas y el Asistente devuelven error controlado.

## 3. Implementar el Panel de Control nuevo
Seguir **`docs/HANDOFF_PANEL_CONTROL.md`** completo (incluye §7: nombre desde `business_settings`, tarjeta de Caja con `cash_movements`). Resumen:
1. Rutas: `/control` = tablero; `/control/conoce` = «Conoce la app» (se mueve el contenido actual).
2. `AppShell` en estilo Mostrador + botón **«Volver a la app»** (sidebar en escritorio; píldora flotante abajo en celular).
3. Tablero: franja «Requiere atención», 5 KPIs en vidrio translúcido con sparklines lineales, tendencia 14 días lineal (ventas `#12845F`, ganancia `#C98314`), Caja, Inventario, Proveedores, Bitácora e IA, Top productos con sparkline, Actividad reciente.
4. 2 hooks nuevos en `lib/data.ts`: `useTodayMovementsSummary()` y `useRecentActivity()`.
5. Corregir `solution-map.ts` (stack y `ai_usage`).
Diseño de referencia: https://claude.ai/code/artifact/45caeb28-e836-47bd-9660-69b03113fc8e (artboards «Panel de Control (escritorio)» y «Conoce la app»).

## 4. Correr y verificar
```powershell
npm run build ; npm run lint
npm run dev                      # http://localhost:5173
```
Checklist (DevTools: 390×844 y 1440×900):
- [ ] Login con superadmin → `/app` muestra la app móvil; Caja registra un tiquete (foto → líneas → confirmar) y una salida de efectivo.
- [ ] `/control` como superadmin y como owner (`duena.demo@minios.test`): tablero con datos reales locales; encabezado «sáb 10 oct · Minisúper Demo».
- [ ] Período Hoy / 7 días / 30 días cambia KPIs y Top productos.
- [ ] Gráficos lineales con tooltip; tarjetas translúcidas; sin fondo negro.
- [ ] «Volver a la app» lleva a `/app` (escritorio: sidebar; 390 px: píldora flotante que no tapa contenido).
- [ ] `/control/conoce` muestra módulos, flujos, matriz de accesos, reportes, tablas y stack corregido.
- [ ] Usuario staff que entra a `/control` es redirigido a `/app`.
- [ ] Consola sin errores; Lighthouse accesibilidad ≥ 90 en `/control`.

## 5. Cerrar
- Capturas a `docs/redesign/panel-desktop.jpg` y `panel-mobile.jpg`.
- Commit: `feat(control): tablero operativo, Conoce la app y botón Volver a la app`.
- **No** desplegar a producción en esta tarea; cuando esté validado, seguir `docs/HANDOFF.md` (backend: migraciones hasta `20261010120000`) y luego `docs/DEPLOY.md` §5 (frontend).

## 6. Si algo sale mal (local)
- Código: `git revert <commit>` o `git checkout 6d74aa9 -- src` para comparar.
- Base local: restaurar el respaldo `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f ..\backup_local_2026-10-10.sql` (o `db reset` como último recurso, sabiendo que borra los usuarios demo).
