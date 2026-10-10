import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StudentForm } from '../../components/students/StudentForm'
import { Card, PageHeading } from '../../components/ui/Card'

export default function AddStudent() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="បន្ថែមសិស្សថ្មី"
        description="បញ្ចូលព័ត៌មានលម្អិតរបស់សិស្សទៅក្នុងប្រព័ន្ធគ្រប់គ្រងសាលា"
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
        <StudentForm />
      </Card>
    </div>
  )
}