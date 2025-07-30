'use client'

import { useState } from 'react'
import { QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface HelpTooltipProps {
  title: string
  content: string | React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  iconSize?: 'sm' | 'md' | 'lg'
}

export default function HelpTooltip({ 
  title, 
  content, 
  position = 'top',
  className = '',
  iconSize = 'sm' 
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 dark:border-t-gray-700',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 dark:border-b-gray-700',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 dark:border-l-gray-700',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 dark:border-r-gray-700'
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
        aria-label="Help"
      >
        <QuestionMarkCircleIcon className={sizeClasses[iconSize]} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close on outside click */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Tooltip */}
          <div className={`absolute z-50 w-72 ${positionClasses[position]}`}>
            <div className="bg-gray-800 dark:bg-gray-700 text-white rounded-lg shadow-lg p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm">{title}</h4>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white ml-2"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              
              {/* Content */}
              <div className="text-xs text-gray-200">
                {content}
              </div>
            </div>
            
            {/* Arrow */}
            <div 
              className={`absolute w-0 h-0 border-8 border-transparent ${arrowClasses[position]}`}
            />
          </div>
        </>
      )}
    </div>
  )
}