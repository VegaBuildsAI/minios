# MiniOS — Sistema de diseño «Mostrador» (app móvil)

Aplica a la app de usuario (`/app/*`, Caja, Asistente, Login). El Panel de Control (`/control`) **no** cambia: sigue con sus tokens oscuros (`--bg-*`, `--accent-*`).

Canvas de referencia (diseño aprobado, 11 pantallas): https://claude.ai/code/artifact/45caeb28-e836-47bd-9660-69b03113fc8e
Capturas del código ya implementado: `docs/redesign/*.jpg`.

## 1. Tokens (`src/styles/tokens.css`)
Variables `--m-*` en `:root`, expuestas a Tailwind en `@theme inline`:

| Clase Tailwind | Valor | Uso |
|---|---|---|
| `bg-paper` | #f3f0e8 | Fondo de la app |
| `bg-paper-2` | #efebe2 | Rellenos suaves, separadores internos |
| `bg-white` | #ffffff | Tarjetas |
| `border-hair` / `border-hair-strong` | #e6e1d6 / #d8d2c4 | Bordes de tarjetas / de inputs y botones secundarios |
| `text-ink` | #1b1f1c | Texto principal, botón oscuro (`bg-ink`) |
| `text-ink-2` | #4a524d | Texto secundario (≥ 7:1 sobre blanco) |
| `text-ink-3` | #636a65 | Placeholders, íconos tenues (≥ 4.5:1) |
| `bg-brand` / `text-brand` | #0e5a47 | Marca, acción primaria, estado OK |
| `bg-brand-dark` / `bg-brand-mid` / `text-brand-on` | #0a4536 / #13705a / #cfe3da | Variantes dentro de la tarjeta verde |
| `bg-brand-tint` | #ddebe4 | Fondo de chips/íconos de marca |
| `bg-marigold` / `text-marigold` | #f5b83d | Acción estrella (Cobrar venta, botón de voz). Siempre con texto `ink`, nunca blanco |
| `bg-marigold-tint` | #fdf3dc | Sugerencias de IA |
| `text-warn` / `bg-warn-tint` | #8a4500 / #fbebd2 | Bajo mínimo, por revisar |
| `text-danger` / `bg-danger-tint` | #a3241a / #f9e1de | Agotado, errores, fiado |
| `bg-ok` | #15803d | Puntos de estado "en línea/abierto" |

Tipografía: `font-display-m` (Bricolage Grotesque 600/700, títulos y cifras grandes) y cuerpo Instrument Sans (por la clase `.mostrador`). Cifras con `tabular-nums`. Se cargan en `index.html` (Google Fonts); DM Sans/Playfair siguen para el Panel de Control.

`.mostrador` (en la raíz de MobileApp, Caja, Assistant y Login) fija fuente, fondo, `color-scheme: light`, `font-size ≥ 16px` en inputs (evita zoom en iOS), `:focus-visible` verde y respeta `prefers-reduced-motion`.

## 2. Reglas
- Texto mínimo 12 px (`text-[0.75rem]`), cuerpo 15 px (`text-[0.9375rem]`). Nada de `text-[0.6x rem]`.
- Objetivos táctiles ≥ 44 px (`h-11`); botones primarios `h-12`/`h-14`.
- Sin emojis en la UI: íconos `lucide-react` con `aria-hidden` y `aria-label` en botones solo-ícono. (Los datos de `insights.ts`/`categories.icon` aún traen emoji; la UI ya no los muestra.)
- Sin gradientes ni sombras pesadas; tarjetas = blanco + `border-hair` + `rounded-[18px]`.
- Selección = `bg-ink text-white` (pills/segmentos) o `border-2 border-brand bg-brand-tint` (método de pago).
- Propuestas de IA = tarjeta con `border-2 border-brand`; el usuario confirma.

## 3. Componentes (`src/modules/app/components.tsx`)
`Card` (si recibe `onClick` se renderiza como `<button>`), `Chip` (tonos `brand|amber|rose|neutral`, `teal` = alias), `ScreenHeader`, `Eyebrow`, `ProgressBar`, `Segmented`, `Switch` (role="switch"), `Ring` (legado). `PhoneStatusBar` quedó como no-op deprecado (la barra falsa se eliminó).
