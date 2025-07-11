// src/app/api/finance-news/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { NewsArticle, NewsSource } from '@/types/news'

// Cache in memoria per le notizie (15 minuti)
let newsCache: { articles: NewsArticle[], lastFetch: number } | null = null
const CACHE_DURATION = 15 * 60 * 1000 // 15 minuti

// Configurazione fonti specializzate finanza/crypto
const FINANCE_NEWS_SOURCES: NewsSource[] = [
  // Bitcoin & Crypto News ITALIANI
  { name: 'CoinTelegraph Bitcoin', url: 'https://it.cointelegraph.com/rss/tag/bitcoin', category: 'bitcoin', priority: 'high', enabled: true },
  { name: 'CoinTelegraph Ethereum', url: 'https://it.cointelegraph.com/rss/tag/ethereum', category: 'crypto', priority: 'high', enabled: true },
  { name: 'CoinTelegraph Mercati', url: 'https://it.cointelegraph.com/rss/category/market-analysis', category: 'mercati', priority: 'high', enabled: true },
  { name: 'CoinTelegraph Regolamentazione', url: 'https://it.cointelegraph.com/rss/tag/regulation', category: 'finanza', priority: 'medium', enabled: true },
  
  // Finanza Italiana
  { name: 'Il Sole 24 Ore', url: 'https://www.ilsole24ore.com/rss/economia.xml', category: 'finanza', priority: 'high', enabled: true },
  { name: 'Corriere Economia', url: 'https://xml.corriereobjects.it/rss/economia.xml', category: 'finanza', priority: 'medium', enabled: true },
  { name: 'Repubblica Economia', url: 'https://www.repubblica.it/rss/economia/rss2.0.xml', category: 'finanza', priority: 'medium', enabled: true },
]

// Keywords per filtri intelligenti
const BITCOIN_KEYWORDS = ['bitcoin', 'btc', 'crypto', 'cryptocurrency', 'blockchain', 'satoshi', 'mining', 'halving']
const FINANCE_KEYWORDS = ['mercati', 'borsa', 'investimenti', 'euro', 'dollaro', 'fed', 'bce', 'economia', 'finanza', 'trading']

// Parser RSS semplificato
async function parseRSSFeed(url: string, source: NewsSource): Promise<NewsArticle[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SNP-Finance/1.0)',
      },
      next: { revalidate: 600 }, // Cache Next.js per 10 minuti
      signal: AbortSignal.timeout(5000) // Timeout ridotto a 5 secondi
    })

    if (!response.ok) {
      console.warn(`❌ Errore fetch RSS ${source.name}:`, response.status)
      return []
    }

    const xmlText = await response.text()
    
    // Parser XML semplice per RSS
    const articles: NewsArticle[] = []
    const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi)
    
    if (!itemMatches) {
      console.warn(`⚠️ Nessun item trovato in RSS ${source.name}`)
      return []
    }

    for (let i = 0; i < Math.min(itemMatches.length, 3); i++) {
      const item = itemMatches[i]
      
      const titleMatch = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
      const linkMatch = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i)
      const descMatch = item.match(/<description[^>]*>([\s\S]*?)<\/description>/i)
      const pubDateMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)
      
      if (titleMatch && linkMatch) {
        const title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
        const url = linkMatch[1].trim()
        const description = descMatch ? descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim() : ''
        const publishedAt = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString()
        
        // Filtro intelligente per rilevanza
        const content = `${title} ${description}`.toLowerCase()
        const isRelevant = source.category === 'bitcoin' 
          ? BITCOIN_KEYWORDS.some(keyword => content.includes(keyword))
          : source.category === 'finanza'
          ? FINANCE_KEYWORDS.some(keyword => content.includes(keyword))
          : true

        if (isRelevant && title.length > 10) {
          // Sentiment analysis semplice
          const sentiment = content.includes('crash') || content.includes('down') || content.includes('fall') 
            ? 'negative'
            : content.includes('surge') || content.includes('up') || content.includes('bull') 
            ? 'positive' 
            : 'neutral'

          articles.push({
            id: `${source.name}-${i}-${Date.now()}`,
            title,
            description,
            url,
            publishedAt,
            source: source.name,
            category: source.category,
            sentiment,
            keywords: extractKeywords(content)
          })
        }
      }
    }

    console.log(`✅ ${source.name}: ${articles.length} articoli rilevanti`)
    return articles
    
  } catch (error) {
    console.error(`❌ Errore parsing RSS ${source.name}:`, error)
    return []
  }
}

// Estrazione keywords semplice
function extractKeywords(content: string): string[] {
  const allKeywords = [...BITCOIN_KEYWORDS, ...FINANCE_KEYWORDS]
  return allKeywords.filter(keyword => content.includes(keyword))
}

// Aggregazione e prioritizzazione notizie
async function aggregateFinanceNews(): Promise<NewsArticle[]> {
  const enabledSources = FINANCE_NEWS_SOURCES.filter(source => source.enabled)
  const allArticles: NewsArticle[] = []

  // Fetch parallelo da tutte le fonti
  const promises = enabledSources.map(source => parseRSSFeed(source.url, source))
  const results = await Promise.allSettled(promises)

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value)
    } else {
      console.error(`❌ Fonte ${enabledSources[index].name} fallita:`, result.reason)
    }
  })

  // Ordinamento per priorità e data
  const sortedArticles = allArticles
    .sort((a, b) => {
      // Prima per categoria/priorità
      const aPriority = a.category === 'bitcoin' ? 3 : a.category === 'crypto' ? 2 : 1
      const bPriority = b.category === 'bitcoin' ? 3 : b.category === 'crypto' ? 2 : 1
      
      if (aPriority !== bPriority) return bPriority - aPriority
      
      // Poi per data
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })
    .slice(0, 10) // Massimo 10 articoli per performance

  console.log(`📰 Aggregati ${sortedArticles.length} articoli finanza/crypto`)
  return sortedArticles
}

// GET /api/finance-news
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    // Controllo cache
    const now = Date.now()
    if (!forceRefresh && newsCache && (now - newsCache.lastFetch) < CACHE_DURATION) {
      console.log('📰 Notizie servite da cache')
      return NextResponse.json({
        articles: newsCache.articles,
        lastUpdated: new Date(newsCache.lastFetch).toISOString(),
        sources: FINANCE_NEWS_SOURCES.filter(s => s.enabled).map(s => s.name),
        cached: true
      })
    }

    // Fetch fresh news
    console.log('🔄 Fetching notizie fresche...')
    const articles = await aggregateFinanceNews()
    
    // Aggiorna cache
    newsCache = {
      articles,
      lastFetch: now
    }

    return NextResponse.json({
      articles,
      lastUpdated: new Date(now).toISOString(),
      sources: FINANCE_NEWS_SOURCES.filter(s => s.enabled).map(s => s.name),
      cached: false
    })

  } catch (error) {
    console.error('❌ Errore API finance-news:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero notizie finanziarie' },
      { status: 500 }
    )
  }
}