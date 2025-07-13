// src/components/AuthenticatedLayout.tsx
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Sidebar from './Sidebar'
import MobileHeader from './MobileHeader'
import { useOnboarding } from '@/hooks/useOnboarding'
import OnboardingWizard from './onboarding/OnboardingWizard'

const publicRoutes = ['/login', '/register']

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const { needsOnboarding, loading: onboardingLoading, completeOnboarding } = useOnboarding()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  
  const isPublicRoute = publicRoutes.includes(pathname)

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  const handleHeaderVisibilityChange = (visible: boolean) => {
    setIsHeaderVisible(visible)
    // Chiudi il menu se l'header scompare
    if (!visible) {
      setIsSidebarOpen(false)
    }
  }

  // Mostra loading spinner durante la verifica dell'autenticazione
  if (loading || onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  // Se l'utente non è autenticato e non è su una route pubblica,
  // redirect alle pagine di login/register sarà gestito dalle singole pagine
  if (!user && !isPublicRoute) {
    // Le pagine protette gestiranno il redirect autonomamente
    // Qui mostriamo temporaneamente il contenuto
  }

  // Per le route pubbliche (login/register), mostra solo il contenuto
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Se l'utente è autenticato ma deve completare l'onboarding
  if (user && needsOnboarding) {
    return <OnboardingWizard onComplete={completeOnboarding} />
  }

  // Per le route protette, mostra layout completo con sidebar
  return (
    <div className="flex min-h-screen overflow-x-hidden">
      {/* Mobile Header */}
      {user && (
        <MobileHeader 
          onMenuClick={toggleSidebar}
          onVisibilityChange={handleHeaderVisibilityChange}
        />
      )}
      
      {/* Sidebar solo se autenticato */}
      {user && (
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={closeSidebar}
          headerVisible={isHeaderVisible}
        />
      )}
      
      {/* Main Content */}
      <main className={`flex-1 min-w-0 ${user ? 'lg:ml-64' : ''}`}>
        <div className={`p-4 md:p-8 w-full max-w-full overflow-x-hidden ${user ? 'pt-20 lg:pt-8' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  )
}