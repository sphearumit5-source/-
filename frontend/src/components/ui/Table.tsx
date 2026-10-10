import { Inbox } from 'lucide-react'
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
  emptyMessage = 'មិនមានទិន្នន័យត្រូវបានរកឃើញទេ',
}: {
  columns: Column<Row>[]
  rows: Row[]
  emptyMessage?: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-semibold tracking-wider text-slate-500">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3.5 text-xs font-semibold ${column.className ?? ''}`}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/90 bg-white">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="transition-colors duration-150 hover:bg-indigo-50/30"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3.5 text-slate-700 ${column.className ?? ''}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Inbox size={36} strokeWidth={1.5} className="text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}