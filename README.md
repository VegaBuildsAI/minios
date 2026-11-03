# MiniOS

**Micro-ERP local-first para un minisúper independiente en Costa Rica.** Inventario, caja, proveedores, bitácora con lectura de documentos por IA y un asistente por voz — en una PWA pensada para el celular del dueño y su equipo.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Edge-3ecf8e?logo=supabase&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-f38020?logo=cloudflare&logoColor=white)

---

## Qué hace

| Módulo | Descripción |
| --- | --- |
| **Inicio** | Resumen del día y «Mini», un plan diario determinístico generado una vez al día por IA. |
| **Inventario** | Catálogo, existencias, ajustes e historial de movimientos; alertas de mínimo. |
| **Caja** | Libro de entradas/salidas de efectivo, turnos con cuadre y registro de tiquetes (foto → IA → líneas enrutadas a productos). |
| **Ventas** | Dashboard de ganancia por día/semana/mes, tendencia y top 10 por margen con sugerencias. |
| **Proveedores** | Órdenes de compra sugeridas con productos bajo mínimo y recepción que actualiza inventario. |
| **Bitácora** | Captura por texto, voz o archivo (JPG/PNG/WebP/PDF); lectura de facturas y recibos con IA, siempre como borrador que confirma el usuario. |
| **Asistente** | Voz primero: consulta inventario, ventas y documentos con herramientas acotadas. |
| **Reportes** | KPIs, más vendidos, cuentas por cobrar y exportación CSV. |
| **Panel de Control** | Área administrativa (owner / superadmin) con tablero operativo y mapa de la solución. |

Roles: `superadmin`, `owner` y `staff`, aplicados con Row Level Security en todas las tablas.

## Arquitectura

```
┌──────────────────────────┐        ┌────────────────────────────────────┐
│  PWA (React 19 + Vite)   │  HTTPS │  Supabase Cloud                    │
│  Cloudflare Pages        │ ─────► │  • Postgres + RLS + triggers       │
│  React Query · Tailwind  │        │  • Auth (magic link, PKCE)         │
└──────────────────────────┘        │  • Storage privado (bitácora)      │
                                    │  • Edge Functions (Deno)           │
                                    │      ai-capture-parse · ai-assistant│
                                    │      mini-daily (pg_cron)          │
                                    └──────────────┬─────────────────────┘
                                                   │ server-side only
                                                   ▼
                                           Anthropic Claude API
```

- La llave de IA vive **solo** como secret de Supabase; nunca llega al navegador.
- El inventario se mueve por triggers de base de datos (`sale_items` / `stock_movements`), no por el cliente.
- Las respuestas de IA son propuestas: el usuario confirma antes de aplicar cualquier cambio.

## Estructura

```
minios/
├── src/
│   ├── modules/app/        # App móvil (dueño / staff): pantallas, widgets, componentes
│   ├── modules/control/    # Panel de Control (admin)
│   ├── modules/auth/       # Login, AuthProvider, guards
│   ├── lib/                # Cliente Supabase, hooks de datos, tipos, utilidades
│   ├── config/             # solution-map.ts — fuente única de módulos, roles y tablas
│   └── styles/             # Tokens de diseño (claro / oscuro)
├── supabase/
│   ├── migrations/         # Esquema, RLS, RPCs y endurecimiento de seguridad
│   ├── functions/          # Edge Functions (Deno)
│   └── seed.sql            # Datos de desarrollo local
├── scripts/                # Íconos PWA, deploy y datos demo
└── docs/                   # Despliegue, diseño, auditorías y handoffs
```

## Desarrollo local

Requisitos: Node.js 20+, Docker Desktop.

```bash
npm install
cp .env.example .env.local          # completar con los valores de `npx supabase status`
npx supabase start                  # Postgres, Auth, Storage, Edge y Studio en Docker
npm run dev                         # http://localhost:5173
```

Inicio de sesión por enlace mágico: el correo llega a Mailpit en `http://127.0.0.1:54324`.

Para las Edge Functions de IA, crear `supabase/functions/.env` con `ANTHROPIC_API_KEY=...` (archivo ignorado por git).

### Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Chequeo de tipos + build de producción |
| `npm run lint` | Oxlint |
| `npm run gen:icons` | Genera los íconos PWA |

## Despliegue

Ver [`docs/DEPLOY.md`](docs/DEPLOY.md). Resumen:

1. `npx supabase db push` y `npx supabase functions deploy …`
2. `npx supabase secrets set ANTHROPIC_API_KEY=…` (solo en la terminal)
3. `npm run build` con `.env.production` (ver `.env.production.example`)
4. `npx wrangler pages deploy dist --project-name minios --branch main`

## Seguridad

- Ningún `.env`, llave ni respaldo de base de datos se versiona (ver `.gitignore`).
- Las variables `VITE_*` son públicas por diseño (URL y anon key); la protección real es RLS.
- Los registros nuevos nacen como `staff`; un trigger impide escalar el propio rol.
- Bucket de archivos privado con URLs firmadas de corta duración.

Si encontrás un problema de seguridad, reportalo de forma privada al responsable del repositorio.

## Documentación

- [`docs/DEPLOY.md`](docs/DEPLOY.md) — runbook de despliegue
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — sistema de diseño
- [`docs/AI_CONTEXT.md`](docs/AI_CONTEXT.md) — contexto de la capa de IA
- [`docs/AUDITORIA_2026-10-10.md`](docs/AUDITORIA_2026-10-10.md) — auditoría

## Licencia

Software propietario © 2026 AXIO / VegaBuildsAI. Todos los derechos reservados. Ver [`LICENSE`](LICENSE).
