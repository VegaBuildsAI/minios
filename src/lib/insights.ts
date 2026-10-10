import { useMemo } from 'react'
import { useDashboardStats, useProducts, useSuppliers } from './data'
import { formatCRC, type Product, type Supplier } from './types'

export type Severity = 'critico' | 'aviso' | 'ok'

export interface Insight {
  id: string
  severity: Severity
  icon: string
  title: string
  detail: string
  productId?: string
  supplier?: string
}

/**
 * Motor de "IA" basado en reglas — corre sobre datos reales, sin API externa.
 * Mismos triggers del kickoff que son deterministas (stock, margen).
 * En Fase 5 se puede complementar con una Edge Function + Claude para lenguaje natural.
 */
export function buildInsights(products: Product[], suppliers: Supplier[]): Insight[] {
  const supName = (id: string | null) => suppliers.find((s) => s.id === id)?.name ?? 'proveedor'
  const out: Insight[] = []

  for (const p of products) {
    if (p.stock_qty <= 0) {
      out.push({
        id: `out-${p.id}`,
        severity: 'critico',
        icon: '🚨',
        title: `${p.name} agotado`,
        detail: `Sin stock. Pedí a ${supName(p.supplier_id)}.`,
        productId: p.id,
        supplier: supName(p.supplier_id),
      })
    } else if (p.stock_qty <= p.min_qty) {
      out.push({
        id: `low-${p.id}`,
        severity: 'aviso',
        icon: '⚠️',
        title: `${p.name} bajo mínimo`,
        detail: `Quedan ${p.stock_qty} (mín ${p.min_qty}). Conviene pedir a ${supName(p.supplier_id)}.`,
        productId: p.id,
        supplier: supName(p.supplier_id),
      })
    }
    if (p.sale_price < p.cost_price) {
      out.push({
        id: `neg-${p.id}`,
        severity: 'critico',
        icon: '📉',
        title: `${p.name} se vende bajo costo`,
        detail: `Precio ${formatCRC(p.sale_price)} < costo ${formatCRC(p.cost_price)}. Ajustá el precio.`,
        productId: p.id,
      })
    }
  }

  // Ordena: críticos primero
  const rank: Record<Severity, number> = { critico: 0, aviso: 1, ok: 2 }
  out.sort((a, b) => rank[a.severity] - rank[b.severity])

  if (out.length === 0) {
    out.push({ id: 'ok', severity: 'ok', icon: '✅', title: 'Todo en orden', detail: 'Sin alertas de inventario ni de margen.' })
  }
  return out
}

export function useInsights() {
  const { data: products = [], isLoading: lp } = useProducts()
  const { data: suppliers = [] } = useSuppliers()
  const { data: stats } = useDashboardStats()

  const insights = useMemo(() => buildInsights(products, suppliers), [products, suppliers])

  const summary = stats
    ? `Hoy vendiste ${formatCRC(stats.salesTodayTotal)} en ${stats.salesTodayCount} ${
        stats.salesTodayCount === 1 ? 'ticket' : 'tickets'
      }. ${stats.criticalCount > 0 ? `Inventario crítico: ${stats.criticalCount} ${stats.criticalCount === 1 ? 'ítem' : 'ítems'}.` : 'Sin inventario crítico.'}`
    : ''

  return { insights, summary, isLoading: lp, stats }
}
