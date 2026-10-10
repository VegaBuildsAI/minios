/**
 * solution-map.ts — Manifiesto único de MiniOS.
 *
 * Fuente de verdad del paquete de la solución: módulos, accesos/roles, flujos,
 * reportes, esquema de base de datos y stack. «Conoce la app» (/control/conoce)
 * lee de aquí. Un solo lugar que editar.
 */

/** Nombre de ícono lucide; se resuelve en `modules/control/icons.ts`. */
export type IconName =
  | 'receipt'
  | 'package'
  | 'truck'
  | 'notebook'
  | 'chart'
  | 'settings'
  | 'sparkles'
  | 'camera'
  | 'scan'
  | 'check'
  | 'database'
  | 'trending-down'
  | 'alert'
  | 'calendar'
  | 'clipboard'
  | 'coins'
  | 'search'
  | 'message'

export type ModuleStatus = 'planned' | 'building' | 'ready'
export type Priority = 'P0' | 'P1' | 'P2'
export type RoleId = 'superadmin' | 'owner' | 'staff'
/** 2 = total, 1 = ver/consultar, 0 = sin acceso */
export type AccessLevel = 0 | 1 | 2

export interface ModuleDef {
  id: string // M1..M7
  code: string // slug de la ruta / carpeta
  name: string
  icon: IconName
  description: string
  priority: Priority
  status: ModuleStatus
  features: string[]
  /** Pantalla de la app móvil donde vive el módulo. */
  appPath: string
}

export interface RoleDef {
  id: RoleId
  name: string
  who: string
  /** Nivel de acceso por módulo (code). */
  access: Record<string, AccessLevel>
  notes: string
}

export interface FlowStep {
  title: string
  desc: string
}

export interface FlowDef {
  id: string
  name: string
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
  group: 'Usuarios' | 'Catálogo' | 'Ventas' | 'Inventario' | 'Compras' | 'Caja' | 'Bitácora e IA' | 'Configuración'
  desc: string
  columns: string
}

export interface StackLayerDef {
  layer: string
  tech: string
  note: string
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
    'Micro-ERP para minisúper. Caja, inventario, proveedores, bitácora y reportes desde el celular, con una capa de IA que convierte lo informal —tiquetes y facturas en foto, notas de voz— en datos.',
  version: 'v0.1',
  country: 'Costa Rica',
  stats: [
    { num: '7', label: 'Módulos' },
    { num: '$0', label: 'Costo inicial' },
    { num: '100 %', label: 'Supabase' },
    { num: 'PWA', label: 'Instalable' },
  ],
}

export const modules: ModuleDef[] = [
  {
    id: 'M1',
    code: 'pos',
    name: 'Caja',
    icon: 'receipt',
    description:
      'Las ventas se cobran en la caja registradora. MiniOS registra cada tiquete (foto → IA → productos enrutados al inventario) y las entradas y salidas de efectivo: gastos, pagos a proveedor, retiros. Turno con apertura y cuadre.',
    priority: 'P0',
    status: 'ready',
    features: ['Tiquete con IA', 'Enrutar al inventario', 'Salidas de efectivo', 'Turno y cuadre'],
    appPath: '/app/caja',
  },
  {
    id: 'M2',
    code: 'inventory',
    name: 'Inventario en tiempo real',
    icon: 'package',
    description:
      'Costo, precio e inventario. Baja con cada tiquete registrado; alerta de crítico, entrada manual de mercadería, productos nuevos y ajustes con razón e historial.',
    priority: 'P0',
    status: 'ready',
    features: ['Auto-deducción', 'Entrada manual', 'Merma / robo', 'Historial'],
    appPath: '/app/inventario',
  },
  {
    id: 'M3',
    code: 'suppliers',
    name: 'Proveedores y compras',
    icon: 'truck',
    description: 'Días de visita, órdenes sugeridas y recepción que actualiza el inventario.',
    priority: 'P1',
    status: 'ready',
    features: ['Directorio', 'Orden sugerida', 'Recepción', 'Visitas de la semana'],
    appPath: '/app/proveedores',
  },
  {
    id: 'M4',
    code: 'bitacora',
    name: 'Bitácora',
    icon: 'notebook',
    description: 'Reemplaza el cuaderno: texto, voz o foto/PDF. La IA transcribe y clasifica; el usuario confirma antes de cargar nada.',
    priority: 'P1',
    status: 'ready',
    features: ['Texto', 'Voz', 'Foto / PDF + IA', 'Confirmar'],
    appPath: '/app/bitacora',
  },
  {
    id: 'M5',
    code: 'reports',
    name: 'Reportes y cuadre',
    icon: 'chart',
    description: 'Ventas por período, margen, más vendidos, cuentas por cobrar y cuadre de turno, con CSV.',
    priority: 'P1',
    status: 'ready',
    features: ['Margen', 'Fiado', 'Cuadre', 'CSV'],
    appPath: '/app/reports',
  },
  {
    id: 'M6',
    code: 'settings',
    name: 'Configuración',
    icon: 'settings',
    description: 'Perfil del negocio, IVA, moneda CRC / USD, usuarios y roles, y control de la IA.',
    priority: 'P1',
    status: 'ready',
    features: ['Perfil', 'IVA / Moneda', 'Roles', 'Tope IA'],
    appPath: '/app/config',
  },
  {
    id: 'M7',
    code: 'ai',
    name: 'Capa de IA',
    icon: 'sparkles',
    description:
      'Claude Haiku 4.5 en Edge Functions: lee tiquetes, facturas y notas, y responde con herramientas acotadas. Siempre propone; tope de gasto diario.',
    priority: 'P1',
    status: 'ready',
    features: ['Lectura de documentos', 'Asistente', 'Tope de gasto', 'Caché por hash'],
    appPath: '/app/assistant',
  },
]

