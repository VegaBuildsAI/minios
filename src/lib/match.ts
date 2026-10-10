import type { Product } from './types'

/** minúsculas, sin tildes ni signos. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** "natillas"→"natilla", "yogures"→"yogur". */
const stem = (t: string) => (t.length > 4 && t.endsWith('es') ? t.slice(0, -2) : t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t)

// Presentaciones/unidades: "1l", "500g", "30u", "x24"… no distinguen el producto, solo la medida.
const SIZE = /^(x?\d+([.,]\d+)?(kg|g|gr|ml|l|lt|lts|u|un|und|oz|cc)?|de|la|el|los|las|y|con)$/

function tokens(s: string): string[] {
  return norm(s)
    .split(' ')
    .filter((t) => t && !SIZE.test(t))
    .map(stem)
}

/** Similitud 0..1: palabras compartidas / palabras del nombre más largo (Jaccard). */
function score(a: string, b: string): number {
  const ta = new Set(tokens(a))
  const tb = new Set(tokens(b))
  if (!ta.size || !tb.size) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  return inter / (ta.size + tb.size - inter)
}

export interface MatchResult {
  /** Producto elegido automáticamente (solo si el parecido es alto y claramente mejor que el 2.º). */
  product: Product | null
  /** Mejores candidatos para que el usuario elija si no hubo match automático. */
  candidates: Product[]
}

export function matchProduct(description: string, products: Product[]): MatchResult {
  const exact = products.filter((p) => norm(p.name) === norm(description))
  if (exact.length === 1) return { product: exact[0], candidates: [] }

  const ranked = products
    .map((p) => ({ p, s: score(description, p.name) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s)
  const best = ranked[0]
  const second = ranked[1]
  if (best && best.s >= 0.6 && (!second || best.s - second.s >= 0.15)) {
    return { product: best.p, candidates: ranked.slice(1, 4).map((x) => x.p) }
  }
  return { product: null, candidates: ranked.slice(0, 4).map((x) => x.p) }
}
