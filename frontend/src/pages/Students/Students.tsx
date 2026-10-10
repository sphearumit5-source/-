import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StudentPhoto } from '../../components/students/StudentPhoto'
import { Button } from '../../components/ui/Button'
import { Card, PageHeading } from '../../components/ui/Card'
import { ErrorMessage, Loading, StatusBadge } from '../../components/ui/Loading'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../hooks/useAuth'
import { classesApi, getApiError, studentsApi } from '../../services/api'
import type { Classroom, Student } from '../../types'

export default function Students() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState<Student[]>([])
  const [classes, setClasses] = useState<Classroom[]>([])
  const [search, setSearch] = useState('')
  const [classId, setClassId] = useState('')
  const [gender, setGender] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<Student | null>(null)
  const [viewing, setViewing] = useState<Student | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [result, classList] = await Promise.all([
        studentsApi.list({
          search: search || undefined,
          class_id: classId || undefined,
          gender: gender || undefined,
          page,
          page_size: 10,
        }),
        classesApi.list(),
      ])
      setItems(result.items)
      setTotal(result.total)
      setTotalPages(Math.max(result.total_pages, 1))
      setClasses(classList)
      setError('')
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setLoading(false)
    }
  }, [search, classId, gender, page])

  useEffect(() => {
    void load()
  }, [load])

  async function removeStudent() {
    if (!deleting) return
    setBusy(true)
    try {
      await studentsApi.remove(deleting.id)
      setDeleting(null)
      await load()
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="គ្រប់គ្រងសិស្ស"
        description={`បញ្ជីសិស្សសរុបទាំងអស់ចំនួន ${total.toLocaleString('km-KH')} នាក់`}
        action={
          user?.role === 'admin' ? (
            <Button
              onClick={() => navigate('/students/add')}
              icon={<Plus size={18} />}
            >
              បន្ថែមសិស្សថ្មី
            </Button>
          ) : undefined
        }
      />

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <Card className="p-5 sm:p-6">
        {/* Filters and Search Bar */}
        <div className="mb-6 grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="ស្វែងរកតាមឈ្មោះ ឬអត្តលេខសិស្ស…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm transition placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <div className="relative">
            <select
              aria-label="ត្រងតាមថ្នាក់"
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value)
                setPage(1)
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="">-- គ្រប់ថ្នាក់រៀនទាំងអស់ --</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.class_name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              aria-label="ត្រងតាមភេទ"
              value={gender}
              onChange={(event) => {
                setGender(event.target.value)
                setPage(1)
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="">-- គ្រប់ភេទទាំងអស់ --</option>
              <option value="male">ប្រុស</option>
              <option value="female">ស្រី</option>
              <option value="other">ផ្សេងទៀត</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <Loading label="កំពុងទាញយកបញ្ជីសិស្ស…" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/75 text-xs font-semibold text-slate-500">
                <tr>
                  {[
                    'អត្តលេខ',
                    'ឈ្មោះសិស្ស',
                    'ភេទ',
                    'ថ្នាក់រៀន',
                    'លេខទូរស័ព្ទ',
                    'ស្ថានភាព',
                    'សកម្មភាព',
                  ].map((label) => (
                    <th key={label} className="px-4 py-3.5 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((student) => {
                  const fullName = `${student.last_name} ${student.first_name}`
                  return (
                    <tr
                      key={student.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-700">
                        <span className="rounded-md bg-slate-100 px-2 py-1">
                          {student.student_code}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <StudentPhoto
                            studentId={student.id}
                            name={fullName}
                            photo={student.photo}
                          />
                          <div>
                            <p className="font-bold text-slate-900">{fullName}</p>
                            <p className="text-[11px] text-slate-400">
                              {student.email || 'គ្មានអ៊ីមែល'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                        {student.gender === 'male' ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 font-semibold">
                            ប្រុស
                          </span>
                        ) : student.gender === 'female' ? (
                          <span className="rounded-full bg-pink-50 px-2 py-0.5 text-pink-700 font-semibold">
                            ស្រី
                          </span>
                        ) : (
                          'ផ្សេងទៀត'
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        <span className="rounded-lg bg-indigo-50/70 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          {student.class_name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                        {student.phone || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge
                          status={student.status}
                          label={student.status === 'active' ? 'កំពុងសិក្សា' : 'ផ្អាក'}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          {/* View button */}
                          <button
                            type="button"
                            title="មើលព័ត៌មានលម្អិត"
                            aria-label={`មើលព័ត៌មាន ${fullName}`}
                            onClick={() => setViewing(student)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                          >
                            <Eye size={17} />
                          </button>

                          {user?.role === 'admin' && (
                            <>
                              {/* Edit link */}
                              <Link
                                to={`/students/${student.id}/edit`}
                                title="កែប្រែព័ត៌មាន"
                                aria-label={`កែប្រែ ${fullName}`}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition"
                              >
                                <Pencil size={17} />
                              </Link>

                              {/* Face registration shortcut */}
                              <button
                                type="button"
                                title="ចុះឈ្មោះផ្ទៃមុខ AI"
                                aria-label={`ចុះឈ្មោះមុខ ${fullName}`}
                                onClick={() =>
                                  navigate(`/face-registration?studentId=${student.id}`)
                                }
                                className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition"
                              >
                                <Camera size={17} />
                              </button>

                              {/* Delete button */}
                              <button
                                type="button"
                                title="លុបសិស្ស"
                                aria-label={`លុប ${fullName}`}
                                onClick={() => setDeleting(student)}
                                className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                              >
                                <Trash2 size={17} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {items.length === 0 && (
              <div className="py-14 text-center">
                <Users size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">
                  មិនមានសិស្សត្រូវនឹងការស្វែងរកនេះទេ។
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pagination Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
          <span>
            ទំព័រទី <strong>{page.toLocaleString('km-KH')}</strong> នៃ{' '}
            <strong>{totalPages.toLocaleString('km-KH')}</strong> (សរុប {total.toLocaleString('km-KH')} នាក់)
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              icon={<ChevronLeft size={16} />}
            >
              ទំព័រមុន
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              icon={<ChevronRight size={16} />}
            >
              បន្ទាប់
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleting)}
        title="បញ្ជាក់ការលុបសិស្ស"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              បោះបង់
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => void removeStudent()}
            >
              {busy ? 'កំពុងលុប…' : 'លុបសិស្សចេញ'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          តើអ្នកពិតជាចង់លុបសិស្សឈ្មោះ{' '}
          <strong>
            {deleting?.last_name} {deleting?.first_name}
          </strong>{' '}
          (អត្តលេខ៖ {deleting?.student_code}) ចេញពីប្រព័ន្ធមែនទេ?
        </p>
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
          ចំណាំ៖ ប្រសិនបើសិស្សនេះមានប្រវត្តិវត្តមានរួចហើយ ប្រព័ន្ធនឹងមិនអនុញ្ញាតឱ្យលុបឡើយ។
        </p>
      </Modal>

      {/* View Student Profile Modal */}
      <Modal
        open={Boolean(viewing)}
        title="ព័ត៌មានលម្អិតរបស់សិស្ស"
        onClose={() => setViewing(null)}
        footer={
          <div className="flex gap-2">
            {user?.role === 'admin' && viewing && (
              <Button
                variant="primary"
                onClick={() => {
                  const id = viewing.id
                  setViewing(null)
                  navigate(`/face-registration?studentId=${id}`)
                }}
                icon={<Camera size={16} />}
              >
                ចុះឈ្មោះមុខ AI
              </Button>
            )}
            <Button variant="secondary" onClick={() => setViewing(null)}>
              បិទ
            </Button>
          </div>
        }
      >
        {viewing && (
          <div className="space-y-5">
            {/* Header Profile */}
            <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 p-4 border border-slate-100">
              <StudentPhoto
                studentId={viewing.id}
                name={`${viewing.last_name} ${viewing.first_name}`}
                photo={viewing.photo}
                size="size-18"
              />
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {viewing.last_name} {viewing.first_name}
                </h3>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {viewing.student_code}
                  </span>
                  <StatusBadge
                    status={viewing.status}
                    label={viewing.status === 'active' ? 'កំពុងសិក្សា' : 'ផ្អាក'}
                  />
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                <span className="text-slate-400 font-medium">ថ្នាក់រៀន</span>
                <p className="mt-1 text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <GraduationCap size={15} className="text-indigo-600" />
                  {viewing.class_name}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                <span className="text-slate-400 font-medium">ភេទ</span>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  {viewing.gender === 'male' ? 'ប្រុស' : viewing.gender === 'female' ? 'ស្រី' : 'ផ្សេងទៀត'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                <span className="text-slate-400 font-medium">ថ្ងៃខែឆ្នាំកំណើត</span>
                <p className="mt-1 text-sm font-bold text-slate-800 font-mono">
                  {viewing.date_of_birth ?? 'មិនបានបញ្ចូល'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                <span className="text-slate-400 font-medium">លេខទូរស័ព្ទ</span>
                <p className="mt-1 text-sm font-bold text-slate-800 flex items-center gap-1.5 font-mono">
                  <Phone size={14} className="text-emerald-600" />
                  {viewing.phone ?? 'មិនបានបញ្ចូល'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50 sm:col-span-2">
                <span className="text-slate-400 font-medium">អ៊ីមែល</span>
                <p className="mt-1 text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Mail size={14} className="text-sky-600" />
                  {viewing.email ?? 'មិនបានបញ្ចូល'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50 sm:col-span-2">
                <span className="text-slate-400 font-medium">អាសយដ្ឋាន</span>
                <p className="mt-1 text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin size={14} className="text-rose-500" />
                  {viewing.address ?? 'មិនបានបញ្ចូល'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}