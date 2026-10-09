import type { ReactNode } from 'react'

export interface Column<Row> {
  key: string
  title: string
  render: (row: Row) => ReactNode
  className?: string
}

export function Table<Row extends { id: number | string }>({
  columns,
  rows,
  emptyMessage = 'មិនមានទិន្នន័យ',
}: {
  columns: Column<Row>[]
  rows: Row[]
  emptyMessage?: string
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>{columns.map((column) => <th key={column.key} scope="col" className={`px-4 py-3 ${column.className ?? ''}`}>{column.title}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => <tr key={row.id} className="transition-colors duration-200 hover:bg-blue-50/40">{columns.map((column) => <td key={column.key} className={`px-4 py-3 text-slate-700 ${column.className ?? ''}`}>{column.render(row)}</td>)}</tr>)}
          {rows.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">{emptyMessage}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}