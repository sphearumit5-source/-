export type UserRole = 'admin' | 'teacher'
export type AttendanceStatus = 'present' | 'absent' | 'late'

export interface User {
  id: number
  username: string
  full_name: string
  role: UserRole
}

export interface AuthToken {
  access_token: string
  token_type: 'bearer'
  expires_in: number
  user: User
}

export interface Student {
  id: number
  student_code: string
  first_name: string
  last_name: string
  gender: 'male' | 'female' | 'other'
  date_of_birth: string | null
  phone: string | null
  email: string | null
  address: string | null
  photo: string | null
  class_id: number
  class_name: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface StudentInput {
  student_code: string
  first_name: string
  last_name: string
  gender: Student['gender']
  date_of_birth: string | null
  phone: string | null
  email: string | null
  address: string | null
  class_id: number
  status: Student['status']
}

export interface StudentPage {
  items: Student[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface Classroom {
  id: number
  class_name: string
  grade: number
  section: string
  academic_year: string
  student_count: number
  created_at: string
}

export interface AttendanceRecord {
  id: number
  student_id: number
  student_code: string
  student_name: string
  class_name: string
  attendance_date: string
  check_in_time: string | null
  check_out_time: string | null
  status: AttendanceStatus
  confidence: number | null
  created_at: string
}

export interface AttendancePage {
  items: AttendanceRecord[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface DashboardStats {
  total_students: number
  present_today: number
  absent_today: number
  late_today: number
  attendance_rate: number
}

export interface RecentAttendance {
  id: number
  student_id: number
  student_code: string
  student_name: string
  photo: string | null
  class_name: string
  check_in_time: string | null
  status: AttendanceStatus
  confidence: number | null
}

export interface ChartPoint {
  label: string
  present: number
  absent: number
  late: number
}

export interface DashboardChart {
  period: 'week' | 'month'
  points: ChartPoint[]
  generated_for: string
}

export interface SchoolSettings {
  school_name: string
  logo_path: string | null
  school_start_time: string
  late_after_time: string
  school_days_per_week: number
}

export interface ReportSummary {
  total_students: number
  present: number
  absent: number
  late: number
  attendance_rate: number
  records: ReportRow[]
}

export interface ReportRow {
  id: number
  student_id: number
  student_code: string
  student_name: string
  class_name: string
  attendance_date: string
  check_in_time: string | null
  check_out_time: string | null
  status: AttendanceStatus
  confidence: number | null
}