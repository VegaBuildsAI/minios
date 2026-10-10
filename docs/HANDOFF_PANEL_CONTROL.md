# MiniOS — Handoff a Claude Code: nuevo Panel de Control + «Conoce la app»

Fecha: 2026-10-10 · Carpeta: `C:\Users\AXIO\Documents\MINI_OS\minios`
Diseño aprobado (canvas, fila «Panel de Control (admin) · Conoce la app»):
https://claude.ai/code/artifact/45caeb28-e836-47bd-9660-69b03113fc8e
— artboards `PanelControl` y `ConoceApp` (1440 px, fluidos; se apilan en celular).

> Solo frontend. No requiere migraciones nuevas. Hay cambios sin commit en el repo
> (`lib/data.ts`, `lib/types.ts`, `Caja`, `Home`, `Inventario`, `Mas`, `Ventas`, `tickets.ts`,
> widgets nuevos): **commitearlos o confirmarlos antes** de empezar esta tarea.

## 1. Objetivo
1. `/control` deja de ser una presentación y pasa a ser un **tablero operativo**: una vista general de todos los módulos con la información que importa hoy.
2. Todo lo que hoy está en `/control` (hero «todo el paquete de la solución», Accesos, Módulos, Flujos, Reportes, Base de datos, Stack) se mueve a una sección nueva **«Conoce la app»** en `/control/conoce`.
3. El área admin (`AppShell`) adopta el sistema «Mostrador» (ver `docs/DESIGN_SYSTEM.md`), igual que la app móvil.

## 2. Rutas y navegación
- `App.tsx`: dentro del `<Route element={<AppShell />}>` agregar `<Route path="/control/conoce" element={<ConoceApp />} />`.
- Nuevo `src/modules/control/ConoceApp.tsx`: mover ahí el hero actual de `ControlPanel.tsx` + la nav fija + `<Accesos/> <Modulos/> <Flujos/> <Reportes/> <BaseDeDatos/> <Stack/>` (secciones existentes, restyle a Mostrador). `EnVivo` **sale** de esta página (sus KPIs viven ahora en el tablero).
- `AppShell.tsx`: sidebar blanca (`bg-white border-hair`), ítem activo `bg-brand-tint text-brand font-bold`, marca = cuadro `bg-ink text-marigold` con ícono `Store` (quitar el emoji 🏪). Al pie, enlace punteado **«Conoce la app»** (`Info`) → `/control/conoce`, y tarjeta de usuario (nombre + rol). Agregar `className="mostrador"` a la raíz y quitar las clases oscuras (`bg-deep`, `bg-card`, `text-fg*`, `orange`). El `ThemeToggle` puede quedarse oculto hasta que exista un modo oscuro Mostrador.
- **Botón «Volver a la app»** (→ `/app`) en todo el área admin (`AppShell`, así cubre Panel de Control, Conoce la app y los módulos admin):
  - Escritorio/tablet (≥ 768 px): primer elemento del sidebar bajo la marca, botón compacto `h-10 rounded-xl px-3 bg-ink text-white text-sm font-semibold` con `ArrowLeft` (16 px) en `text-marigold` y un ícono `Smartphone` (15 px) tenue a la derecha.
  - Celular (< 768 px): la barra superior de `AppShell` queda compacta (marca + menú) y aparece un **botón flotante abajo, centrado** tipo píldora (`fixed bottom-4 left-1/2 -translate-x-1/2 h-11 px-[18px] rounded-full bg-ink text-white text-sm font-semibold`, respetando `env(safe-area-inset-bottom)`) con «Volver a la app». Reemplaza la barra inferior de 7 pestañas actual (`md:hidden`), que se mueve a un menú desplegable en la barra superior junto con «Conoce la app». Agregar `pb-20` al `<main>` en celular para que el botón no tape contenido.
  - Usar `<Link to="/app">` (no `navigate(-1)`), porque el panel puede abrirse directo desde un enlace o desde la PWA.
- Acceso: `/control` para `owner` y `superadmin` (hoy `EnVivo` solo muestra datos a superadmin). Staff → redirigir a `/app`.

## 3. Tablero (`ControlPanel.tsx` reescrito) — bloques y de dónde sale cada dato
Selector de período **Hoy / 7 días / 30 días** arriba a la derecha (estado local; afecta KPIs y Top productos). Chip «Supabase conectado · act. HH:MM» (reusar `supabaseReady` + `dataUpdatedAt`).

