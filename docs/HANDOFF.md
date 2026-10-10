# MiniOS — Handoff para el chat de despliegue

Fecha: 2026-10-06 · Carpeta: `C:\Users\AXIO\Documents\MINI_OS\minios` · Propietario: Michael (owner@example.com)

## 0. Objetivo del chat nuevo
**Desplegar a producción lo que hoy solo existe en local**: backend en Supabase Cloud y frontend en Cloudflare Pages. Además: evaluar qué aporta el API de Claude y si su rate limit alcanza (sección 5).

Primero leer: `CLAUDE.md` global, `docs/DEPLOY.md` (§8 = IA), `docs/AI_CONTEXT.md`, y este archivo. Memoria del proyecto en `C:\Users\AXIO\.claude\projects\C--Users-AXIO-Documents-MINI-OS\memory\`.

## 1. Qué es
Micro-ERP (PWA) para un minisúper en Costa Rica. Vite 8 + React 19 + TS 6 + Tailwind v4 + TanStack Query + supabase-js (PKCE) + vite-plugin-pwa. Backend **100 % Supabase** (Postgres + RLS, Auth, Storage, Edge Functions Deno). Frontend en **Cloudflare Pages** (Supabase sirve HTML como `text/plain`, por eso no se hostea ahí).

## 2. Producción actual
- Supabase Cloud ref `TU-PROJECT-REF`; anon key en `.env.production` (no está en este archivo).
- Frontend: `https://TU-PROYECTO.pages.dev` (proyecto Pages `minios`, `wrangler.jsonc` ya existe).
- **Los 2 dominios existentes de Cloudflare del usuario NO se tocan.**
- La nube tiene aplicadas las migraciones **0001–0004** y las funciones viejas `web`, `ai-query`, `ai-suggest-order`, `ai-trigger-engine`. **No tiene productos, proveedores ni ventas** (el seed solo corrió en local).

## 3. Qué hay SOLO en local (sin desplegar)
| Qué | Dónde |
|---|---|
| Migración 0005 Bitácora archivos (bucket `bitacora` privado, categorías) | `supabase/migrations/0005_bitacora_files.sql` |
| **Migración 0006 — arreglo de seguridad CRÍTICO** (hoy en la nube cualquiera con la anon key puede registrarse como superadmin y un staff puede cambiarse el rol) | `0006_harden_roles.sql` |
| 0007 capa IA (columnas `ai_*`, `ai_usage`, `ai_spend_today`, `ai_sales_summary`, ajustes de IA) | `0007_ai_layer.sql` |
| 0008 acciones (`apply_invoice`, `create_purchase_order`) | `0008_ai_actions.sql` |
| Edge Functions nuevas | `supabase/functions/ai-capture-parse`, `ai-assistant`, `_shared/ai.ts`, `_shared/context.ts` |
| UI: Bitácora con archivos + panel IA, Asistente con IA, Config IA, KPI gasto IA, Ventas dashboard, ícono PWA nuevo, monitor de Bitácora | `src/…` (el build local pasa) |
| 2 usuarios demo owner (solo base local): `dueno.demo@minios.test`, `duena.demo@minios.test` | base local; se pierden con `db reset` |

`supabase/config.toml`: `[functions.web|ai-capture-parse|ai-assistant] verify_jwt = false` (las funciones validan la sesión con `auth.getUser`, porque el gateway no valida llaves ES256).

## 4. Plan de despliegue (en orden)
**Quién ejecuta qué:** Claude puede correr build/db push/deploy si el usuario ya hizo login (`npx supabase login`, `npx wrangler login`). **El usuario** pone secretos y crea cuentas (Claude no maneja contraseñas ni llaves).

0. **Pre-chequeo local:** `npm run build` limpio. Confirmar con el usuario que quiere desplegar.
1. **Mitigación inmediata (usuario, panel Supabase):** Authentication → Sign In/Providers → desactivar "Allow new users to sign up". Revisar roles: `select u.email,p.role from public.profiles p join auth.users u on u.id=p.id;`
2. **Base de datos:** `npx supabase link --project-ref TU-PROJECT-REF` (si hace falta) → `npx supabase db push` (aplica 0005–0008). Revisar el diff que muestra antes de aceptar.
3. **Secreto (usuario):** `npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` (opcional: `AI_MODEL_EXTRACT`, `AI_MODEL_ASSISTANT`; por defecto `claude-haiku-4-5`). **Rotar primero la llave** (la actual pasó por un chat y está en `API Key.txt` → borrar ese archivo).
4. **Functions:** `npx supabase functions deploy ai-capture-parse ai-assistant` y luego `npx supabase functions delete ai-query ai-suggest-order ai-trigger-engine` (las viejas devolvían datos sin validar sesión). `web` puede quedarse o borrarse (obsoleta).
5. **Frontend:** `npm run build` → `npx wrangler pages deploy dist --project-name minios --branch main`.
6. **Auth URLs (usuario):** Supabase → Authentication → URL Configuration: Site URL `https://TU-PROYECTO.pages.dev` y Redirect `https://TU-PROYECTO.pages.dev/app`.
7. **Usuarios en la nube (usuario):** Authentication → Users → Add user (Auto Confirm). Luego SQL Editor:
   `update public.profiles set role='owner', full_name='…' where id=(select id from auth.users where email='…');`
   El superadmin es `admin@minios.test` (el usuario ya definió su contraseña en la app). los dueños = owners; **faltan sus correos reales**. La contraseña inicial sugerida quedó escrita en un chat: pedir que la cambien al primer ingreso.
