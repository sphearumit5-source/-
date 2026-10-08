import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { Loading } from './components/ui/Loading'
import { useAuth } from './hooks/useAuth'

const Attendance = lazy(() => import('./pages/Attendance/Attendance'))
const Classes = lazy(() => import('./pages/Classes/Classes'))
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'))
const FaceAttendance = lazy(() => import('./pages/FaceAttendance/FaceAttendance'))
const FaceRegistration = lazy(() => import('./pages/FaceRegistration/FaceRegistration'))
const Login = lazy(() => import('./pages/Login/Login'))
const Reports = lazy(() => import('./pages/Reports/Reports'))
const Settings = lazy(() => import('./pages/Settings/Settings'))
const AddStudent = lazy(() => import('./pages/Students/AddStudent'))
const EditStudent = lazy(() => import('./pages/Students/EditStudent'))
const Students = lazy(() => import('./pages/Students/Students'))

function RequireAuthentication() {
	const { user, ready } = useAuth()
	if (!ready) return <Loading label="កំពុងផ្ទៀងផ្ទាត់គណនី…" />
	return user ? <Outlet /> : <Navigate to="/login" replace />
}

function RequireAdministrator() {
	const { user } = useAuth()
	return user?.role === 'admin' ? <Outlet /> : <Navigate to="/dashboard" replace />
}

export default function App() {
	return (
		<Suspense fallback={<Loading label="កំពុងបើកទំព័រ…" />}>
			<Routes>
				<Route path="/login" element={<Login />} />
				<Route element={<RequireAuthentication />}>
					<Route element={<MainLayout />}>
						<Route index element={<Navigate to="/dashboard" replace />} />
						<Route path="dashboard" element={<Dashboard />} />
						<Route path="students" element={<Students />} />
						<Route element={<RequireAdministrator />}>
							<Route path="students/add" element={<AddStudent />} />
							<Route path="students/:studentId/edit" element={<EditStudent />} />
							<Route path="classes" element={<Classes />} />
							<Route path="face-registration" element={<FaceRegistration />} />
							<Route path="settings" element={<Settings />} />
						</Route>
						<Route path="face-attendance" element={<FaceAttendance />} />
						<Route path="attendance" element={<Attendance />} />
						<Route path="reports" element={<Reports />} />
					</Route>
				</Route>
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</Suspense>
	)
}
