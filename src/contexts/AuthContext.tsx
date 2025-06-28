// src/contexts/AuthContext.tsx - FIX INFINITE LOOP
'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'

interface User {
  id: number
  name: string
  email: string
  currency: string
  createdAt?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  // 🔧 FIX: Previeni loop infinito con ref
  const isCheckingAuth = useRef(false)
  const lastAuthCheck = useRef<number>(0)
  const AUTH_CHECK_COOLDOWN = 5000 // 5 secondi di cooldown

  // Carica utente al mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    // 🔧 FIX: Previeni chiamate multiple ravvicinate
    const now = Date.now()
    if (isCheckingAuth.current || (now - lastAuthCheck.current < AUTH_CHECK_COOLDOWN)) {
      return
    }

    isCheckingAuth.current = true
    lastAuthCheck.current = now

    try {
      console.log('🔐 Checking auth status...')
      
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Auth check successful:', data.user.email)
        setUser(data.user)
      } else {
        console.log('❌ Auth check failed:', response.status)
        setUser(null)
      }
    } catch (error) {
      console.error('❌ Errore nel controllo autenticazione:', error)
      setUser(null)
    } finally {
      setLoading(false)
      isCheckingAuth.current = false
    }
  }

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting login for:', email)
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok) {
        console.log('✅ Login successful for:', email)
        setUser(data.user)
        
        // 🔧 Reset auth check cooldown per permettere verifiche immediate dopo login
        lastAuthCheck.current = 0
        
        return { success: true }
      } else {
        console.log('❌ Login failed:', data.error)
        return { success: false, error: data.error || 'Errore nel login' }
      }
    } catch (error) {
      console.error('❌ Errore nel login:', error)
      return { success: false, error: 'Errore di connessione' }
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      console.log('📝 Attempting registration for:', email)
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, password })
      })

      const data = await response.json()

      if (response.ok) {
        console.log('✅ Registration successful for:', email)
        setUser(data.user)
        
        // 🔧 Reset auth check cooldown per permettere verifiche immediate dopo registrazione
        lastAuthCheck.current = 0
        
        return { success: true }
      } else {
        console.log('❌ Registration failed:', data.error)
        return { success: false, error: data.error || 'Errore nella registrazione' }
      }
    } catch (error) {
      console.error('❌ Errore nella registrazione:', error)
      return { success: false, error: 'Errore di connessione' }
    }
  }

  const logout = async () => {
    try {
      console.log('🚪 Attempting logout...')
      
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      
      console.log('✅ Logout successful')
    } catch (error) {
      console.error('❌ Errore nel logout:', error)
    } finally {
      setUser(null)
      // 🔧 Reset auth check cooldown
      lastAuthCheck.current = 0
    }
  }

  const refreshUser = async () => {
    // 🔧 Reset cooldown per forzare un refresh
    lastAuthCheck.current = 0
    await checkAuthStatus()
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve essere usato all\'interno di AuthProvider')
  }
  return context
}