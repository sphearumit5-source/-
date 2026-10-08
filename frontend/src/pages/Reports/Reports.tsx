import { FileSpreadsheet, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, PageHeading } from '../../components/ui/Card'
import { ErrorMessage, Loading, StatusBadge } from '../../components/ui/Loading'
import { classesApi, getApiError, reportsApi, studentsApi } from '../../services/api'
import type { Classroom, ReportRow, Student } from '../../types'

type ReportKind = 'daily' | 'monthly' | 'student' | 'class'
type Totals = { total_students: number; present: number; absent: number; late: number; attendance_rate: number }
type ReportData = Totals & { records: ReportRow[] }

const dateAtLocalTime = new Date()
const today = `${dateAtLocalTime.getFullYear()}-${String(dateAtLocalTime.getMonth() + 1).padStart(2, '0')}-${String(dateAtLocalTime.getDate()).padStart(2, '0')}`
const REPORT_KINDS: Array<{ value: ReportKind; label: string }> = [
  { value: 'daily', label: 'ប្រចាំថ្ងៃ' },
  { value: 'monthly', label: 'ប្រចាំខែ' },
  { value: 'student', label: 'តាមសិស្ស' },
  { value: 'class', label: 'តាមថ្នាក់' },
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
    ]).then(([classList, studentPage]) => {
      setClasses(classList)
      setStudents(studentPage.items)
    }).catch((requestError) => setError(getApiError(requestError)))
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    async function load() {
      if (kind === 'daily') {
        const result = await reportsApi.daily(date, classId ? Number(classId) : undefined)
        return result
      }
      if (kind === 'monthly') {
        const parsed = new Date(`${date}T12:00:00`)
        const result = await reportsApi.monthly(parsed.getFullYear(), parsed.getMonth() + 1, classId ? Number(classId) : undefined)
        const totalSchoolDays = result.daily.reduce((sum, point) => sum + point.total_students, 0)
        const present = result.daily.reduce((sum, point) => sum + point.present, 0)
        const absent = result.daily.reduce((sum, point) => sum + point.absent, 0)
        const late = result.daily.reduce((sum, point) => sum + point.late, 0)
        return {
          total_students: result.daily.at(-1)?.total_students ?? 0,
          present,
          absent,
          late,
          attendance_rate: totalSchoolDays ? Math.round(((present + late) / totalSchoolDays) * 10000) / 100 : 0,
          records: result.records,
        }
      }
      if (kind === 'student') {
        if (!studentId) return null
        const result = await reportsApi.student(Number(studentId), startDate, endDate)
        return summarizeRecords(result.records)
      }
      if (!classId) return null
      const result = await reportsApi.classroom(Number(classId), startDate, endDate)
      return summarizeRecords(result.records)
    }
    load().then((result) => alive && setReport(result))
      .catch((requestError) => alive && setError(getApiError(requestError)))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
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
      attendance_rate: records.length ? Math.round(((present + late) / records.length) * 10000) / 100 : 0,
      records,
    }
  }

  async function download(format: 'pdf' | 'excel') {
    setDownloading(true)
    setError('')
    try {
      const range = kind === 'daily'
        ? { start: date, end: date }
        : kind === 'monthly'
          ? (() => {
              const parsed = new Date(`${date}T12:00:00`)
              const year = parsed.getFullYear()
              const month = parsed.getMonth()
              return { start: `${year}-${String(month + 1).padStart(2, '0')}-01`, end: `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}` }
            })()
          : { start: startDate, end: endDate }
      const file = await reportsApi.export(range.start, range.end, format, classId ? Number(classId) : undefined, kind === 'student' && studentId ? Number(studentId) : undefined)
      const url = URL.createObjectURL(file)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = format === 'pdf' ? 'attendance-report.pdf' : 'attendance-report.xlsx'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (requestError) { setError(getApiError(requestError)) }
    finally { setDownloading(false) }
  }

  return <>
    <PageHeading title="របាយការណ៍" description="សង្ខេបវត្តមាន និងទាញយកឯកសាររបាយការណ៍។" />
    {error && <div className="mb-4"><ErrorMessage>{error}</ErrorMessage></div>}
    <Card className="mb-5 p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">{REPORT_KINDS.map((item) => <button key={item.value} type="button" onClick={() => setKind(item.value)} className={`rounded-md px-3 py-2 text-sm ${kind === item.value ? 'bg-white font-semibold text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{item.label}</button>)}</div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          {(kind === 'daily' || kind === 'monthly') && <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>{kind === 'daily' ? 'កាលបរិច្ឆេទ' : 'ខែដែលត្រូវរាយការណ៍'}</span><input type={kind === 'daily' ? 'date' : 'month'} value={kind === 'daily' ? date : date.slice(0, 7)} onChange={(event) => setDate(kind === 'monthly' ? `${event.target.value}-01` : event.target.value)} className="h-11 min-w-52 rounded-lg border border-slate-300 bg-white px-3" /></label>}
          {(kind === 'student' || kind === 'class') && <><label className="space-y-1.5 text-sm font-medium text-slate-700"><span>{kind === 'student' ? 'សិស្ស' : 'ថ្នាក់'}</span>{kind === 'student' ? <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="h-11 min-w-60 rounded-lg border border-slate-300 bg-white px-3"><option value="">ជ្រើសរើសសិស្ស</option>{students.map((student) => <option key={student.id} value={student.id}>{student.student_code} · {student.last_name} {student.first_name}</option>)}</select> : <select value={classId} onChange={(event) => setClassId(event.target.value)} className="h-11 min-w-48 rounded-lg border border-slate-300 bg-white px-3"><option value="">ជ្រើសរើសថ្នាក់</option>{classes.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.class_name}</option>)}</select>}</label><label className="space-y-1.5 text-sm font-medium text-slate-700"><span>ចាប់ពីថ្ងៃ</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-11 rounded-lg border border-slate-300 bg-white px-3" /></label><label className="space-y-1.5 text-sm font-medium text-slate-700"><span>ដល់ថ្ងៃ</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-11 rounded-lg border border-slate-300 bg-white px-3" /></label></>}
          {(kind === 'daily' || kind === 'monthly') && <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>ថ្នាក់</span><select value={classId} onChange={(event) => setClassId(event.target.value)} className="h-11 min-w-48 rounded-lg border border-slate-300 bg-white px-3"><option value="">គ្រប់ថ្នាក់</option>{classes.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.class_name}</option>)}</select></label>}
        </div>
        <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={downloading || !report} onClick={() => void download('pdf')} icon={<FileText size={17} />}>ទាញយក PDF</Button><Button disabled={downloading || !report} onClick={() => void download('excel')} icon={<FileSpreadsheet size={17} />}>ទាញយក Excel</Button></div>
      </div>
    </Card>
    {loading ? <Loading label="កំពុងបង្កើតរបាយការណ៍…" /> : report && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[
        [kind === 'monthly' ? 'សិស្សសរុប (ថ្ងៃចុងក្រោយ)' : 'សិស្សសរុប', report.total_students, 'bg-slate-50 text-slate-900'],
        ['មានវត្តមាន', report.present, 'bg-emerald-50 text-emerald-900'],
        ['អវត្តមាន', report.absent, 'bg-rose-50 text-rose-900'],
        ['មកយឺត', report.late, 'bg-amber-50 text-amber-900'],
        ['អត្រាវត្តមាន', `${report.attendance_rate}%`, 'bg-sky-50 text-sky-900'],
      ].map(([label, value, color]) => <Card key={String(label)} className={`p-5 ${color}`}><p className="text-sm opacity-75">{label}</p><p className="mt-2 text-2xl font-bold">{Number.isFinite(Number(value)) ? Number(value).toLocaleString('km-KH') : value}</p></Card>)}</div>
      <Card className="mt-5 p-5"><h2 className="mb-4 font-bold text-slate-900">បញ្ជីវត្តមាន</h2><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 text-xs text-slate-500"><tr>{['លេខសម្គាល់', 'ឈ្មោះសិស្ស', 'ថ្នាក់', 'កាលបរិច្ឆេទ', 'ម៉ោងចូល', 'ស្ថានភាព', 'ភាពស្រដៀងមុខ'].map((item) => <th key={item} className="px-3 py-3 font-medium">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{report.records.map((record) => <tr key={`${record.attendance_date}-${record.id}`}><td className="px-3 py-3 text-slate-600">{record.student_code}</td><td className="px-3 py-3 font-semibold text-slate-800">{record.student_name}</td><td className="px-3 py-3 text-slate-600">{record.class_name}</td><td className="px-3 py-3 text-slate-600">{record.attendance_date}</td><td className="px-3 py-3 text-slate-600">{record.check_in_time ?? '—'}</td><td className="px-3 py-3"><StatusBadge status={record.status} label={record.status === 'present' ? 'មានវត្តមាន' : record.status === 'late' ? 'មកយឺត' : 'អវត្តមាន'} /></td><td className="px-3 py-3 text-slate-600">{record.confidence == null ? '—' : `${record.confidence}%`}</td></tr>)}</tbody></table>{report.records.length === 0 && <p className="py-12 text-center text-sm text-slate-500">មិនមានកំណត់ត្រាក្នុងលក្ខខណ្ឌនេះទេ។</p>}</div></Card>
    </>}
  </>
}