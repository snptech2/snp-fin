// src/components/dashboard/FinanceNewsTickerBar.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { NewsArticle, FinanceNewsResponse } from '@/types/news'

interface FinanceNewsTickerBarProps {
  className?: string
}

export default function FinanceNewsTickerBar({ className = '' }: FinanceNewsTickerBarProps) {
  const [news, setNews] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(false) // Inizia senza loading
  const [error, setError] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [mounted, setMounted] = useState(false)
  const tickerRef = useRef<HTMLDivElement>(null)

  // Fetch notizie (CON DEBUG E FALLBACK IMMEDIATO)
  const fetchNews = async () => {
    const startTime = Date.now()
    console.log('🔄 INIZIO fetch notizie...', new Date().toLocaleTimeString())
    
    try {
      setLoading(true)
      
      // FALLBACK IMMEDIATO - Mostra notizie demo subito
      const demoNews = [
        {
          id: 'demo-1',
          title: 'Bitcoin raggiunge nuovi massimi storici sopra i $100,000',
          url: 'https://coindesk.com',
          publishedAt: new Date().toISOString(),
          source: 'CoinDesk',
          category: 'bitcoin' as const,
          sentiment: 'positive' as const,
          keywords: ['bitcoin']
        },
        {
          id: 'demo-2', 
          title: 'Ethereum si prepara per il prossimo upgrade di rete',
          url: 'https://cointelegraph.com',
          publishedAt: new Date().toISOString(),
          source: 'CoinTelegraph',
          category: 'crypto' as const,
          sentiment: 'neutral' as const,
          keywords: ['ethereum']
        },
        {
          id: 'demo-3',
          title: 'Le criptovalute dominano i mercati finanziari globali',
          url: 'https://finance.yahoo.com',
          publishedAt: new Date().toISOString(),
          source: 'Yahoo Finance',
          category: 'finanza' as const,
          sentiment: 'positive' as const,
          keywords: ['crypto', 'mercati']
        }
      ]
      
      // Imposta subito le demo news per iniziare l'animazione
      setNews(demoNews)
      setLastUpdated(new Date().toISOString())
      console.log('✅ Demo news impostate SUBITO in:', Date.now() - startTime, 'ms')
      
      // FORZA il restart dell'animazione
      setTimeout(() => {
        console.log('🎬 FORZANDO restart animazione!')
        const container = document.querySelector('.ticker-container') as HTMLElement
        if (container) {
          container.style.animationName = 'none'
          container.offsetHeight // trigger reflow
          container.style.animationName = 'scroll-left'
          console.log('🚀 Animazione riavviata!')
        }
      }, 100)
      
      // Prova a fetchare le notizie reali in background
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.log('⏰ Timeout API dopo 8 secondi - usando demo news')
      }, 8000)
      
      try {
        const response = await fetch('/api/finance-news', {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const data: FinanceNewsResponse = await response.json()
          if (data.articles && data.articles.length > 0) {
            setNews(data.articles)
            setLastUpdated(data.lastUpdated)
            console.log('🎉 Notizie REALI caricate in:', Date.now() - startTime, 'ms')
          }
        }
      } catch (apiError) {
        clearTimeout(timeoutId)
        console.log('📰 API fallita, manteniamo demo news')
      }
      
      setError(null)
    } catch (err: any) {
      console.error('❌ Errore generale ticker:', err.message)
      // Mantiene le demo news anche in caso di errore
    } finally {
      setLoading(false)
    }
  }

  // Fetch immediato per animazione rapida  
  useEffect(() => {
    let mounted = true
    
    if (mounted) {
      setMounted(true)
      
      // FETCH IMMEDIATO - nessun delay
      fetchNews()
      console.log('🎬 Ticker mounted e fetch avviato!')
      
      // Refresh ogni 10 minuti per notizie più fresche
      const interval = setInterval(() => {
        if (mounted) fetchNews()
      }, 10 * 60 * 1000)
      
      return () => {
        mounted = false
        clearInterval(interval)
      }
    }
  }, [])

  // Gestione hover pause
  const handleMouseEnter = () => setIsPaused(true)
  const handleMouseLeave = () => setIsPaused(false)

  // Icone per categoria
  const getCategoryIcon = (category: NewsArticle['category']) => {
    switch (category) {
      case 'bitcoin': return '₿'
      case 'crypto': return '🪙'
      case 'finanza': return '📈'
      case 'mercati': return '💹'
      default: return '📰'
    }
  }

  // Colore per sentiment
  const getSentimentColor = (sentiment: NewsArticle['sentiment']) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400'
      case 'negative': return 'text-red-400'
      default: return 'text-blue-400'
    }
  }

  // Non bloccare il render - nasconde solo il ticker se non ci sono notizie
  if (!mounted || news.length === 0) {
    return null
  }

  return (
    <div className={`w-full bg-red-800 text-white shadow-lg rounded-lg overflow-hidden ${className}`}>
      {/* Header fisso */}
      <div className="flex items-center justify-between px-4 py-1 border-b border-red-700 bg-red-900">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-xs font-bold">FINANZA LIVE</span>
          </div>
          <span className="text-xs opacity-75">
            Aggiornato: {new Date(lastUpdated).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        <button
          onClick={fetchNews}
          className="text-xs opacity-75 hover:opacity-100 transition-opacity"
          title="Aggiorna notizie"
        >
          🔄
        </button>
      </div>

      {/* Ticker scorrevole - CONTAINER FISSO */}
      <div 
        className="w-full overflow-hidden py-2"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          ref={tickerRef}
          className="ticker-container"
          style={{
            animationDuration: `${news.length * 10}s`,
            animationPlayState: isPaused ? 'paused' : 'running',
            animationDelay: '0s' // NESSUN DELAY
          }}
        >
          {/* Duplica le notizie per loop continuo */}
          {[...news, ...news].map((article, index) => (
            <div key={`${article.id}-${index}`} className="flex items-center mx-8">
              <span className="mr-2 text-lg">
                {getCategoryIcon(article.category)}
              </span>
              
              <a 
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`hover:underline transition-colors ${getSentimentColor(article.sentiment)}`}
                title={`${article.source} - Clicca per leggere l'articolo completo`}
              >
                <span className="font-medium mr-1">[{article.source}]</span>
                {article.title}
              </a>
              
              <span className="mx-6 text-blue-300">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* CSS per animazioni - IMMEDIATO */}
      <style jsx>{`
        .ticker-container {
          display: flex;
          white-space: nowrap;
          animation: scroll-left linear infinite;
          animation-delay: 0s !important;
          animation-fill-mode: both;
          color: white !important;
          width: max-content;
          will-change: transform;
        }
        
        .ticker-container > div {
          color: white !important;
          flex-shrink: 0;
        }
        
        .ticker-container a {
          color: #FFFFFF !important;
          text-decoration: none;
        }
        
        .ticker-container a:hover {
          color: #F3F4F6 !important;
          text-decoration: underline;
        }
        
        @keyframes scroll-left {
          0% { 
            transform: translateX(5%); 
          }
          100% { 
            transform: translateX(-50%); 
          }
        }
      `}</style>
    </div>
  )
}