| Bloque | Contenido | Fuente |
|---|---|---|
| **Requiere atención** (franja de 3 tarjetas de color) | Agotados, entradas de Bitácora por revisar, proveedor que visita hoy. Cada una con CTA. Ocultar las que estén en 0. | `useInsights()` (severidad crítico), `useCaptureStats().byStatus.borrador`, `useSuppliers()` + lógica de día de `widgets/SupplierToday.tsx` |
| **KPIs** (5 tiles translúcidos «tech» con sparkline lineal de 10 días) | Ventas · Ganancia + margen · Ticket promedio · Fiado por cobrar (n.º clientes) · Inventario crítico (agotados/bajo). Delta vs. mismo día de la semana pasada. | `useSalesReport(from,to,'day')` para período actual y semana pasada; `useDashboardStats()`; clientes con `balance_debt > 0` (extender `useDashboardStats` con `fiadoClients`) |
| **Ventas y ganancia · 14 días** (gráfico **lineal** sobre tarjeta translúcida tipo vidrio: 2 líneas con área degradada y brillo, cuadrícula fina, punto + lectura «HOY» al final) | Σ ventas, ganancia y margen en el subtítulo; leyenda Ventas/Ganancia; crosshair + tooltip al pasar el mouse | `useSalesReport(hace14d, ahora, 'day').trend` (`ventas`, `ganancia`) |
| **Caja** | Turno abierto (hora, cajero, apertura), **efectivo esperado** en gaveta, barra 100 % de métodos de pago + leyenda con montos, botón «Ver cuadres» | `useOpenShift()`, `useTodaySales()` agrupado por `payment_method`, `useTodayCashMovements()` |
| **Inventario** | n.º productos y valor (Σ costo × stock), barra agotado/bajo/al día, 5 productos más críticos con barra stock/mínimo, «Movimientos hoy» por razón | `useProducts()`; **nuevo** `useTodayMovementsSummary()` (stock_movements de hoy agrupado por `reason`) |
| **Proveedores** | Tira de 7 días con n.º de visitas, tarjeta de la visita de hoy (+ productos bajo mínimo de ese proveedor), órdenes abiertas (borrador/enviada) con total y estado | `useSuppliers()`, `useProducts()`, `usePurchaseOrders()` |
| **Bitácora e IA** | Por revisar / Procesadas / Archivadas (30 d), gasto IA hoy vs tope (barra), lecturas · consultas · US$ 30 días, últimas 3 entradas | `useCaptureStats()`, `useAiSpendToday()`, `useAiUsageSummary()`, `useBusinessSettings().ai_daily_budget_usd`, `useCaptures()` |
| **Productos que más ganancia dejan** (tabla, 6 filas) | #, producto, vendidos, ventas, margen % (en `warn` si < 15 %), ganancia + **sparkline lineal 7 días**; «Exportar CSV» | `useSalesReport(...).topByMargin`; CSV con `lib/csv.ts` |
| **Actividad reciente** (feed, 5–8 ítems) | Ventas, ajustes de inventario, entradas de Bitácora, órdenes, aperturas/cierres de turno, con hora · módulo · usuario | **nuevo** `useRecentActivity()`: 5 últimos de `sales`, `stock_movements`, `captures`, `purchase_orders`, `shifts` (en paralelo), unir y ordenar por `created_at` desc |

Layout: filas `flex-wrap` (gráfico `flex: 2 1 560px` + tarjeta `flex: 1 1 300px`), módulos en `grid auto-fit minmax(320px,1fr)`, KPIs `auto-fit minmax(200px,1fr)`. Tabla dentro de `overflow-x-auto`. Debe verse bien a 390 px.

