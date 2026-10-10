export type PaymentMethod = 'efectivo' | 'sinpe' | 'tarjeta' | 'fiado'
export type MovementReason = 'sale' | 'purchase' | 'merma' | 'robo' | 'vencimiento' | 'ajuste' | 'entrada'

export interface Category {
  id: string
  name: string
  color: string | null
  icon: string | null
  sort_order: number
}

export interface Product {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  category_id: string | null
  unit: string
  cost_price: number
  sale_price: number
  stock_qty: number
  min_qty: number
  supplier_id: string | null
  is_active: boolean
  image_url: string | null
}

export interface StockMovement {
  id: string
  product_id: string
  delta: number
  reason: MovementReason
  reference_id: string | null
  created_at: string
}

export interface Sale {
  id: string
  staff_id: string | null
  customer_id: string | null
  shift_id: string | null
  payment_method: PaymentMethod
  subtotal: number
  tax: number
  total: number
  change_given: number
  /** Foto del tiquete de la registradora (si la venta vino de un tiquete). */
  capture_id: string | null
  ticket_number: string | null
  created_at: string
}

export interface Shift {
  id: string
  staff_id: string | null
  opened_at: string
  closed_at: string | null
  opening_cash: number
  closing_cash: number | null
  total_sales: number
}

export interface Supplier {
  id: string
  name: string
  phone: string | null
  visit_days: string[]
  notes: string | null
  is_active: boolean
}

export type POStatus = 'borrador' | 'enviada' | 'recibida' | 'cancelada'

export interface PurchaseOrder {
  id: string
  supplier_id: string | null
  status: POStatus
  total: number
  created_at: string
  received_at: string | null
}

export interface PurchaseItem {
  id: string
  po_id: string
  product_id: string | null
  qty_ordered: number
  qty_received: number
  unit_cost: number
}

/** `photo` queda por compatibilidad con entradas anteriores; los archivos nuevos son `file`. */
export type CaptureType = 'text' | 'voice' | 'photo' | 'file'
export type CaptureStatus = 'borrador' | 'procesado' | 'archivado'
/** De qué parte del negocio es la entrada (base para que la IA/el asistente la use después). */
export type CaptureCategory = 'inventario' | 'caja' | 'notas'

export type AiStatus = 'sin_procesar' | 'procesando' | 'listo' | 'error'

/** Datos que la IA extrae de un documento (claves de línea cortas para ahorrar tokens de salida). */
export interface AiExtraction {
  categoria: CaptureCategory
  tipo: 'factura_proveedor' | 'recibo' | 'cierre_caja' | 'comprobante_pago' | 'nota' | 'otro'
  proveedor: string | null
  fecha: string | null
  numero: string | null
  moneda: 'CRC' | 'USD'
  subtotal: number | null
  iva: number | null
  total: number | null
  /** d = descripción, c = cantidad, p = precio unitario, t = total de la línea */
  lineas: { d: string; c: number | null; p: number | null; t: number | null }[]
  resumen: string
  texto: string | null
  confianza: number
  /** Dudas de la IA + advertencias automáticas (aritmética que no cuadra, números largos). */
  revisar: string[]
}

export interface Capture {
  id: string
  type: CaptureType
  category: CaptureCategory
  raw_input: string | null
  /** `{ ai?: AiExtraction, applied?: {...} }` (las entradas viejas pueden traer otra forma). */
  parsed_json: { ai?: AiExtraction; applied?: { po_id?: string; sale_id?: string; at: string } } | null
  /** Ruta dentro del bucket privado 'bitacora' (se abre con URL firmada). */
  file_path: string | null
  file_name: string | null
  file_mime: string | null
  file_size: number | null
  extracted_text: string | null
  ai_status: AiStatus
  ai_error: string | null
  ai_confidence: number | null
  status: CaptureStatus
  created_by: string | null
  confirmed_at: string | null
  created_at: string
}

/** Acciones que propone el asistente; el usuario las confirma antes de que se apliquen. */
export type Proposal =
  | { id: string; kind: 'stock_adjust'; producto_id: string; producto: string; delta: number; razon: string; resumen: string }
  | {
      id: string
      kind: 'purchase_order'
      proveedor_id: string
      proveedor: string
      items: { producto_id: string; producto: string; cantidad: number; costo: number }[]
      total: number
      resumen: string
    }
  | { id: string; kind: 'receive_invoice'; captura_id: string; resumen: string }

/** Movimiento de efectivo que no es venta: `ingreso` entra a la caja; el resto sale. */
export type CashKind = 'ingreso' | 'pago_proveedor' | 'gasto' | 'retiro'

export interface CashMovement {
  id: string
  shift_id: string | null
  kind: CashKind
  amount: number
  note: string | null
  supplier_id: string | null
  created_by: string | null
  created_at: string
}

export const IVA_RATE = 0.13

export function formatCRC(n: number): string {
  return '₡' + Math.round(n).toLocaleString('es-CR')
}
