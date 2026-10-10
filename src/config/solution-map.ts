/**
 * solution-map.ts — Manifiesto único de MiniOS.
 *
 * Fuente de verdad de TODO el paquete de la solución: módulos, accesos/roles,
 * flujos, reportes, esquema de base de datos y stack. El Panel de Control
 * (mapa visual en Fase 0, centro en vivo en Fase 2) lee de aquí, y el
 * showcase `minios-preview.html` refleja lo mismo. Un solo lugar que editar.
 */

export type AccentKey =
  | 'orange'
  | 'green'
  | 'blue'
  | 'red'
  | 'purple'
  | 'amber'
  | 'cyan'

export type ModuleStatus = 'planned' | 'building' | 'ready'
export type Priority = 'P0' | 'P1' | 'P2'
export type RoleId = 'superadmin' | 'owner' | 'staff'

export interface ModuleDef {
  id: string // M1..M7
  code: string // slug de la ruta / carpeta
  name: string
  icon: string
  description: string
  priority: Priority
  status: ModuleStatus
  accent: AccentKey
  features: string[]
}

export interface RoleDef {
  id: RoleId
  name: string
  who: string
  accent: AccentKey
  /** módulos (por code) que ve este rol; '*' = todos */
  modules: string[] | '*'
  notes: string
}

export interface FlowStep {
  icon: string
  title: string
  desc: string
}

export interface FlowDef {
  id: string
  name: string
  accent: AccentKey
  trigger: string
  steps: FlowStep[]
}

export interface ReportDef {
  name: string
  desc: string
  formats: string[]
  module: string // code del módulo dueño
}

export interface DbTableDef {
  name: string
  group: 'Usuarios' | 'Catálogo' | 'Ventas' | 'Inventario' | 'Compras' | 'Caja' | 'Bitácora'
  desc: string
  columns: string
}

export interface StackLayerDef {
  layer: string
  tech: string
  note: string
  accent: AccentKey
}

export interface SolutionMeta {
  name: string
  tagline: string
  version: string
  country: string
  stats: { num: string; label: string }[]
}

export const meta: SolutionMeta = {
  name: 'MiniOS',
  tagline:
    'Micro-ERP para minisúper. Toda la operación —caja, inventario, proveedores, bitácora y reportes— desde el celular, con una capa de IA que convierte lo informal en datos.',
  version: 'v0.1',
  country: 'Costa Rica',
  stats: [
    { num: '7', label: 'Módulos' },
    { num: '$0', label: 'Costo inicial' },
    { num: '100%', label: 'Supabase' },
    { num: 'PWA', label: 'Instalable' },
  ],
}

export const modules: ModuleDef[] = [
  {
    id: 'M1',
    code: 'pos',
    name: 'Caja (POS)',
    icon: '🛒',
    description:
      'Punto de venta lineal: búsqueda o escaneo de producto, carrito, IVA 13%, y pagos en efectivo, SINPE, tarjeta o fíado. Turno con apertura y cierre por conteo.',
    priority: 'P0',
    status: 'ready',
    accent: 'orange',
    features: ['Escaneo cámara', 'IVA 13%', 'SINPE / Fíado', 'Cambio', 'Colilla PDF', 'Turno'],
  },
  {
    id: 'M2',
    code: 'inventory',
    name: 'Inventario en tiempo real',
    icon: '📦',
    description:
      'Catálogo con costo, precio e inventario. Deducción automática en cada venta, inventario crítico con alerta, ajuste manual con razón e historial de movimientos.',
    priority: 'P0',
    status: 'ready',
    accent: 'green',
    features: ['Auto-deducción', 'Inventario crítico', 'Merma / robo', 'Historial', 'SKU / código'],
  },
  {
    id: 'M3',
    code: 'suppliers',
    name: 'Proveedores & Compras',
    icon: '🚚',
    description:
      'Directorio de proveedores con días de visita, órdenes de compra sugeridas, recepción que actualiza inventario y alerta si el precio de recepción difiere del histórico.',
    priority: 'P1',
    status: 'ready',
    accent: 'blue',
    features: ['Directorio', 'Orden sugerida', 'Recepción → inventario', 'Alerta de precio'],
  },
  {
    id: 'M4',
    code: 'bitacora',
    name: 'Bitácora (captura informal)',
    icon: '📓',
    description:
      'Reemplaza el cuaderno. Captura texto, voz o archivos (foto/PDF); la IA transcribe y clasifica cada documento y el usuario confirma antes de cargar nada al inventario.',
    priority: 'P1',
    status: 'ready',
    accent: 'purple',
    features: ['Texto libre', 'Foto / PDF + IA', 'Voz → STT', 'Transcripción', 'Confirma → BD'],
  },
  {
    id: 'M5',
    code: 'reports',
    name: 'Reportes & Cuadre',
    icon: '📈',
    description:
      'Ventas por período, más vendidos por volumen y margen, cuentas por cobrar (fíado), cuadre de turno (efectivo esperado vs. contado) y export CSV / PDF.',
    priority: 'P1',
    status: 'ready',
    accent: 'amber',
    features: ['Período custom', 'Margen', 'Cuentas por cobrar', 'Cuadre de caja', 'CSV / PDF'],
  },
  {
    id: 'M6',
    code: 'settings',
    name: 'Configuración',
    icon: '⚙️',
    description:
      'Perfil del negocio, tasa de impuesto (IVA 13% CR), moneda CRC / USD, gestión de usuarios y roles, y configuración de notificaciones.',
    priority: 'P1',
    status: 'ready',
    accent: 'cyan',
    features: ['Perfil', 'IVA / Moneda', 'Usuarios & roles', 'Notificaciones'],
  },
  {
    id: 'M7',
    code: 'ai',
    name: 'Capa de IA (transversal)',
    icon: '🤖',
    description:
      'Claude Haiku 4.5 desde Supabase Edge Functions: lee y transcribe documentos de la Bitácora y alimenta al asistente con herramientas acotadas. Siempre propone; el usuario confirma. Tope de gasto diario y bitácora de uso.',
    priority: 'P1',
    status: 'ready',
    accent: 'red',
    features: ['Lectura de documentos', 'Aplicar factura al inventario', 'Asistente con herramientas', 'Tope de gasto', 'Caché por hash'],
  },
]

