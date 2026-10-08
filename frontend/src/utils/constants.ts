import {
  CalendarDays,
  ClipboardList,
  FileChartColumnIncreasing,
  GraduationCap,
  ScanFace,
  Settings,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

export const NAV_ITEMS: Array<{ label: string; path: string; icon: LucideIcon; adminOnly?: boolean }> = [
  { label: 'ផ្ទាំងគ្រប់គ្រង', path: '/dashboard', icon: FileChartColumnIncreasing },
  { label: 'គ្រប់គ្រងសិស្ស', path: '/students', icon: UsersRound },
  { label: 'គ្រប់គ្រងថ្នាក់', path: '/classes', icon: GraduationCap, adminOnly: true },
  { label: 'ចុះឈ្មោះមុខ', path: '/face-registration', icon: ScanFace, adminOnly: true },
  { label: 'ស្កេនវត្តមាន', path: '/face-attendance', icon: ScanFace },
  { label: 'គ្រប់គ្រងវត្តមាន', path: '/attendance', icon: ClipboardList },
  { label: 'របាយការណ៍', path: '/reports', icon: CalendarDays },
  { label: 'ការកំណត់', path: '/settings', icon: Settings, adminOnly: true },
]

export const ATTENDANCE_LABELS = {
  present: 'មានវត្តមាន',
  absent: 'អវត្តមាន',
  late: 'មកយឺត',
} as const

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'