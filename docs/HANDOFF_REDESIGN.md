# MiniOS — Handoff a Claude Code: rediseño «Mostrador» (local → producción)

Fecha: 2026-10-09 · Carpeta: `C:\Users\AXIO\Documents\MINI_OS\minios` · Propietario: Michael
Hecho en Cowork. **Solo frontend**: no se tocaron migraciones, Edge Functions, `lib/data.ts`, `lib/supabase.ts` ni el Panel de Control.

## 0. Objetivo
Revisar el rediseño en local, hacer commit y desplegarlo a Cloudflare Pages siguiendo `docs/DEPLOY.md` §5. Este handoff **no reemplaza** `../HANDOFF.md` (despliegue de backend 0005–0008 + funciones IA). Orden sugerido: primero el backend de `HANDOFF.md` (la UI nueva usa `ai_spend_today`, `ai_daily_budget_usd`, `useCaptureStats`, que dependen de 0007), luego este frontend.

Leer: `docs/DESIGN_SYSTEM.md` (tokens y reglas), capturas en `docs/redesign/`, canvas del diseño: https://claude.ai/code/artifact/45caeb28-e836-47bd-9660-69b03113fc8e

## 1. Estado verificado (en una copia Linux del repo, sin tocar tu `node_modules`)
- `tsc -b` ✅ · `vite build` ✅ · `oxlint` 0 errores (los mismos 2 warnings de React Compiler que ya existían).
- Render con Playwright (390×844) con Supabase simulado: Inicio, Caja (vacía, con carrito y hoja de cobro), Inventario, Asistente, Bitácora, Proveedores, Ventas, Configuración, Más, Alertas, Reportes → sin errores de consola. Capturas en `docs/redesign/`.
- **No probado**: contra Supabase real, dictado por voz en un celular real, instalación de la PWA.

## 2. Respaldo
Original intacto en `..\_backup_pre_redesign_2026-10-09\` (`src/`, `index.html`, `public/`). El repo git **no tiene commits todavía** (`master` vacío). Borrable: `..\_redesign_review\dist-preview.tgz` (build temporal usado para las capturas).

## 3. Archivos cambiados
| Archivo | Cambio |
|---|---|
| `src/styles/tokens.css` | + tokens `--m-*`, colores Tailwind (`paper`, `ink`, `brand`, `marigold`, `warn`, `danger`, `hair`…), clase `.mostrador` |
| `index.html` | + fuentes Bricolage Grotesque e Instrument Sans; `theme-color` #f3f0e8 |
| `vite.config.ts` | manifest PWA: `theme_color` y `background_color` #f3f0e8 |
| `src/modules/app/components.tsx` | Reescrito: `Card`, `Chip`, `ScreenHeader`, `Eyebrow`, `ProgressBar`, `Segmented`, `Switch`, `Ring`; `PhoneStatusBar` → no-op |
| `MobileApp.tsx`, `AppTabBar.tsx` | Fondo papel; tab bar blanca, "Más" activa también en Bitácora/Proveedores/Config/Reportes/Alertas; botón central tinta + caléndula |
| `screens/Home.tsx` | Reescrito: tarjeta verde de ventas con barra de meta y **Cobrar venta**, sugerencia, 2 métricas, accesos rápidos |
| `screens/Caja.tsx` | Sin emojis (íconos lucide), contador por producto, barra inferior **Cobrar** con subtotal + IVA, botones ±44 px, buscador con ícono de escaneo (solo visual) |
| `screens/Inventario.tsx` | Filtros Todos / Atención / Al día, barra de stock vs mínimo |
| `screens/Assistant.tsx` | Pantalla de inicio con 4 consultas, aviso de entradas pendientes, chip de gasto IA, burbujas nuevas, **modo escucha a pantalla completa** con cancelar/terminar |
| `screens/Proveedores.tsx` | Tira de 7 días con visitas, tarjeta de visita (llamar / armar orden), órdenes recientes, lista |
| `screens/Ventas.tsx`, `Reportes.tsx` | Control segmentado, resumen + gráfico en una tarjeta, Top con barra y sugerencia |
| `screens/Config.tsx` | Interruptor IA (`role=switch`), barra gasto hoy vs tope |
| `screens/Bitacora.tsx`, `Alerta.tsx`, `Mas.tsx` | Íconos en vez de emojis, estados legibles ("Por revisar"), controles ≥44 px |
| `widgets/*`, `auth/Login.tsx`, `auth/RequireAuth.tsx`, `components/TrendChart.tsx` | Recoloreo a tokens Mostrador |

Mapeo aplicado en todo `src/modules/app` y `src/modules/auth`: `teal-*`→`brand*`, `slate-*`→`ink*`/`hair*`/`paper*`, `amber`→`warn`, `rose`→`danger`, `font-mono`→`tabular-nums`, tamaños < 12 px → 12 px.

## 4. Pasos para Claude Code
1. `cd C:\Users\AXIO\Documents\MINI_OS\minios`
2. `npm run build` → debe pasar limpio. (En Windows, con tu `node_modules` actual.)
3. Revisión local: `npx supabase start` (si se usa la base local) + `npm run dev` → abrir `http://localhost:5173/app` en modo móvil (390×844) y recorrer: Inicio, Caja (agregar productos → Cobrar → venta registrada), Inventario (filtro Atención, ajustar stock), Asistente (pregunta escrita, dictado, propuesta → Confirmar), Bitácora (subir foto), Proveedores (tocar días, Armar orden), Ventas, Config (interruptor IA + Guardar). Comparar con `docs/redesign/*.jpg`.
4. Commit inicial (el repo no tiene ninguno): `git add -A`. `.gitignore` ya excluye `.env.local` (`*.local`), `.env`, `.env.production`, `supabase/functions/.env` y `*.sql` (las 3 últimas reglas se agregaron en este rediseño); confirmar con `git status` antes del commit. Mensaje sugerido: `feat(ui): rediseño Mostrador de la app móvil`.
5. Desplegar frontend (tras el backend de `HANDOFF.md`): `npm run build` → `npx wrangler pages deploy dist --project-name minios --branch main`.
6. En el celular: desinstalar y reinstalar la PWA (cambió `theme_color`), verificar que el service worker sirva la versión nueva.

Rollback: Pages → Deployments → rollback; en código, copiar de `..\_backup_pre_redesign_2026-10-09\`.

## 5. Pendientes / siguientes pasos (no implementados)
- **Inventario**: botón "Armar pedido con estos N" (diseñado) → llamar a `useCreateSuggestedPO` por proveedor.
- **Factura leída por IA**: el diseño (pantalla dedicada con líneas emparejadas / revisar / sin producto) hoy vive dentro de `AiDocPanel` + `ReceiveInvoice` solo recoloreados; falta la vista dedicada.
- **Caja**: el ícono de escaneo es visual; falta lector de código de barras (BarcodeDetector API o librería).
- **Home**: `DAILY_GOAL` sigue fijo en ₡120 000 → moverlo a `business_settings`.
- `lib/insights.ts` y `categories.icon` todavía guardan emojis (la UI ya no los muestra); limpiar si se quiere.
- Modo oscuro de la app móvil (no diseñado).
- Bundle de 670 kB: considerar `import()` por ruta (Panel de Control aparte).
