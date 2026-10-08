import { Activity, AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, PageHeading } from '../../components/ui/Card'
import { ErrorMessage, Loading, StatusBadge } from '../../components/ui/Loading'
import { StudentPhoto } from '../../components/students/StudentPhoto'
import { attendanceApi, getApiError } from '../../services/api'
import type { DashboardChart, DashboardStats, RecentAttendance } from '../../types'

const statCards = [
  { key: 'total_students', label: 'សិស្សសរុប', icon: UsersRound, color: 'text-slate-700', bg: 'bg-slate-100' },
  { key: 'present_today', label: 'មានវត្តមានថ្ងៃនេះ', icon: CheckCircle2, color: 'text-emerald-800', bg: 'bg-emerald-50' },
  { key: 'absent_today', label: 'អវត្តមានថ្ងៃនេះ', icon: AlertTriangle, color: 'text-rose-700', bg: 'bg-rose-50' },
  { key: 'late_today', label: 'មកយឺតថ្ងៃនេះ', icon: Clock3, color: 'text-amber-800', bg: 'bg-amber-50' },
] as const

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<RecentAttendance[]>([])
  const [chart, setChart] = useState<DashboardChart | null>(null)
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([attendanceApi.dashboardStats(), attendanceApi.recent(), attendanceApi.chart(period)])
      .then(([nextStats, nextRecent, nextChart]) => {
        if (!alive) return
        setStats(nextStats)
        setRecent(nextRecent)
        setChart(nextChart)
        setError('')
      })
      .catch((requestError) => alive && setError(getApiError(requestError)))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [period])

  return (
    <div>
      <PageHeading title="ផ្ទាំងគ្រប់គ្រង" description={new Date().toLocaleDateString('km-KH', { dateStyle: 'full' })} />
      {loading && <Loading label="កំពុងទាញយកទិន្នន័យ…" />}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {!loading && stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map(({ key, label, icon: Icon, color, bg }) => (
              <Card key={key} className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{stats[key].toLocaleString('km-KH')}</p></div><span className={`grid size-10 place-items-center rounded-lg ${bg} ${color}`}><Icon size={20} /></span></div><div className="mt-4 flex items-center gap-1 text-xs text-slate-500"><ArrowUpRight size={14} />សង្ខេបតាមទិន្នន័យវត្តមាន</div></Card>
            ))}
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <Card className="p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">ស្ថិតិវត្តមាន</h2><p className="mt-1 text-xs text-slate-500">អត្រាវត្តមានថ្ងៃនេះ {stats.attendance_rate.toLocaleString('km-KH')}%</p></div><div className="flex rounded-lg bg-slate-100 p-1"><button onClick={() => setPeriod('week')} className={`rounded-md px-3 py-1.5 text-xs ${period === 'week' ? 'bg-white font-semibold shadow-sm' : 'text-slate-600'}`}>សប្ដាហ៍</button><button onClick={() => setPeriod('month')} className={`rounded-md px-3 py-1.5 text-xs ${period === 'month' ? 'bg-white font-semibold shadow-sm' : 'text-slate-600'}`}>ខែ</button></div></div>
              <div className="h-64 w-full">
                {chart && <ResponsiveContainer width="100%" height="100%"><BarChart data={chart.points} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} /><Tooltip /><Bar dataKey="present" name="មានវត្តមាន" fill="#14836b" radius={[4, 4, 0, 0]} /><Bar dataKey="late" name="មកយឺត" fill="#d99a25" radius={[4, 4, 0, 0]} /><Bar dataKey="absent" name="អវត្តមាន" fill="#d45b63" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>}
              </div>
            </Card>
            <Card className="p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">អត្រាវត្តមាន</h2><p className="mt-1 text-xs text-slate-500">សិស្សមានវត្តមាន និងមកយឺត</p></div><Activity className="text-emerald-800" size={20} /></div><div className="mt-8 grid place-items-center"><div className="grid size-44 place-items-center rounded-full" style={{ background: `conic-gradient(#16816a ${stats.attendance_rate}%, #e2e8f0 0)` }}><div className="grid size-36 place-items-center rounded-full bg-white"><span className="text-3xl font-bold text-slate-900">{stats.attendance_rate.toLocaleString('km-KH')}%</span></div></div></div><div className="mt-7 flex justify-center gap-5 text-xs text-slate-600"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-emerald-700" />មានវត្តមាន</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-slate-300" />អវត្តមាន</span></div></Card>
          </div>
          <Card className="mt-5 p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">វត្តមានថ្មីៗ</h2><p className="mt-1 text-xs text-slate-500">កំណត់ត្រាចុងក្រោយពីប្រព័ន្ធ</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-slate-200 text-xs text-slate-500"><tr>{['ឈ្មោះសិស្ស', 'ថ្នាក់', 'ម៉ោង', 'ស្ថានភាព', 'ភាពស្រដៀងមុខ'].map((item) => <th key={item} className="px-3 py-3 font-medium">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{recent.map((item) => <tr key={item.id}><td className="px-3 py-3"><div className="flex items-center gap-3"><StudentPhoto studentId={item.student_id} name={item.student_name} photo={item.photo} /><div><p className="font-semibold text-slate-800">{item.student_name}</p><p className="text-xs text-slate-500">{item.student_code}</p></div></div></td><td className="px-3 py-3 text-slate-600">{item.class_name}</td><td className="px-3 py-3 text-slate-600">{item.check_in_time ?? '—'}</td><td className="px-3 py-3"><StatusBadge status={item.status} label={item.status === 'late' ? 'មកយឺត' : 'មានវត្តមាន'} /></td><td className="px-3 py-3 text-slate-600">{item.confidence == null ? '—' : `${item.confidence}%`}</td></tr>)}</tbody></table>{recent.length === 0 && <p className="py-10 text-center text-sm text-slate-500">មិនទាន់មានកំណត់ត្រាវត្តមានទេ។</p>}</div></Card>
        </>
      )}
    </div>
  )
}