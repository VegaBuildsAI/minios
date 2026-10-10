import type { CSSProperties } from 'react'
import type { AccentKey } from '@/config/solution-map'

/** CSS var references for a given accent key. Use in inline style props. */
export function accent(key: AccentKey) {
  return {
    color: `var(--accent-${key})`,
    dim: `var(--accent-${key}-dim)`,
  }
}

/** Convenience: inline style vars an accent-aware component can consume. */
export function accentVars(key: AccentKey): CSSProperties {
  return {
    ['--a' as string]: `var(--accent-${key})`,
    ['--a-dim' as string]: `var(--accent-${key}-dim)`,
  } as CSSProperties
}
