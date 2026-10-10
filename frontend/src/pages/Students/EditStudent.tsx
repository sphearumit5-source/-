import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StudentForm } from '../../components/students/StudentForm'
import { Card, PageHeading } from '../../components/ui/Card'
import { ErrorMessage, Loading } from '../../components/ui/Loading'
import { getApiError, studentsApi } from '../../services/api'
import type { Student } from '../../types'

export default function EditStudent() {
  const { studentId } = useParams()
  const [student, setStudent] = useState<Student | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!studentId) return
    studentsApi
      .get(Number(studentId))
      .then(setStudent)
      .catch((requestError) => setError(getApiError(requestError)))
  }, [studentId])

  if (error) return <ErrorMessage>{error}</ErrorMessage>
  if (!student) return <Loading label="កំពុងទាញយកព័ត៌មានសិស្ស…" />

  return (
    <div className="space-y-6">
      <PageHeading
        title="កែប្រែព័ត៌មានសិស្ស"
        description={`កែប្រែព័ត៌មានរបស់សិស្ស៖ ${student.last_name} ${student.first_name}`}
        action={
          <Link
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900 active:scale-95"
            to="/students"
          >
            <ArrowLeft size={15} />
            <span>ត្រឡប់ទៅបញ្ជីសិស្ស</span>
          </Link>
        }
      />
      <Card className="max-w-4xl p-6 sm:p-8">
        <StudentForm student={student} />
      </Card>
    </div>
  )
}