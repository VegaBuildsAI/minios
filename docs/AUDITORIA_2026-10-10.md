# MiniOS — Auditoría de código y base de datos (local)

Fecha: 2026-10-10 · Alcance: **solo local** (Supabase local en Docker + Vite dev). Nada se desplegó a Supabase Cloud ni a Cloudflare Pages.
Estado auditado: commit `31595ee` (panel nuevo) + migración `20261010130000_audit_hardening.sql` y arreglos de este informe.

## Resumen
- **Todo conectado.** Las 15 tablas, las 5 RPC y el bucket que usa el código existen en la base y cada columna referenciada en `src/` y en las Edge Functions coincide con el esquema (script de cruce código ↔ `information_schema`, 0 problemas).
- **Esquema = migraciones.** `supabase db diff --local`: sin cambios. `supabase db lint`: sin errores. 14 migraciones aplicadas en local.
- **Seguridad por rol verificada con 20 pruebas SQL** (cada una en transacción revertida) y pruebas HTTP a las Edge Functions. Se encontraron 5 puntos a endurecer; los 5 quedaron corregidos en la migración `20261010130000_audit_hardening.sql`.
- **Frontend:** `tsc -b` y `vite build` limpios; `oxlint` 0 errores (2 warnings preexistentes del React Compiler). `npm audit`: 0 vulnerabilidades (había 2 en dependencias de build; `npm audit fix`). Recorrido de las 16 rutas como superadmin: todas las peticiones a Supabase respondieron 200, sin errores de consola.

## Hallazgos y estado

| # | Severidad | Hallazgo | Estado |
|---|---|---|---|
| 1 | Media | `shifts_update USING (true)`: el personal podía cambiar la apertura (`opening_cash`) de cualquier turno, incluso cerrado. | **Corregido**: solo turnos abiertos (o owner+), y solo las columnas de cierre (`closed_at`, `closing_cash`, `total_sales`). |
| 2 | Media | **Cuadre de caja por día, no por turno**: un turno que cruza la medianoche «perdía» los tiquetes y salidas anteriores a las 00:00 (efectivo esperado ₡100 000 en vez de ₡90 100). Afectaba Caja y el tablero. | **Corregido** con `useShiftCash` (suma por `shift_id`). |
| 3 | Baja | `sales_insert WITH CHECK (true)`: se podía registrar una venta a nombre de otro usuario. | **Corregido**: `staff_id = auth.uid()` (`register_ticket` ya lo cumplía). |
| 4 | Baja | Bucket `bitacora`: cualquier usuario autenticado podía **modificar** cualquier archivo (`bitacora_update` sin dueño). | **Corregido**: autor del archivo u owner+. |
| 5 | Baja | `anon` conservaba privilegios de tabla por defecto de Supabase (incluido TRUNCATE) y EXECUTE sobre `ai_sales_summary`. RLS ya impedía leer/escribir; es defensa en profundidad. | **Corregido**: `anon` sin privilegios en `public`; sin TRUNCATE/TRIGGER/REFERENCES para `authenticated`. |
| 6 | Baja | Personal veía el acceso «Panel de Control» en Más (al tocarlo volvía a la app). Rol mostrado en inglés. | **Corregido**: oculto para personal; roles en español. |
| 7 | Baja | Cada carga pedía el perfil dos veces (`getSession` + `INITIAL_SESSION`) y otra vez en cada renovación de token. | **Corregido** en `AuthProvider`. |
| 8 | Baja | Claves foráneas sin índice usadas por el tablero/joins. | **Corregido**: índices en `sales.staff_id`, `purchase_orders.supplier_id`, `purchase_items.product_id`, `stock_movements.created_at`. Quedan sin índice FKs de auditoría (`created_by`, `cash_movements.supplier_id`), irrelevantes a este volumen. |
| 9 | Info | Código muerto: `DataTable`, `ViewTabs`, `lib/theme.ts` (+ `zustand`), script de tema oscuro y fuentes DM Sans/Playfair en `index.html`, `Ring`, `PhoneStatusBar`, `IVA_RATE`, emojis de `insights`. | **Eliminado.** |
| 10 | Info | Bundle principal 735 kB. | **Mejorado**: el área admin se carga bajo demanda (ControlPanel 32 kB, ConoceApp 9 kB fuera del bundle de la app). Principal: 695 kB (supabase-js + React + íconos). |

