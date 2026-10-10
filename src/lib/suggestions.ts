import type { Product } from './types'

/**
 * Sugerencia de qué hacer con un producto rentable, según su margen y su
 * inventario actual. Rule-based sobre datos reales (sin LLM).
 */
export function profitSuggestion(
  product: Product | undefined,
  marginPct: number,
  supplierName?: string,
): string {
  const prov = supplierName ?? 'tu proveedor'

  if (product) {
    if (product.stock_qty <= 0) {
      return `Deja buena ganancia y está agotado — reabastecé ya con ${prov} para no perder ventas.`
    }
    if (product.stock_qty <= product.min_qty) {
      return `Rentable y con inventario bajo — pedí a ${prov} antes de que se agote.`
    }
  }

  if (marginPct >= 35) {
    return 'Producto estrella: dale visibilidad en el mostrador o armá combos para vender más.'
  }
  if (marginPct < 15) {
    return `Margen bajo para lo que vende — negociá el costo con ${prov} o subí un poco el precio.`
  }
  return 'Buen desempeño: mantené el inventario surtido y la exhibición.'
}