export const roles: RoleDef[] = [
  {
    id: 'superadmin',
    name: 'Superadmin (AXIO)',
    who: 'Michael — desarrollador AXIO',
    accent: 'orange',
    modules: '*',
    notes:
      'Acceso total + Panel de Control en vivo, logs del sistema, gestión de usuarios y config de IA. Usuario inicial: admin@minios.test.',
  },
  {
    id: 'owner',
    name: 'Dueño',
    who: 'Dueño del minisúper',
    accent: 'green',
    modules: ['pos', 'inventory', 'suppliers', 'bitacora', 'reports', 'settings', 'ai'],
    notes: 'Todo lo operativo: caja, inventario, proveedores, reportes, bitácora, configuración e IA.',
  },
  {
    id: 'staff',
    name: 'Staff',
    who: 'Empleado (TBD)',
    accent: 'blue',
    modules: ['pos', 'bitacora'],
    notes: 'Solo caja + bitácora básica. Sin reportes financieros ni inventario completo.',
  },
]

export const flows: FlowDef[] = [
  {
    id: 'sale',
    name: 'Venta → Inventario',
    accent: 'orange',
    trigger: 'Cierre de venta en Caja',
    steps: [
      { icon: '🔎', title: 'Buscar / escanear', desc: 'Producto por nombre, código o cámara' },
      { icon: '🧺', title: 'Carrito', desc: 'Subtotal + IVA 13% → total' },
      { icon: '💳', title: 'Cobrar', desc: 'Efectivo, SINPE, tarjeta o fíado' },
      { icon: '📉', title: 'Deducir inventario', desc: 'stock_movements baja el inventario' },
      { icon: '⚠️', title: 'Alerta', desc: 'Badge si inventario ≤ mínimo' },
    ],
  },
  {
    id: 'capture',
    name: 'Captura → IA → BD',
    accent: 'purple',
    trigger: 'Nota en Bitácora (texto / foto / voz)',
    steps: [
      { icon: '✍️', title: 'Captura', desc: 'Texto, foto o audio' },
      { icon: '🧠', title: 'IA lee', desc: 'Clasifica + transcribe en 1 llamada' },
      { icon: '📝', title: 'Borrador', desc: 'Revisión línea por línea' },
      { icon: '✅', title: 'Confirmar', desc: 'Usuario valida' },
      { icon: '🗄️', title: 'Carga a BD', desc: 'Se estructura el dato' },
    ],
  },
  {
    id: 'purchase',
    name: 'Compra a proveedor',
    accent: 'blue',
    trigger: 'Proveedor visita hoy / inventario bajo',
    steps: [
      { icon: '📅', title: 'Visita / mínimo', desc: 'Trigger por día o por inventario' },
      { icon: '🧾', title: 'Orden sugerida', desc: 'IA propone cantidades' },
      { icon: '📦', title: 'Recepción', desc: 'Pedido vs. recibido' },
      { icon: '📈', title: 'Actualiza inventario', desc: 'Entra al inventario' },
      { icon: '💰', title: 'Alerta precio', desc: 'Si difiere del histórico' },
    ],
  },
  {
    id: 'ai-cron',
    name: 'IA proactiva (cron diario)',
    accent: 'red',
    trigger: 'Una vez al día (apertura o cierre)',
    steps: [
      { icon: '🗃️', title: 'Analiza BD', desc: 'Ventas, inventario, márgenes' },
      { icon: '🏆', title: 'Rentables', desc: 'Top por margen, no solo volumen' },
      { icon: '⏳', title: 'Llegarán a mínimo', desc: 'Pedidos anticipados' },
      { icon: '💬', title: 'Resumen', desc: 'En lenguaje natural' },
    ],
  },
]