const ALL: Record<string, AccessLevel> = { pos: 2, inventory: 2, suppliers: 2, bitacora: 2, reports: 2, settings: 2, ai: 2 }

export const roles: RoleDef[] = [
  {
    id: 'superadmin',
    name: 'Superadmin',
    who: 'AXIO · + Panel de Control y usuarios',
    access: ALL,
    notes: 'Acceso total, Panel de Control, gestión de usuarios y configuración de IA.',
  },
  {
    id: 'owner',
    name: 'Dueño',
    who: 'Aplica facturas, órdenes y ajustes',
    access: ALL,
    notes: 'Todo lo operativo, incluido el Panel de Control.',
  },
  {
    id: 'staff',
    name: 'Personal',
    who: 'Registra tiquetes y anota',
    access: { pos: 2, inventory: 1, suppliers: 0, bitacora: 2, reports: 0, settings: 0, ai: 1 },
    notes: 'Caja y Bitácora; consulta inventario y asistente. Sin reportes ni configuración.',
  },
]

export const flows: FlowDef[] = [
  {
    id: 'ticket',
    name: 'Tiquete → Inventario',
    trigger: 'venta cobrada en la caja registradora',
    steps: [
      { title: 'Foto del tiquete', desc: 'Desde Caja, con el celular' },
      { title: 'IA lee', desc: 'Total, número y líneas' },
      { title: 'Enrutar', desc: 'Cada línea a un producto' },
      { title: 'Registrar', desc: 'Venta en una sola transacción' },
      { title: 'Descontar', desc: 'Baja el inventario y alerta si queda ≤ mínimo' },
    ],
  },
  {
    id: 'capture',
    name: 'Captura → IA → Base de datos',
    trigger: 'entrada en Bitácora',
    steps: [
      { title: 'Capturar', desc: 'Texto, foto o audio' },
      { title: 'IA lee', desc: 'Clasifica y transcribe en 1 llamada' },
      { title: 'Borrador', desc: 'Revisión línea por línea' },
      { title: 'Confirmar', desc: 'El usuario valida' },
      { title: 'Guardar', desc: 'Queda como dato estructurado' },
    ],
  },
  {
    id: 'purchase',
    name: 'Compra a proveedor',
    trigger: 'visita del proveedor o inventario bajo',
    steps: [
      { title: 'Visita / mínimo', desc: 'Por día o por inventario' },
      { title: 'Orden sugerida', desc: 'La IA propone cantidades' },
      { title: 'Recepción', desc: 'Factura con IA o entrada manual' },
      { title: 'Inventario', desc: 'Entra al stock' },
      { title: 'Pago', desc: 'Salida de efectivo en Caja' },
    ],
  },
  {
    id: 'cash',
    name: 'Cuadre de caja',
    trigger: 'cierre de turno',
    steps: [
      { title: 'Apertura', desc: 'Fondo inicial' },
      { title: 'Tiquetes', desc: 'Ventas en efectivo' },
      { title: 'Salidas', desc: 'Gastos, pagos y retiros' },
      { title: 'Cuadre', desc: 'Esperado vs. contado' },
    ],
  },
]