## Pruebas de permisos (SQL, revertidas)
| Prueba | Esperado | Resultado |
|---|---|---|
| Personal se sube a superadmin | Falla | ✅ «No tenés permiso para cambiar este rol» |
| Personal crea producto / ajuste manual de stock | Falla (RLS) | ✅ |
| Personal registra tiquete (`register_ticket`) | Funciona y baja stock | ✅ Chicles 57 → 55 |
| `register_ticket` con línea sin producto | Falla | ✅ |
| Personal registra salida de efectivo a su nombre / a nombre de otro | Funciona / Falla | ✅ / ✅ |
| Personal borra movimiento de efectivo | 0 filas | ✅ |
| Personal aplica factura o entrada manual | Falla | ✅ «Solo dueño o superadmin…» |
| Personal ve `ai_usage` / perfiles ajenos | 0 / solo el suyo | ✅ |
| Dueña crea producto + entrada manual | Funciona | ✅ stock 3 |
| Dueña cambia rol del superadmin / asciende personal | Falla / Funciona | ✅ / ✅ |
| Personal cambia apertura de turno / cierra turno abierto / toca turno cerrado | Falla / Funciona / 0 filas | ✅ / ✅ / ✅ |
| Venta firmada a nombre de otro | Falla | ✅ |
| Anónimo lee tablas / llama RPC | Sin acceso | ✅ |

Edge Functions: `ai-assistant` y `ai-capture-parse` → **401** sin sesión; con sesión validan la entrada antes de llamar a la IA (400 «Falta la pregunta» / «capture_id inválido»), sin gasto.

## Panel de Control verificado
Superadmin y dueña (`duena.demo@minios.test`) ven el tablero con datos reales; personal (`staff.demo@minios.test`, creado en esta auditoría solo en la base local, entra con enlace mágico) es redirigido a `/app` desde `/control` y `/control/conoce`. Período Hoy/7/30 cambia KPIs y Top; tooltip del gráfico; «Volver a la app» en sidebar y píldora (390 px sin scroll horizontal). Capturas: `docs/redesign/panel-desktop.jpg`, `panel-mobile.jpg`, `conoce-desktop.jpg`.

## Pendiente (decisión del dueño, no se tocó)
1. **Hosting viejo por Supabase**: función `supabase/functions/web` (responde 200 en local), bucket público `web` (13 objetos en local), migración `0004_web_bucket.sql`, `scripts/deploy-web.mjs`, script `deploy:web` y `[functions.web]` en `config.toml`. El frontend real va en Cloudflare Pages; conviene borrar todo esto (y la función `web` en la nube) cuando se despliegue.
2. **Despliegue a la nube**: la nube sigue en 0001–0004. Pendientes: 0005–0008, `20261006*`, `20261009120000_caja_tickets`, `20261010120000_business_name`, `20261010130000_audit_hardening` + funciones IA (ver `docs/HANDOFF.md`). **La migración 0006 es el arreglo de seguridad crítico de roles.**
3. `sale_items_insert WITH CHECK (true)`: el personal puede insertar líneas sueltas a una venta existente (bajan stock). Para cerrarlo hay que pasar el registro solo por RPC (`register_ticket` como `security definer`) y quitar los INSERT directos.
4. Tiquetes reales de la registradora: probar nombres abreviados y, si hace falta, un diccionario de alias por producto.
5. Warnings de React Compiler en `SupplierToday.tsx` y `Config.tsx` (sin efecto funcional).
