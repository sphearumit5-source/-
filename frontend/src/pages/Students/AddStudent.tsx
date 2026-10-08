import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, PageHeading } from '../../components/ui/Card'
import { StudentForm } from '../../components/students/StudentForm'

export default function AddStudent() {
  return <><PageHeading title="បន្ថែមសិស្ស" action={<Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600" to="/students"><ArrowLeft size={16} />ត្រឡប់ទៅបញ្ជី</Link>} /><Card className="max-w-4xl p-5 sm:p-7"><StudentForm /></Card></>
}