export const reports: ReportDef[] = [
  { name: 'Ventas por período', desc: 'Día, semana o mes', formats: ['CSV'], module: 'reports' },
  { name: 'Más vendidos', desc: 'Por volumen y por margen', formats: ['CSV'], module: 'reports' },
  { name: 'Margen por producto', desc: 'Costo vs. ingreso', formats: ['CSV'], module: 'reports' },
  { name: 'Cuentas por cobrar', desc: 'Fiado pendiente por cliente', formats: ['En la app'], module: 'reports' },
  { name: 'Cuadre de turno', desc: 'Efectivo esperado vs. contado', formats: ['En la app'], module: 'pos' },
  { name: 'Asistente IA', desc: 'Preguntas en lenguaje natural sobre tus datos', formats: ['En la app'], module: 'ai' },
]

export const dbTables: DbTableDef[] = [
  { name: 'profiles', group: 'Usuarios', desc: 'Rol de cada usuario', columns: 'id, full_name, role, is_active' },
  { name: 'products', group: 'Catálogo', desc: 'Costo, precio e inventario', columns: 'name, sku, barcode, cost_price, sale_price, stock_qty, min_qty' },
  { name: 'categories', group: 'Catálogo', desc: 'Categorías', columns: 'name, color, icon, sort_order' },
  { name: 'suppliers', group: 'Catálogo', desc: 'Proveedores y visitas', columns: 'name, phone, visit_days, notes' },
  { name: 'sales', group: 'Ventas', desc: 'Tiquete registrado y pago', columns: 'payment_method, subtotal, tax, total, shift_id, capture_id, ticket_number' },
  { name: 'sale_items', group: 'Ventas', desc: 'Líneas del tiquete', columns: 'sale_id, product_id, qty, unit_price' },
  { name: 'customers', group: 'Ventas', desc: 'Clientes de fiado', columns: 'name, phone, balance_debt' },
  { name: 'stock_movements', group: 'Inventario', desc: 'Cada entrada y salida', columns: 'product_id, delta, reason, reference_id' },
  { name: 'purchase_orders', group: 'Compras', desc: 'Órdenes', columns: 'supplier_id, status, total, received_at' },
  { name: 'purchase_items', group: 'Compras', desc: 'Pedido vs. recibido', columns: 'po_id, product_id, qty_ordered, qty_received, unit_cost' },
  { name: 'shifts', group: 'Caja', desc: 'Turnos y cuadre', columns: 'staff_id, opening_cash, closing_cash, total_sales' },
  { name: 'cash_movements', group: 'Caja', desc: 'Entradas y salidas de efectivo', columns: 'shift_id, kind, amount, note, supplier_id' },
  { name: 'captures', group: 'Bitácora e IA', desc: 'Entradas y archivos', columns: 'type, category, raw_input, file_path, parsed_json, ai_status, status' },
  { name: 'ai_usage', group: 'Bitácora e IA', desc: 'Tokens y costo de cada llamada', columns: 'fn, model, input_tokens, output_tokens, cost_usd' },
  { name: 'business_settings', group: 'Configuración', desc: 'Perfil del negocio e IA', columns: 'name, tax_rate, currency, ai_enabled, ai_daily_budget_usd' },
]

export const stack: StackLayerDef[] = [
  { layer: 'Frontend', tech: 'React 19 + Vite 8 + TypeScript', note: 'PWA instalable, pensada para celular' },
  { layer: 'UI', tech: 'Tailwind v4 · sistema «Mostrador»', note: 'Tokens propios, accesible AA' },
  { layer: 'Datos', tech: 'TanStack Query + supabase-js', note: 'Caché y refresco por módulo' },
  { layer: 'Backend', tech: 'Supabase Postgres', note: 'RLS por rol, RPC atómicas' },
  { layer: 'Auth', tech: 'Supabase Auth', note: 'Contraseña o enlace mágico (PKCE)' },
  { layer: 'Archivos', tech: 'Supabase Storage', note: 'Bucket privado de Bitácora' },
  { layer: 'IA', tech: 'Edge Functions + Claude Haiku 4.5', note: 'Lectura de documentos y asistente, con tope diario' },
  { layer: 'Hosting', tech: 'Cloudflare Pages', note: 'Frontend estático; Supabase sirve los datos' },
]

