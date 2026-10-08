import { useEffect, useState } from 'react'
import { studentsApi } from '../../services/api'

export function StudentPhoto({ studentId, name, photo, size = 'size-10' }: { studentId: number; name: string; photo: string | null; size?: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!photo) return
    let alive = true
    let objectUrl = ''
    studentsApi.photo(studentId).then((result) => {
      objectUrl = result
      if (alive) setUrl(result)
      else URL.revokeObjectURL(result)
    }).catch(() => setUrl(''))
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photo, studentId])

  return url
    ? <img src={url} alt={`រូបថត ${name}`} className={`${size} rounded-full object-cover`} />
    : <span aria-hidden="true" className={`grid ${size} shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-blue-900`}>{name.slice(0, 1)}</span>
}