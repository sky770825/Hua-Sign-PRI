'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.push('/checkin')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <LoadingSpinner label="載入中..." size="md" className="text-center" />
    </div>
  )
}

