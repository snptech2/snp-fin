// src/components/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/', icon: '🏠' },
  { name: 'Conti Bancari', href: '/accounts', icon: '🏦' },
  { name: 'Entrate', href: '/income', icon: '⬆️' },
  { name: 'Uscite', href: '/expenses', icon: '⬇️' },
  { name: 'Budget', href: '/budget', icon: '📊' },
  { name: 'Altro', href: '/other', icon: '📄' },
  { name: 'Investimenti', href: '/investments', icon: '📈' },
]

export default function Sidebar() {
  const pathname = usePathname()

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
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
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
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              U
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-adaptive-700">Utente</p>
              <p className="text-xs text-adaptive-600">EUR</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}