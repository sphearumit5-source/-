import axios from 'axios'
import type {
  AttendanceRecord,
  AttendancePage,
  AuthToken,
  Classroom,
  DashboardChart,
  DashboardStats,
  RecentAttendance,
  ReportSummary,
  ReportRow,
  SchoolSettings,
  Student,
  StudentInput,
  StudentPage,
  User,
} from '../types'
import { API_URL } from '../utils/constants'

export const api = axios.create({ baseURL: API_URL, timeout: 20_000 })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('attendance-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem('attendance-token')
      localStorage.removeItem('attendance-user')
      if (window.location.pathname !== '/login') window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)

export const authApi = {
  async login(username: string, password: string) {
    const { data } = await api.post<AuthToken>('/api/auth/login', { username, password })
    return data
  },
  async me() {
    const { data } = await api.get<User>('/api/auth/me')
    return data
  },
}

export const studentsApi = {
  async list(params: Record<string, string | number | undefined>) {
    const { data } = await api.get<StudentPage>('/api/students', { params })
    return data
  },
  async get(id: number) {
    const { data } = await api.get<Student>(`/api/students/${id}`)
    return data
  },
  async create(payload: StudentInput) {
    const { data } = await api.post<Student>('/api/students', payload)
    return data
  },
  async update(id: number, payload: Partial<StudentInput>) {
    const { data } = await api.put<Student>(`/api/students/${id}`, payload)
    return data
  },
  async remove(id: number) {
    await api.delete(`/api/students/${id}`)
  },
  async uploadPhoto(id: number, file: File) {
    const form = new FormData()
    form.append('image', file)
    const { data } = await api.post<Student>(`/api/students/${id}/photo`, form)
    return data
  },
  async photo(id: number) {
    const { data } = await api.get<Blob>(`/api/students/${id}/photo`, { responseType: 'blob' })
    return URL.createObjectURL(data)
  },
}

export const classesApi = {
  async list(search?: string) {
    const { data } = await api.get<Classroom[]>('/api/classes', { params: { search } })
    return data
  },
  async create(payload: Pick<Classroom, 'class_name' | 'grade' | 'section' | 'academic_year'>) {
    const { data } = await api.post<Classroom>('/api/classes', payload)
    return data
  },
  async update(id: number, payload: Partial<Classroom>) {
    const { data } = await api.put<Classroom>(`/api/classes/${id}`, payload)
    return data
  },
  async remove(id: number) {
    await api.delete(`/api/classes/${id}`)
  },
}

export const attendanceApi = {
  async list(params: Record<string, string | number | undefined>) {
    const { data } = await api.get<AttendancePage>('/api/attendance', { params })
    return data
  },
  async create(payload: { student_id: number; attendance_date: string; status: 'present' | 'absent' | 'late'; check_in_time?: string | null }) {
    const { data } = await api.post<AttendanceRecord>('/api/attendance', payload)
    return data
  },
  async update(id: number, payload: { status?: 'present' | 'absent' | 'late'; check_in_time?: string | null; check_out_time?: string | null }) {
    const { data } = await api.put<AttendanceRecord>(`/api/attendance/${id}`, payload)
    return data
  },
  async remove(id: number) {
    await api.delete(`/api/attendance/${id}`)
  },
  async dashboardStats() {
    const { data } = await api.get<DashboardStats>('/api/dashboard/stats')
    return data
  },
  async recent() {
    const { data } = await api.get<RecentAttendance[]>('/api/dashboard/recent')
    return data
  },
  async chart(period: 'week' | 'month') {
    const { data } = await api.get<DashboardChart>('/api/dashboard/chart', { params: { period } })
    return data
  },
  async detectFace(image: Blob) {
    const form = new FormData()
    form.append('image', image, 'detect-capture.jpg')
    const { data } = await api.post('/api/face/detect', form)
    return data as { face_count: number; ready: boolean; centered: boolean; guidance: string }
  },
  async registerFace(studentId: number, image: Blob) {
    const form = new FormData()
    form.append('student_id', String(studentId))
    form.append('image', image, 'face-capture.jpg')
    const { data } = await api.post('/api/face/register', form)
    return data as { message: string; student_id: number }
  },
  async recognize(image: Blob) {
    const form = new FormData()
    form.append('image', image, 'attendance-capture.jpg')
    const { data } = await api.post('/api/face/recognize', form)
    return data as {
      message: string
      student_id: number
      student_code: string
      student_name: string
      class_name: string
      check_in_time: string
      status: 'present' | 'late'
      similarity: number
    }
  },
}

export const reportsApi = {
  async daily(date: string, class_id?: number) {
    const { data } = await api.get<ReportSummary>('/api/reports/daily', { params: { date, class_id } })
    return data
  },
  async monthly(year: number, month: number, class_id?: number) {
    const { data } = await api.get<{ year: number; month: number; records: ReportRow[]; daily: Array<{ date: string } & Omit<ReportSummary, 'records'>> }>('/api/reports/monthly', { params: { year, month, class_id } })
    return data
  },
  async student(student_id: number, start_date: string, end_date: string) {
    const { data } = await api.get<{ student_id: number; records: ReportRow[] }>('/api/reports/student', { params: { student_id, start_date, end_date } })
    return data
  },
  async classroom(class_id: number, start_date: string, end_date: string) {
    const { data } = await api.get<{ class_id: number; records: ReportRow[] }>('/api/reports/class', { params: { class_id, start_date, end_date } })
    return data
  },
  async export(start_date: string, end_date: string, format: 'pdf' | 'excel', class_id?: number, student_id?: number) {
    const { data } = await api.get<Blob>('/api/reports/export', {
      params: { start_date, end_date, format, class_id, student_id },
      responseType: 'blob',
    })
    return data
  },
}

export const settingsApi = {
  async get() {
    const { data } = await api.get<SchoolSettings>('/api/settings')
    return data
  },
  async update(payload: SchoolSettings) {
    const { data } = await api.put<SchoolSettings>('/api/settings', payload)
    return data
  },
  async uploadLogo(file: File) {
    const form = new FormData()
    form.append('image', file)
    const { data } = await api.post<SchoolSettings>('/api/settings/logo', form)
    return data
  },
}

export const usersApi = {
  async list() {
    const { data } = await api.get<User[]>('/api/users')
    return data
  },
  async create(payload: { username: string; full_name: string; password: string; role: User['role'] }) {
    const { data } = await api.post<User>('/api/users', payload)
    return data
  },
  async update(id: number, payload: { full_name?: string; password?: string; role?: User['role'] }) {
    const { data } = await api.put<User>(`/api/users/${id}`, payload)
    return data
  },
  async remove(id: number) {
    await api.delete(`/api/users/${id}`)
  },
}

export function getApiError(error: unknown, fallback = 'មានបញ្ហាក្នុងការភ្ជាប់ប្រព័ន្ធ។') {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (!error.response) return 'មិនអាចភ្ជាប់ទៅម៉ាស៊ីនមេបានទេ។ សូមពិនិត្យ Backend។'
  }
  return fallback
}