### Estilo «tech» de los gráficos (pedido 2026-10-10)
- Gráficos **lineales**, no de barras: SVG con `<path>` (`vector-effect="non-scaling-stroke"`, trazo 2–2.5 px, `stroke-linejoin="round"`), área con `linearGradient` (opacidad 0.32 → 0) y brillo `filter: drop-shadow(0 0 6px <color>)`.
- **Sin fondo negro** (cambio 2026-10-10): KPIs y tendencia usan **vidrio translúcido** sobre el papel: `background: rgba(255,255,255,0.5–0.55)`, `backdrop-filter: blur(14–16px)` (+ `-webkit-`), borde `rgba(14,90,71,0.16)`, radio 18 px. El área del trazado: `rgba(255,255,255,0.35)`, cuadrícula `rgba(27,31,28,0.08)` horizontal / `0.05` vertical, eje `rgba(27,31,28,0.18)`. Para que el vidrio se note, el `<main>` del tablero lleva dos `radial-gradient` muy suaves (verde marca 10 % arriba-izquierda, caléndula 12 % arriba-derecha). Tooltip «HOY» también en vidrio (`rgba(255,255,255,0.72)` + blur 10 px).
- Textos en tokens de tinta (`ink`, `ink-2`, `ink-3`). Etiquetas, ejes y cifras en **JetBrains Mono** (agregar a `index.html`), rótulos en mayúsculas con tracking 0.08em.
- Colores de serie (los mismos validados para fondo claro): **Ventas `#12845F` · Ganancia `#C98314`**; brillo `drop-shadow(0 0 4–6px rgba(<color>,.45))`, área degradada 0.22 → 0. Deltas: subida `#15803D`, bajada `#A3241A`, aviso `#8A4500`.
- Sobre las tarjetas blancas (sparklines de la tabla, métodos de pago, inventario) el categórico claro validado: **Efectivo `#12845F` · SINPE `#C98314` · Tarjeta `#5672D9` · Fiado `#C2557A`**. Las barras de proporción (métodos de pago, estado de inventario) se quedan como medidores con número + texto.
- Interacción: crosshair vertical + tooltip mono al pasar el mouse (último punto «HOY» fijo por defecto); `role="img"` + `aria-label` con el resumen. Se puede usar Recharts o SVG propio; `components/TrendChart.tsx` ya es SVG lineal y puede extenderse con estas props (tema oscuro, glow, área).
- Agregar a `tokens.css`: `--m-glass` (rgba(255,255,255,.55)), `--m-glass-border`, `--m-chart-grid`, `--m-chart-1` (#12845F), `--m-chart-2` (#C98314) y las 4 categóricas como `--m-cat-1..4`.

## 4. «Conoce la app» — cambios de contenido
- Hero oscuro (`bg-ink`), chip caléndula «Conoce la app · v0.1 · Costa Rica», título «MiniOS: todo el minisúper en el celular», `meta.tagline`, 4 stats.
- Nav de secciones pegajosa (pills): Módulos · Flujos · Accesos · Reportes · Base de datos · Stack.
- Módulos: tarjetas con ID/prioridad, estado, descripción y features (sin emojis: quitar `icon` de `solution-map.ts` o mapear a lucide).
- Flujos: pasos numerados (último paso en verde marca), sin emojis.
- Accesos: **matriz** rol × módulo (Total / Ver / —) en vez de tarjetas.
- **Corregir `solution-map.ts` → `stack`** (está desactualizado): React 19 + Vite 8 + TS; Tailwind v4 · Mostrador; TanStack Query + supabase-js (no Zustand); Supabase Postgres (RLS + RPC); Auth (contraseña / enlace mágico PKCE); Storage (bucket privado Bitácora); Edge Functions + Claude Haiku 4.5; **Hosting: Cloudflare Pages** (no «Supabase Hosting»).
- Base de datos: agregar `ai_usage` a `dbTables` (grupo Bitácora e IA).

## 5. Pasos para Claude Code
1. Confirmar/commitear el trabajo en curso.
2. Implementar rutas + `AppShell` (§2), luego `ConoceApp` (mover, no reescribir lógica), luego el tablero (§3) con los 2 hooks nuevos en `lib/data.ts`.
3. `npm run build` + `npm run lint` limpios. Revisar en `npm run dev` a 1440 px y 390 px, como superadmin, owner y staff (staff → `/app`).
4. Comparar con el canvas; capturas a `docs/redesign/panel-*.jpg`.
5. Commit `feat(control): tablero operativo + sección Conoce la app` y desplegar con `docs/DEPLOY.md` §5 (`npm run build` → `npx wrangler pages deploy dist --project-name minios --branch main`).

## 6. Fuera de alcance (anotar como siguientes pasos)
- Modo oscuro Mostrador para el admin.
- Comparativos por cajero / por hora pico.
- Realtime (Supabase Realtime) para refrescar el tablero sin recargar; por ahora `refetchInterval: 60_000` en las queries del tablero.

## 7. Ajustes posteriores (2026-10-10)
- **Nombre del negocio:** «Minisúper Demo». Se lee de `business_settings.name` (migración `20261010120000_business_name.sql`); el encabezado del tablero muestra `<fecha> · {settings.name}`. No escribir el nombre fijo en el código.
- **La Caja cambió de concepto** (commit de tiquetes): ya no es punto de venta; registra tiquetes de la caja registradora (foto → IA → líneas → `sales`) y movimientos de efectivo en `cash_movements` (`ingreso`, `pago_proveedor`, `gasto`, `retiro`). En la tarjeta **Caja** del tablero:
  - «Efectivo esperado» = apertura + ventas en efectivo + ingresos − pagos a proveedor − gastos − retiros (`useTodayCashMovements()`).
  - Agregar debajo de «Cómo pagaron hoy» una línea «Salidas de efectivo hoy: ₡X (n movimientos)» y que el botón diga «Ver caja» (→ `/app/caja` o la vista admin de Caja).
  - El feed de **Actividad reciente** incluye `cash_movements` y los tiquetes registrados (venta con `capture_id`).
