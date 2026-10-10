# MiniOS — Deploy a Supabase Cloud (Fase 5)

**100% Supabase.** Backend en Supabase Cloud; el frontend (SPA) se sirve así:
- Los **assets** (JS/CSS/manifest) viven en el bucket público **`web`** de Storage.
- El **index.html** lo sirve la **Edge Function `web`** como `text/html` (Storage degrada el HTML a `text/plain` por seguridad, por eso no se puede servir la página directo del bucket — las Functions sí pueden).
- La app usa **HashRouter** (URLs `…/functions/v1/web#/app`), así una sola ruta cubre toda la navegación.

Verificado end-to-end en local (mismo mecanismo que en la nube). Estos pasos los corrés vos porque requieren tu login de Supabase.

## 0. Prerrequisitos
- Proyecto creado en el dashboard (org AXIO). Anotá el **Project ref** y la **DB password**.
- Settings → API: `Project URL`, `anon key`, `service_role key`.

## 1. Login + link
```bash
cd minios
npx supabase login
npx supabase link --project-ref <TU_REF>
```

## 2. Subir esquema + buckets (migraciones 0001–0004)
```bash
npx supabase db push
```
Crea tablas, RLS, triggers y los buckets `bitacora` y `web`.

## 3. Desplegar las Edge Functions
```bash
npx supabase functions deploy web ai-query ai-suggest-order ai-trigger-engine
```
(`verify_jwt=false` ya está en `config.toml` para que `web` sea público.)

## 4. Build del frontend (assets apuntando a Storage)
```bash
cp .env.production.example .env.production   # completá URL + anon key
npm run build
```
`vite.config.ts` detecta `VITE_SUPABASE_URL` en producción y pone `base` =
`https://<TU_REF>.supabase.co/storage/v1/object/public/web/` automáticamente.

## 5. Subir el build al bucket `web`
```powershell
$env:SUPABASE_URL="https://<TU_REF>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"
npm run deploy:web
```

## 6. Configurar Auth (dashboard → Authentication → URL Configuration)
El sitio queda en:
`https://<TU_REF>.supabase.co/functions/v1/web`
- **Site URL:** esa URL.
- **Redirect URLs:** agregá `https://<TU_REF>.supabase.co/functions/v1/web` (los magic links vuelven ahí).
- Email: Supabase manda los correos reales (límite del plan free; para volumen configurá SMTP en Auth → SMTP).

Abrí el sitio en el celular → **Agregar a pantalla de inicio**.

## 7. Usuario superadmin + datos
- Entrá con magic link (te crea un profile `staff`) y promovételo en el **SQL Editor**:
  `update public.profiles set role='superadmin' where id=(select id from auth.users where email='admin@minios.test');`
- Cargá productos reales desde la app, o pegá `supabase/seed.sql` (sin el bloque `auth.users`, que es solo local) en el SQL Editor para el catálogo demo.

## 8. Capa de IA (Claude Haiku 4.5)
Funciones: `ai-capture-parse` (lee/transcribe archivos de la Bitácora) y `ai-assistant` (asistente con herramientas). Siempre proponen; el usuario confirma.
```bash
npx supabase db push                                   # migraciones 0005–0008
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...  # solo en tu terminal; nunca en el chat ni en el frontend
npx supabase functions deploy ai-capture-parse ai-assistant
npx supabase functions delete ai-query ai-suggest-order ai-trigger-engine   # las viejas no validaban sesión
```
- Las funciones validan la sesión dentro del código (`verify_jwt = false` en `config.toml`, porque el gateway no valida llaves ES256).
- Control de gasto: Configuración → Inteligencia artificial (interruptor + tope diario en US$, por defecto 2.00). Uso en tabla `ai_usage`.
- Costo medido: factura ≈ US$0.004, pregunta al asistente con herramienta ≈ US$0.004.
- Si la llave se compartió en un chat/archivo: rotarla en console.anthropic.com y borrar `API Key.txt`.

## Re-deploys
- Frontend: `npm run build && npm run deploy:web` (la function `web` sirve siempre el último index.html del bucket).
- Backend: editar migraciones → `npx supabase db push`; functions → `npx supabase functions deploy <nombre>`.

## Limitaciones conocidas
- **PWA / offline:** en este modo (HTML por Function + assets por Storage) el **Service Worker no se registra** (su scope no cubre la ruta de la Function), así que la instalación/offline queda degradada — la app funciona **online** normalmente. Si más adelante querés PWA instalable + dominio propio, un host estático (Cloudflare Pages) lo resuelve sin tocar el backend.
- La URL es larga (`…/functions/v1/web`). Dominio propio requiere plan Pro + custom domain, o un host estático externo.
