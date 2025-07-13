// src/components/MobileHeader.tsx
'use client'

import { useState, useEffect } from 'react'

interface MobileHeaderProps {
  onMenuClick: () => void
  onVisibilityChange?: (visible: boolean) => void
}

export default function MobileHeader({ onMenuClick, onVisibilityChange }: MobileHeaderProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down & past threshold
        setIsVisible(false)
      } else {
        // Scrolling up or at top
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Notifica il parent quando la visibilità cambia
  useEffect(() => {
    onVisibilityChange?.(isVisible)
  }, [isVisible, onVisibilityChange])

  return (
    <header className={`
      lg:hidden fixed top-0 left-0 right-0 z-30 h-16 card-adaptive border-b border-adaptive 
      flex items-center justify-between px-4 transition-transform duration-300 ease-in-out
      ${isVisible ? 'translate-y-0' : '-translate-y-full'}
    `}>
      {/* Hamburger Menu Button */}
      <button
        onClick={onMenuClick}
        className="p-2 rounded-md text-adaptive-600 hover:bg-adaptive-100 transition-colors"
        aria-label="Menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      {/* Logo SNP Finance */}
      <div className="flex items-center">
        <h1 className="text-lg font-bold">
          <span className="text-adaptive-900">SNP</span>
          <span className="ml-2 text-green-500 animate-pulse">Finance</span>
        </h1>
      </div>
      
      {/* Placeholder for symmetry */}
      <div className="w-10"></div>
    </header>
  )
}