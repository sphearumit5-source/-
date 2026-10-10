import {
  Calendar,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  User,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, PageHeading } from '../../components/ui/Card'
import { ErrorMessage, Loading, StatusBadge } from '../../components/ui/Loading'
import { classesApi, getApiError, reportsApi, studentsApi } from '../../services/api'
import type { Classroom, ReportRow, Student } from '../../types'

type ReportKind = 'daily' | 'monthly' | 'student' | 'class'
type Totals = {
  total_students: number
  present: number
  absent: number
  late: number
  attendance_rate: number
}
type ReportData = Totals & { records: ReportRow[] }

const dateAtLocalTime = new Date()
const today = `${dateAtLocalTime.getFullYear()}-${String(dateAtLocalTime.getMonth() + 1).padStart(2, '0')}-${String(dateAtLocalTime.getDate()).padStart(2, '0')}`
const REPORT_KINDS: Array<{ value: ReportKind; label: string; icon: typeof Calendar }> = [
  { value: 'daily', label: 'ប្រចាំថ្ងៃ', icon: Calendar },
  { value: 'monthly', label: 'ប្រចាំខែ', icon: CalendarDays },
  { value: 'student', label: 'តាមសិស្ស', icon: User },
  { value: 'class', label: 'តាមថ្នាក់រៀន', icon: GraduationCap },
]

