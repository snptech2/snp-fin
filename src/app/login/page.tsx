// src/app/login/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import MatrixEffect from '@/components/effects/MatrixEffect'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { login, user } = useAuth()
  const router = useRouter()

  // Redirect se già loggato
  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const result = await login(email, password)
    
    if (result.success) {
      router.push('/')
    } else {
      setError(result.error || 'Errore nel login')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#000000' }}>
      <MatrixEffect />
      <div className="max-w-md w-full space-y-8 p-8 card-adaptive rounded-lg relative z-10 backdrop-blur-sm shadow-2xl" 
           style={{ 
             boxShadow: '0 0 40px rgba(0, 255, 0, 0.3), 0 0 80px rgba(0, 255, 0, 0.15), inset 0 0 20px rgba(0, 255, 0, 0.05)',
             border: '1px solid rgba(0, 255, 0, 0.2)'
           }}>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-adaptive-900">
            <span className="inline-block">SNP</span>
            <span className="inline-block ml-2 text-green-500 animate-pulse">Finance</span>
          </h1>
          <p className="mt-2 text-adaptive-600">Accedi al tuo account</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="tua@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Accesso in corso...' : 'Accedi'}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Non hai un account?{' '}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Registrati
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}