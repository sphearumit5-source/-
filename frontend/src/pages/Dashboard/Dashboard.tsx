import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ScanFace,
  Sparkles,
  TrendingUp,
  UserPlus,
  UsersRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { StudentPhoto } from '../../components/students/StudentPhoto'
import { Card } from '../../components/ui/Card'
import { ErrorMessage, Loading, StatusBadge } from '../../components/ui/Loading'
import { useAuth } from '../../hooks/useAuth'
import { attendanceApi, getApiError } from '../../services/api'
import type { DashboardChart, DashboardStats, RecentAttendance } from '../../types'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<RecentAttendance[]>([])
  const [chart, setChart] = useState<DashboardChart | null>(null)
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([
      attendanceApi.dashboardStats(),
      attendanceApi.recent(),
      attendanceApi.chart(period),
    ])
      .then(([nextStats, nextRecent, nextChart]) => {
        if (!alive) return
        setStats(nextStats)
        setRecent(nextRecent)
        setChart(nextChart)
        setError('')
      })
      .catch((requestError) => alive && setError(getApiError(requestError)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [period])

  const totalStudents = stats?.total_students ?? 0
  const presentPct = totalStudents > 0 ? Math.round(((stats?.present_today ?? 0) / totalStudents) * 100) : 0
  const absentPct = totalStudents > 0 ? Math.round(((stats?.absent_today ?? 0) / totalStudents) * 100) : 0
  const latePct = totalStudents > 0 ? Math.round(((stats?.late_today ?? 0) / totalStudents) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Welcome Banner Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 p-6 text-white shadow-lg shadow-indigo-600/15 sm:p-8">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-indigo-100 backdrop-blur-sm">
              <Sparkles size={13} className="text-amber-300" />
              <span>ប្រព័ន្ធគ្រប់គ្រងសិស្ស និងវត្តមាន AI</span>
            </div>
            <h1 className="mt-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
              សួស្តី, {user?.full_name ?? 'អ្នកគ្រប់គ្រង'}! 👋
            </h1>
            <p className="mt-1 max-w-xl text-sm text-indigo-100/90 leading-relaxed">
              ប្រព័ន្ធបានកត់ត្រាវត្តមានសិស្សដោយស្វ័យប្រវត្តិតាមការស្គាល់មុខ។ ពិនិត្យមើលស្ថិតិវត្តមាន និងព័ត៌មានជាក់ស្តែងខាងក្រោម។
            </p>
          </div>

          {/* Quick Actions in Banner */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/face-attendance"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-indigo-700 shadow-md transition-all duration-200 hover:bg-indigo-50 hover:shadow-lg active:scale-95"
            >
              <ScanFace size={16} />
              <span>ស្កេនវត្តមាន (AI)</span>
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/students/add"
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-3.5 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/30 active:scale-95"
              >
                <UserPlus size={16} />
                <span>បន្ថែមសិស្ស</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {loading && <Loading label="កំពុងទាញយកទិន្នន័យ…" />}
      {error && <ErrorMessage>{error}</ErrorMessage>}

      {!loading && stats && (
        <>
          {/* KPI Stat Cards Grid */}
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* 1. Total Students */}
            <Card className="card-interactive p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">សិស្សសរុប</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">
                    {stats.total_students.toLocaleString('km-KH')}
                  </p>
                </div>
                <span className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600 shadow-2xs">
                  <UsersRound size={22} />
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium text-indigo-600">
                  <TrendingUp size={14} /> ទិន្នន័យក្នុងប្រព័ន្ធ
                </span>
                <span className="text-[11px]">១០០%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-600" style={{ width: '100%' }} />
              </div>
            </Card>

            {/* 2. Present Today */}
            <Card className="card-interactive p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">មានវត្តមានថ្ងៃនេះ</p>
                  <p className="mt-2 text-3xl font-extrabold text-emerald-600 tracking-tight">
                    {stats.present_today.toLocaleString('km-KH')}
                  </p>
                </div>
                <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 shadow-2xs">
                  <CheckCircle2 size={22} />
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-emerald-600">វត្តមានទាន់ពេល</span>
                <span className="font-bold text-slate-700">{presentPct}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${presentPct}%` }}
                />
              </div>
            </Card>

            {/* 3. Late Today */}
            <Card className="card-interactive p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">មកយឺតថ្ងៃនេះ</p>
                  <p className="mt-2 text-3xl font-extrabold text-amber-600 tracking-tight">
                    {stats.late_today.toLocaleString('km-KH')}
                  </p>
                </div>
                <span className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-600 shadow-2xs">
                  <Clock3 size={22} />
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-amber-600">មកក្រោយម៉ោងកំណត់</span>
                <span className="font-bold text-slate-700">{latePct}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${latePct}%` }}
                />
              </div>
            </Card>

            {/* 4. Absent Today */}
            <Card className="card-interactive p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">អវត្តមានថ្ងៃនេះ</p>
                  <p className="mt-2 text-3xl font-extrabold text-rose-600 tracking-tight">
                    {stats.absent_today.toLocaleString('km-KH')}
                  </p>
                </div>
                <span className="grid size-11 place-items-center rounded-xl bg-rose-50 text-rose-600 shadow-2xs">
                  <AlertTriangle size={22} />
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-rose-600">ខកខានវត្តមាន</span>
                <span className="font-bold text-slate-700">{absentPct}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${absentPct}%` }}
                />
              </div>
            </Card>
          </div>

          {/* Charts & Circular Rate Grid */}
          <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
            {/* Bar Chart Card */}
            <Card className="p-5 sm:p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                      ស្ថិតិនិន្នាការវត្តមាន
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      របាយការណ៍
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    ចំនួនសិស្សមានវត្តមាន មកយឺត និងអវត្តមាន
                  </p>
                </div>

                <div className="flex rounded-xl border border-slate-200/80 bg-slate-100/70 p-1">
                  <button
                    onClick={() => setPeriod('week')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      period === 'week'
                        ? 'bg-white font-bold text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    សប្ដាហ៍
                  </button>
                  <button
                    onClick={() => setPeriod('month')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      period === 'month'
                        ? 'bg-white font-bold text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ខែ
                  </button>
                </div>
              </div>

              <div className="h-72 w-full">
                {chart && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chart.points}
                      margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '12px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                        }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar
                        dataKey="present"
                        name="មានវត្តមាន"
                        fill="#4f46e5"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="late"
                        name="មកយឺត"
                        fill="#f59e0b"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="absent"
                        name="អវត្តមាន"
                        fill="#ef4444"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* Attendance Rate Circular Gauge Card */}
            <Card className="flex flex-col justify-between p-5 sm:p-6">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                      អត្រាវត្តមានសរុប
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">គិតបញ្ចូលវត្តមាន និងមកយឺត</p>
                  </div>
                  <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Activity size={20} />
                  </span>
                </div>

                {/* Circular Meter */}
                <div className="my-8 flex justify-center">
                  <div
                    className="relative grid size-46 animate-ring place-items-center rounded-full p-3 shadow-inner"
                    style={{
                      background: `conic-gradient(#10b981 ${stats.attendance_rate}%, #f1f5f9 0)`,
                    }}
                  >
                    <div className="grid size-36 place-items-center rounded-full bg-white shadow-md">
                      <div className="text-center">
                        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                          {stats.attendance_rate.toLocaleString('km-KH')}%
                        </span>
                        <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">
                          វត្តមានថ្ងៃនេះ
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend Metrics */}
              <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-[11px] text-slate-500">វត្តមាន</p>
                  <p className="mt-0.5 text-sm font-bold text-emerald-600">
                    {stats.present_today}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-[11px] text-slate-500">មកយឺត</p>
                  <p className="mt-0.5 text-sm font-bold text-amber-600">
                    {stats.late_today}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-[11px] text-slate-500">អវត្តមាន</p>
                  <p className="mt-0.5 text-sm font-bold text-rose-600">
                    {stats.absent_today}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Attendance Feed Card */}
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                    កំណត់ត្រាវត្តមានថ្មីៗ
                  </h2>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ទិន្នន័យជាក់ស្តែង
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  សិស្សដែលបានកត់ត្រាវត្តមានចុងក្រោយតាមប្រព័ន្ធ
                </p>
              </div>

              <Link
                to="/attendance"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 transition hover:text-indigo-700"
              >
                <span>មើលកំណត់ត្រាទាំងអស់</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold text-slate-500">
                  <tr>
                    {['ឈ្មោះសិស្ស', 'ថ្នាក់', 'ម៉ោងកត់ត្រា', 'ស្ថានភាព', 'ភាពស្រដៀងមុខ AI'].map(
                      (item) => (
                        <th key={item} className="px-4 py-3 font-semibold">
                          {item}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/90">
                  {recent.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors duration-150 hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <StudentPhoto
                            studentId={item.student_id}
                            name={item.student_name}
                            photo={item.photo}
                          />
                          <div>
                            <p className="font-bold text-slate-900">{item.student_name}</p>
                            <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-600">
                              {item.student_code}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium">
                        <span className="rounded-lg bg-indigo-50/60 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          {item.class_name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium">
                        {item.check_in_time ?? '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge
                          status={item.status}
                          label={item.status === 'late' ? 'មកយឺត' : 'មានវត្តមាន'}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        {item.confidence == null ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${
                                  item.confidence >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, item.confidence)}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-700">
                              {item.confidence}%
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {recent.length === 0 && (
                <div className="py-12 text-center text-sm text-slate-400">
                  មិនទាន់មានកំណត់ត្រាវត្តមានសម្រាប់ថ្ងៃនេះនៅឡើយទេ។
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}