8. **Datos:** cargar productos reales o pegar `supabase/seed.sql` sin el bloque `auth.users` (catálogo demo).
9. **Verificación en producción:** abrir el sitio (renderiza, no `text/plain`); login; subir una factura → se lee con IA; preguntar al asistente; aplicar una factura; Config → gasto IA; consola sin errores. Probar desde el celular y **reinstalar la PWA** (desinstalar + instalar) para ver el ícono redondeado.
10. **Smoke test de seguridad:** con un usuario staff intentar cambiarse el rol → debe fallar con 42501; llamar `ai-assistant` sin sesión → 401.

Rollback: el frontend se revierte desplegando el build anterior en Pages (Deployments → rollback). Las migraciones no tienen down: hacer `npx supabase db dump` antes del push.

## 5. API de Claude: qué aporta y si el rate limit alcanza
**Qué mejora en la app (ya implementado):** lectura de fotos/PDF con visión (reemplaza OCR + parser), salida JSON garantizada por schema (extracción confiable), tool use (el asistente consulta datos reales sin cargar el catálogo en el prompt), y todo con Haiku 4.5 ≈ US$ 0.004 por operación.

**Rate limit:** los límites de Anthropic son **por organización y por nivel (tier)** y suben con el gasto/depósito; se miden en solicitudes/min y tokens de entrada/salida por min por modelo. **No los fijé de memoria: verificarlos en console.anthropic.com → Settings → Limits** (muestra los valores reales del tier de la cuenta). Estimación de demanda de este negocio: decenas de operaciones al día (≈ 50–300 llamadas), con picos de pocas llamadas por minuto → el tier más bajo debería sobrar; el techo real de la app es nuestro propio control.
Controles propios ya existentes: 40 lecturas/h y 80 consultas/h por usuario, tope diario US$ 2.00, interruptor `ai_enabled`, caché por hash.
Pendientes a evaluar en el chat nuevo:
- Confirmar el tier y los límites reales en la consola, y activar alertas/límite de gasto del workspace en Anthropic.
- Manejo de 429 en `_shared/ai.ts`: hoy el SDK reintenta una vez (`maxRetries: 1`); mostrar mensaje amable "IA ocupada, reintentá" y no consumir el contador por hora cuando falla.
- Que el límite por hora sea por usuario y que exista un límite global si se suman más usuarios.
- Evaluar si conviene subir de Haiku a un modelo mayor solo para manuscritos o confianza < 0.6.
- Prompt caching **no aplica** hoy (prefijo mínimo cacheable de Haiku 4.5 = 4096 tokens; el prompt pesa ~1.5k). Reevaluar si crece.

## 6. Memoria de la IA
`docs/AI_CONTEXT.md` (versión humana) y `supabase/functions/_shared/context.ts` (versión compacta `APP_CONTEXT`, ya inyectada en el prompt de `ai-assistant` y probada localmente: respondió "¿Dónde registro una venta?" → Caja). `ai-capture-parse` conserva su propio prompt de extracción. Cuando se agreguen módulos/herramientas, actualizar ambos archivos y redesplegar `ai-assistant`.

## 7. Cómo levantar el entorno local (por si hace falta)
Docker Desktop → `npx supabase start` (contenedores `supabase_*_minios`), `npx supabase functions serve --env-file supabase/functions/.env --no-verify-jwt`, `npm run dev` (puerto 5173; también `.claude/launch.json` → `minios-dev`). Mailpit: `http://127.0.0.1:54324`. Detalles en la memoria `minios-local-dev.md`.

## 8. Pendientes abiertos
- Probar letra manuscrita, cámara y galería en el celular real, y Safari/iOS.
- Probar el rechazo de PDF demasiado grande.
- Obtener los correos reales de los dueños.
- Cargar productos reales en la nube.
- Limpiar lo obsoleto del hosting por Supabase (`supabase/functions/web`, `scripts/deploy-web.mjs`, migración 0004) cuando todo esté estable.
- Carpeta no es repo git en `minios/` salvo lo que el usuario decida (el estado de `git` mostró rama `master` desde un directorio superior): confirmar si se quiere versionar antes de desplegar.

## 9. Reglas de trabajo acordadas
- Local primero; **no desplegar sin aprobación explícita**.
- El usuario corre los comandos que requieren login; Claude no ingresa contraseñas/llaves ni crea cuentas en producción.
- IA: siempre borrador/propuesta + confirmación del usuario. Sin XML de factura electrónica por ahora.
- Responder en español, directo, verificar antes de afirmar.
