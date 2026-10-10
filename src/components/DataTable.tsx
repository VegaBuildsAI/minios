import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  align?: 'left' | 'right'
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, i: number) => string
  empty?: string
}

export function DataTable<T>({ columns, rows, rowKey, empty = 'Sin datos' }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-line">
      <table className="w-full border-collapse text-[0.8rem]">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className="border-b border-line bg-surface px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-wide text-fg-muted"
                style={{ textAlign: c.align ?? 'left' }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-fg-muted">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={rowKey(row, i)} className="transition-colors hover:bg-surface/60">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className="border-b border-line/60 px-3 py-2.5 text-fg-secondary"
                    style={{ textAlign: c.align ?? 'left' }}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