export default function Reports() {
  const [kind, setKind] = useState<ReportKind>('daily')
  const [date, setDate] = useState(today)
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [classId, setClassId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [classes, setClasses] = useState<Classroom[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      classesApi.list(),
      studentsApi.list({ status: 'active', page: 1, page_size: 100 }),
    ])
      .then(([classList, studentPage]) => {
        setClasses(classList)
        setStudents(studentPage.items)
      })
      .catch((requestError) => setError(getApiError(requestError)))
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    async function load() {
      if (kind === 'daily') {
        const result = await reportsApi.daily(
          date,
          classId ? Number(classId) : undefined
        )
        return result
      }
      if (kind === 'monthly') {
        const parsed = new Date(`${date}T12:00:00`)
        const result = await reportsApi.monthly(
          parsed.getFullYear(),
          parsed.getMonth() + 1,
          classId ? Number(classId) : undefined
        )
        const totalSchoolDays = result.daily.reduce(
          (sum, point) => sum + point.total_students,
          0
        )
        const present = result.daily.reduce((sum, point) => sum + point.present, 0)
        const absent = result.daily.reduce((sum, point) => sum + point.absent, 0)
        const late = result.daily.reduce((sum, point) => sum + point.late, 0)
        return {
          total_students: result.daily.at(-1)?.total_students ?? 0,
          present,
          absent,
          late,
          attendance_rate: totalSchoolDays
            ? Math.round(((present + late) / totalSchoolDays) * 10000) / 100
            : 0,
          records: result.records,
        }
      }
      if (kind === 'student') {
        if (!studentId) return null
        const result = await reportsApi.student(
          Number(studentId),
          startDate,
          endDate
        )
        return summarizeRecords(result.records)
      }
      if (!classId) return null
      const result = await reportsApi.classroom(
        Number(classId),
        startDate,
        endDate
      )
      return summarizeRecords(result.records)
    }

    load()
      .then((result) => alive && setReport(result))
      .catch((requestError) => alive && setError(getApiError(requestError)))
      .finally(() => alive && setLoading(false))

    return () => {
      alive = false
    }
  }, [kind, date, startDate, endDate, classId, studentId])

  function summarizeRecords(records: ReportRow[]): ReportData {
    const present = records.filter((item) => item.status === 'present').length
    const late = records.filter((item) => item.status === 'late').length
    const absent = records.filter((item) => item.status === 'absent').length
    return {
      total_students: new Set(records.map((item) => item.student_id)).size,
      present,
      absent,
      late,
      attendance_rate: records.length
        ? Math.round(((present + late) / records.length) * 10000) / 100
        : 0,
      records,
    }
  }

  async function download(format: 'pdf' | 'excel') {
    setDownloading(true)
    setError('')
    try {
      const range =
        kind === 'daily'
          ? { start: date, end: date }
          : kind === 'monthly'
          ? (() => {
              const parsed = new Date(`${date}T12:00:00`)
              const year = parsed.getFullYear()
              const month = parsed.getMonth()
              return {
                start: `${year}-${String(month + 1).padStart(2, '0')}-01`,
                end: `${year}-${String(month + 1).padStart(2, '0')}-${String(
                  new Date(year, month + 1, 0).getDate()
                ).padStart(2, '0')}`,
              }
            })()
          : { start: startDate, end: endDate }

      const file = await reportsApi.export(
        range.start,
        range.end,
        format,
        classId ? Number(classId) : undefined,
        kind === 'student' && studentId ? Number(studentId) : undefined
      )
      const url = URL.createObjectURL(file)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download =
        format === 'pdf' ? 'attendance-report.pdf' : 'attendance-report.xlsx'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="របាយការណ៍វត្តមាន"
        description="សង្ខេបស្ថិតិវត្តមានសិស្ស និងទាញយករបាយការណ៍ជាឯកសារ Excel ឬ PDF។"
      />

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* Report Controls Card */}
      <Card className="p-5 sm:p-6">
        {/* Report Kind Selector Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
          {REPORT_KINDS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                kind === value
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/25'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Filters Form */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3.5">
            {(kind === 'daily' || kind === 'monthly') && (
              <label className="space-y-1 text-xs font-bold text-slate-700">
                <span>{kind === 'daily' ? 'កាលបរិច្ឆេទ' : 'ខែរាយការណ៍'}</span>
                <input
                  type={kind === 'daily' ? 'date' : 'month'}
                  value={kind === 'daily' ? date : date.slice(0, 7)}
                  onChange={(event) =>
                    setDate(
                      kind === 'monthly'
                        ? `${event.target.value}-01`
                        : event.target.value
                    )
                  }
                  className="h-11 min-w-48 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </label>
            )}

            {(kind === 'student' || kind === 'class') && (
              <>
                <label className="space-y-1 text-xs font-bold text-slate-700">
                  <span>{kind === 'student' ? 'ជ្រើសរើសសិស្ស' : 'ជ្រើសរើសថ្នាក់'}</span>
                  {kind === 'student' ? (
                    <select
                      value={studentId}
                      onChange={(event) => setStudentId(event.target.value)}
                      className="h-11 min-w-56 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    >
                      <option value="">-- សូមជ្រើសរើសសិស្ស --</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.student_code} · {student.last_name}{' '}
                          {student.first_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={classId}
                      onChange={(event) => setClassId(event.target.value)}
                      className="h-11 min-w-48 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    >
                      <option value="">-- សូមជ្រើសរើសថ្នាក់ --</option>
                      {classes.map((classroom) => (
                        <option key={classroom.id} value={classroom.id}>
                          {classroom.class_name}
                        </option>
                      ))}
                    </select>
                  )}
                </label>

                <label className="space-y-1 text-xs font-bold text-slate-700">
                  <span>ចាប់ពីថ្ងៃ</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </label>

                <label className="space-y-1 text-xs font-bold text-slate-700">
                  <span>ដល់ថ្ងៃ</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </label>
              </>
            )}

            {(kind === 'daily' || kind === 'monthly') && (
              <label className="space-y-1 text-xs font-bold text-slate-700">
                <span>ថ្នាក់រៀន</span>
                <select
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                  className="h-11 min-w-48 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="">-- គ្រប់ថ្នាក់ទាំងអស់ --</option>
                  {classes.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.class_name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="secondary"
              disabled={downloading || !report}
              onClick={() => void download('pdf')}
              icon={<FileText size={16} className="text-rose-600" />}
            >
              {downloading ? 'កំពុងទាញយក…' : 'ទាញយក PDF'}
            </Button>
            <Button
              variant="success"
              disabled={downloading || !report}
              onClick={() => void download('excel')}
              icon={<FileSpreadsheet size={16} />}
            >
              {downloading ? 'កំពុងទាញយក…' : 'ទាញយក Excel'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Report Summary Cards & Table */}
      {loading ? (
        <Loading label="កំពុងបង្កើត និងទាញយកទិន្នន័យរបាយការណ៍…" />
      ) : (
        report && (
          <div className="space-y-6">
            {/* KPI Metric Tiles */}
            <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                {
                  label: kind === 'monthly' ? 'សិស្សសរុប (ថ្ងៃចុងក្រោយ)' : 'សិស្សសរុប',
                  value: report.total_students,
                  color: 'text-indigo-700',
                  bg: 'bg-indigo-50/70 border-indigo-100',
                },
                {
                  label: 'មានវត្តមាន',
                  value: report.present,
                  color: 'text-emerald-700',
                  bg: 'bg-emerald-50/70 border-emerald-100',
                },
                {
                  label: 'អវត្តមាន',
                  value: report.absent,
                  color: 'text-rose-700',
                  bg: 'bg-rose-50/70 border-rose-100',
                },
                {
                  label: 'មកយឺត',
                  value: report.late,
                  color: 'text-amber-700',
                  bg: 'bg-amber-50/70 border-amber-100',
                },
                {
                  label: 'អត្រាវត្តមាន',
                  value: `${report.attendance_rate}%`,
                  color: 'text-blue-700',
                  bg: 'bg-blue-50/70 border-blue-100',
                },
              ].map(({ label, value, color, bg }) => (
                <Card key={label} className={`p-5 border ${bg}`}>
                  <p className="text-xs font-semibold text-slate-500">{label}</p>
                  <p className={`mt-2 text-2xl font-extrabold ${color} tracking-tight`}>
                    {Number.isFinite(Number(value))
                      ? Number(value).toLocaleString('km-KH')
                      : value}
                  </p>
                </Card>
              ))}
            </div>

            {/* Attendance Table */}
            <Card className="p-5 sm:p-6">
              <h2 className="mb-4 font-bold text-slate-900 text-base">
                បញ្ជីកំណត់ត្រាវត្តមានលម្អិត
              </h2>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-slate-200/80 bg-slate-50/75 text-xs font-semibold text-slate-500">
                    <tr>
                      {[
                        'អត្តលេខ',
                        'ឈ្មោះសិស្ស',
                        'ថ្នាក់រៀន',
                        'កាលបរិច្ឆេទ',
                        'ម៉ោងចូល',
                        'ស្ថានភាព',
                        'ភាពស្រដៀងមុខ AI',
                      ].map((item) => (
                        <th key={item} className="px-4 py-3.5 font-semibold">
                          {item}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {report.records.map((record) => (
                      <tr
                        key={`${record.attendance_date}-${record.id}`}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-600">
                          {record.student_code}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {record.student_name}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-600">
                          <span className="rounded-lg bg-indigo-50/60 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                            {record.class_name}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                          {record.attendance_date}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-700">
                          {record.check_in_time ?? '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge
                            status={record.status}
                            label={
                              record.status === 'present'
                                ? 'មានវត្តមាន'
                                : record.status === 'late'
                                ? 'មកយឺត'
                                : 'អវត្តមាន'
                            }
                          />
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-600">
                          {record.confidence == null ? '—' : `${record.confidence}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {report.records.length === 0 && (
                  <div className="py-14 text-center">
                    <Users size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-500">
                      មិនមានកំណត់ត្រាវត្តមានក្នុងលក្ខខណ្ឌនេះទេ។
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )
      )}
    </div>
  )
}