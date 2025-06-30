// src/components/BackButton.tsx
'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

interface BackButtonProps {
  label?: string
  className?: string
}

export default function BackButton({ 
  label = 'Indietro', 
  className = '' 
}: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    router.back()
  }

  return (
    <button
      onClick={handleBack}
      className={`
        inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm 
        leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        transition-colors ${className}
      `}
    >
      <ArrowLeftIcon className="h-4 w-4 mr-2" />
      {label}
    </button>
  )
}