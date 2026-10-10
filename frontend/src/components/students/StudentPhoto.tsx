import { useEffect, useState } from 'react'
import { studentsApi } from '../../services/api'

// Deterministic gradient generator based on name
function getAvatarGradient(name: string) {
  const gradients = [
    'from-indigo-500 to-blue-600',
    'from-purple-500 to-indigo-600',
    'from-sky-500 to-indigo-600',
    'from-teal-500 to-emerald-600',
    'from-amber-500 to-rose-600',
    'from-rose-500 to-pink-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % gradients.length
  return gradients[index]
}

export function StudentPhoto({
  studentId,
  name,
  photo,
  size = 'size-10',
}: {
  studentId: number
  name: string
  photo: string | null
  size?: string
}) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!photo) return
    let alive = true
    let objectUrl = ''
    studentsApi
      .photo(studentId)
      .then((result) => {
        objectUrl = result
        if (alive) setUrl(result)
        else URL.revokeObjectURL(result)
      })
      .catch(() => setUrl(''))
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photo, studentId])

  const initial = (name.trim().charAt(0) || '?').toUpperCase()
  const gradient = getAvatarGradient(name)

  return url ? (
    <img
      src={url}
      alt={`រូបថត ${name}`}
      className={`${size} shrink-0 rounded-full object-cover ring-2 ring-slate-200/80 shadow-2xs`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`grid ${size} shrink-0 place-items-center rounded-full bg-gradient-to-tr ${gradient} text-xs font-extrabold text-white shadow-2xs ring-2 ring-white`}
    >
      {initial}
    </span>
  )
}