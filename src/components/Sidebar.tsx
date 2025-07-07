// src/components/Sidebar.tsx - AGGIORNATA con Changelog
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const navigation = [
  { name: 'Dashboard', href: '/', icon: '🏠' },
  { name: 'Conti', href: '/accounts', icon: '🏦' },
  { name: 'Entrate', href: '/income', icon: '⬆️' },
  { name: 'Uscite', href: '/expenses', icon: '⬇️' },
  { name: 'Budget', href: '/budget', icon: '📊' },
  { name: 'Partita IVA', href: '/partita-iva', icon: '📋' },
  { name: 'Beni Non Correnti', href: '/beni-non-correnti', icon: '🏠' },
  { name: 'Crediti', href: '/crediti', icon: '💰' },
  { name: 'Investimenti', href: '/investments', icon: '📈' },
  { name: 'Changelog', href: '/changelog', icon: '📝' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    if (confirm('Sei sicuro di voler uscire?')) {
      await logout()
    }
  }

  // Se non c'è utente, non mostrare la sidebar
  if (!user) return null

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 sidebar-adaptive shadow-lg border-r border-adaptive">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-adaptive">
          <h1 className="text-xl font-bold text-adaptive-900">SNP Finance</h1>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-4 py-6">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-blue-500 text-white' 
                    : 'text-adaptive-700 hover:bg-gray-50 hover:text-adaptive-900'
                  }
                `}
              >
                <span className="mr-3 text-lg">
                  {item.icon}
                </span>
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-adaptive p-4">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-adaptive-700 truncate">{user.name}</p>
              <p className="text-xs text-adaptive-600 truncate">{user.email}</p>
              <p className="text-xs text-adaptive-600">{user.currency}</p>
            </div>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-adaptive-600 hover:text-adaptive-900 hover:bg-gray-50 rounded-md transition-colors"
          >
            Esci
          </button>
        </div>
      </div>
    </div>
  )
}