export const reports: ReportDef[] = [
  { name: 'Ventas por período', desc: 'Día / semana / mes con rango custom', formats: ['CSV', 'PDF'], module: 'reports' },
  { name: 'Más vendidos', desc: 'Por volumen y por margen', formats: ['CSV', 'PDF'], module: 'reports' },
  { name: 'Margen por producto', desc: 'Costo vs. ingreso', formats: ['CSV'], module: 'reports' },
  { name: 'Cuentas por cobrar', desc: 'Fíado pendiente por cliente', formats: ['CSV', 'PDF'], module: 'reports' },
  { name: 'Cuadre de turno', desc: 'Efectivo esperado vs. contado', formats: ['PDF'], module: 'reports' },
  { name: 'Resumen diario IA', desc: 'Lenguaje natural + señales', formats: ['App'], module: 'ai' },
]

export const dbTables: DbTableDef[] = [
  { name: 'profiles', group: 'Usuarios', desc: 'Extiende auth.users con rol', columns: 'id, full_name, role, is_active' },
  { name: 'products', group: 'Catálogo', desc: 'Catálogo con costo, precio e inventario', columns: 'name, sku, barcode, cost_price, sale_price, stock_qty, min_qty' },
  { name: 'categories', group: 'Catálogo', desc: 'Categorías del catálogo', columns: 'name, color, icon, sort_order' },
  { name: 'suppliers', group: 'Catálogo', desc: 'Proveedores y días de visita', columns: 'name, phone, visit_days, notes' },
  { name: 'sales', group: 'Ventas', desc: 'Encabezado de venta', columns: 'staff_id, customer_id, payment_method, subtotal, tax, total, shift_id' },
  { name: 'sale_items', group: 'Ventas', desc: 'Líneas de venta', columns: 'sale_id, product_id, qty, unit_price' },
  { name: 'customers', group: 'Ventas', desc: 'Clientes de fíado', columns: 'name, phone, balance_debt' },
  { name: 'stock_movements', group: 'Inventario', desc: 'Movimientos de inventario', columns: 'product_id, delta, reason, reference_id' },
  { name: 'purchase_orders', group: 'Compras', desc: 'Órdenes de compra', columns: 'supplier_id, status, total, received_at' },
  { name: 'purchase_items', group: 'Compras', desc: 'Líneas de compra', columns: 'po_id, product_id, qty_ordered, qty_received, unit_cost' },
  { name: 'shifts', group: 'Caja', desc: 'Turnos de caja', columns: 'staff_id, opening_cash, closing_cash, total_sales' },
  { name: 'captures', group: 'Bitácora', desc: 'Captura informal y archivos', columns: 'type, category, raw_input, file_path/name/mime/size, parsed_json, status, confirmed_at' },
]

export const stack: StackLayerDef[] = [
  { layer: 'Frontend', tech: 'React 18 + Vite + TS', note: 'SPA responsive, mobile-first', accent: 'orange' },
  { layer: 'UI', tech: 'Tailwind + shadcn/ui', note: 'Design system heredado, claro/oscuro', accent: 'blue' },
  { layer: 'State', tech: 'Zustand', note: 'Un store por módulo', accent: 'green' },
  { layer: 'Backend', tech: 'Supabase Postgres', note: 'Base de datos + RLS por rol', accent: 'cyan' },
  { layer: 'Auth', tech: 'Supabase Auth', note: 'Magic link + roles', accent: 'purple' },
  { layer: 'Storage', tech: 'Supabase Storage', note: 'Fotos y audios de bitácora', accent: 'amber' },
  { layer: 'Realtime', tech: 'Supabase Realtime', note: 'Alertas de inventario en vivo', accent: 'green' },
  { layer: 'IA / Cron', tech: 'Edge Functions', note: 'Triggers + resumen diario', accent: 'red' },
  { layer: 'Deploy', tech: 'Supabase Hosting', note: '100% Supabase, sin otro deployer', accent: 'blue' },
]

export const solutionMap = { meta, modules, roles, flows, reports, dbTables, stack }
export type SolutionMap = typeof solutionMap
