'use client'

import { useEffect, useRef } from 'react'

export default function MatrixEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Real Matrix katakana characters and some numbers
    const katakana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
    const numbers = '0123456789'
    const matrix = (katakana + numbers).split('')
    
    const fontSize = 16
    const columns = canvas.width / fontSize
    
    // Array to store the y position of drops for each column
    const drops: number[] = []
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100
    }

    const draw = () => {
      // Add translucent black background for fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Set text properties
      ctx.font = fontSize + 'px monospace'
      
      // Draw characters
      for (let i = 0; i < drops.length; i++) {
        // Random character from matrix array
        const text = matrix[Math.floor(Math.random() * matrix.length)]
        
        // Bright green for the leading character
        ctx.fillStyle = '#0F0'
        ctx.fillText(text, i * fontSize, drops[i] * fontSize)
        
        // White trail for recent characters
        if (drops[i] > 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
          ctx.fillText(matrix[Math.floor(Math.random() * matrix.length)], i * fontSize, (drops[i] - 1) * fontSize)
        }
        
        // Fading green trail
        for (let j = 2; j < 10; j++) {
          if (drops[i] > j) {
            const fadeOpacity = 1 - (j / 10)
            ctx.fillStyle = `rgba(0, 255, 0, ${fadeOpacity * 0.5})`
            ctx.fillText(matrix[Math.floor(Math.random() * matrix.length)], i * fontSize, (drops[i] - j) * fontSize)
          }
        }
        
        // Reset drop to top when it goes off screen
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.95) {
          drops[i] = 0
        }
        
        // Move drop down
        drops[i]++
      }
    }

    // Animation loop - faster for more authentic feel
    const interval = setInterval(draw, 50)

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ 
        zIndex: 0,
        opacity: 0.7 // More visible
      }}
    />
  )
}