import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, PageHeading } from '../../components/ui/Card'
import { ErrorMessage, Loading, StatusBadge } from '../../components/ui/Loading'
import { useAuth } from '../../hooks/useAuth'
import { attendanceApi, classesApi, getApiError } from '../../services/api'
import type { AttendancePage, Classroom } from '../../types'

const localDate = new Date()
const today = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`
const labels = {
  present: 'មានវត្តមាន',
  absent: 'អវត្តមាន',
  late: 'មកយឺត',
} as const

export default function Attendance() {
  const { user } = useAuth()
  const [result, setResult] = useState<AttendancePage>({
    items: [],
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 0,
  })
  const [classes, setClasses] = useState<Classroom[]>([])
  const [date, setDate] = useState(today)
  const [classId, setClassId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [records, classroomList] = await Promise.all([
        attendanceApi.list({
          attendance_date: date || undefined,
          class_id: classId || undefined,
          status: status || undefined,
          page,
          page_size: 20,
        }),
        classesApi.list(),
      ])
      setResult(records)
      setClasses(classroomList)
      setError('')
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setLoading(false)
    }
  }, [date, classId, status, page])

  useEffect(() => {
    void load()
  }, [load])

  async function setRecordStatus(
    id: number,
    nextStatus: 'present' | 'absent' | 'late'
  ) {
    try {
      await attendanceApi.update(id, { status: nextStatus })
      await load()
    } catch (requestError) {
      setError(getApiError(requestError))
    }
  }

  async function removeRecord(id: number) {
    if (!window.confirm('តើអ្នកប្រាកដថាចង់លុបកំណត់ត្រាវត្តមាននេះមែនទេ?')) return
    try {
      await attendanceApi.remove(id)
      await load()
    } catch (requestError) {
      setError(getApiError(requestError))
    }
  }

  function adjustDate(days: number) {
    const current = new Date(date)
    current.setDate(current.getDate() + days)
    const nextDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
    setDate(nextDate)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="គ្រប់គ្រងកំណត់ត្រាវត្តមាន"
        description={`វត្តមានសរុបចំនួន ${result.total.toLocaleString('km-KH')} កំណត់ត្រា`}
      />

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <Card className="p-5 sm:p-6">
        {/* Filters Toolbar */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {/* Date Picker with Quick Controls */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700">កាលបរិច្ឆេទ</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => adjustDate(-1)}
                className="grid h-11 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 active:scale-95"
                title="ថ្ងៃមុន"
                aria-label="ថ្ងៃមុន"
              >
                <ChevronLeft size={16} />
              </button>
              <input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value)
                  setPage(1)
                }}
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              />
              <button
                type="button"
                onClick={() => adjustDate(1)}
                className="grid h-11 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 active:scale-95"
                title="ថ្ងៃបន្ទាប់"
                aria-label="ថ្ងៃបន្ទាប់"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDate(today)
                  setPage(1)
                }}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                title="ត្រឡប់មកថ្ងៃនេះ"
              >
                ថ្ងៃនេះ
              </button>
            </div>
          </div>

          {/* Class Filter */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700">ថ្នាក់រៀន</span>
            <select
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value)
                setPage(1)
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="">-- គ្រប់ថ្នាក់ទាំងអស់ --</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.class_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700">ស្ថានភាពវត្តមាន</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="">-- គ្រប់ស្ថានភាពទាំងអស់ --</option>
              <option value="present">មានវត្តមាន (Present)</option>
              <option value="late">មកយឺត (Late)</option>
              <option value="absent">អវត្តមាន (Absent)</option>
            </select>
          </div>
        </div>

        {/* Attendance Records Table */}
        {loading ? (
          <Loading label="កំពុងទាញយកទិន្នន័យវត្តមាន…" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/75 text-xs font-semibold text-slate-500">
                <tr>
                  {[
                    'សិស្ស',
                    'ថ្នាក់រៀន',
                    'កាលបរិច្ឆេទ',
                    'ម៉ោងចូល',
                    'ម៉ោងចេញ',
                    'ស្ថានភាព',
                    'ភាពស្រដៀងមុខ AI',
                    ...(user?.role === 'admin' ? ['សកម្មភាព'] : []),
                  ].map((item) => (
                    <th key={item} className="px-4 py-3.5 font-semibold">
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {result.items.map((record) => (
                  <tr
                    key={record.id}
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900">{record.student_name}</p>
                      <span className="font-mono text-[11px] font-semibold text-slate-500">
                        {record.student_code}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-lg bg-indigo-50/60 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        {record.class_name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                      {record.attendance_date}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-700">
                      {record.check_in_time ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                      {record.check_out_time ?? '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {user?.role === 'admin' ? (
                        <select
                          aria-label={`កែស្ថានភាព ${record.student_name}`}
                          value={record.status}
                          onChange={(event) =>
                            void setRecordStatus(
                              record.id,
                              event.target.value as typeof record.status
                            )
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 transition focus:border-indigo-600"
                        >
                          {Object.entries(labels).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge
                          status={record.status}
                          label={labels[record.status]}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {record.confidence == null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`size-2 rounded-full ${
                              record.confidence >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          <span className="text-xs font-mono font-bold text-slate-700">
                            {record.confidence}%
                          </span>
                        </div>
                      )}
                    </td>
                    {user?.role === 'admin' && (
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          title="លុបកំណត់ត្រា"
                          aria-label={`លុបវត្តមាន ${record.student_name}`}
                          onClick={() => void removeRecord(record.id)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {result.items.length === 0 && (
              <div className="py-14 text-center">
                <Users size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">
                  មិនមានកំណត់ត្រាវត្តមានសម្រាប់លក្ខខណ្ឌនេះទេ។
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
          <span>
            ទំព័រទី <strong>{page.toLocaleString('km-KH')}</strong> នៃ{' '}
            <strong>{Math.max(result.total_pages, 1).toLocaleString('km-KH')}</strong>
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              icon={<ChevronLeft size={16} />}
            >
              ទំព័រមុន
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= result.total_pages}
              onClick={() => setPage((current) => current + 1)}
              icon={<ChevronRight size={16} />}
            >
              បន្ទាប់
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}