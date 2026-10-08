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
    studentsApi.get(Number(studentId)).then(setStudent).catch((requestError) => setError(getApiError(requestError))).
      finally(() => {})
  }, [studentId])
  if (error) return <ErrorMessage>{error}</ErrorMessage>
  if (!student) return <Loading label="កំពុងទាញយកព័ត៌មានសិស្ស…" />
  return <><PageHeading title="កែប្រែព័ត៌មានសិស្ស" action={<Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600" to="/students"><ArrowLeft size={16} />ត្រឡប់ទៅបញ្ជី</Link>} /><Card className="max-w-4xl p-5 sm:p-7"><StudentForm student={student} /></Card></>
}