// src/types/news.ts
export interface NewsArticle {
  id: string
  title: string
  description?: string
  url: string
  publishedAt: string
  source: string
  category: 'bitcoin' | 'crypto' | 'finanza' | 'mercati'
  sentiment?: 'positive' | 'negative' | 'neutral'
  keywords: string[]
}

export interface NewsSource {
  name: string
  url: string
  category: 'bitcoin' | 'crypto' | 'finanza' | 'mercati'
  priority: 'high' | 'medium' | 'low'
  enabled: boolean
}

export interface FinanceNewsResponse {
  articles: NewsArticle[]
  lastUpdated: string
  sources: string[]
  cached: boolean
}

export interface NewsTickerConfig {
  enabled: boolean
  speed: 'slow' | 'medium' | 'fast'
  categories: ('bitcoin' | 'crypto' | 'finanza' | 'mercati')[]
  maxArticles: number
  autoRefresh: boolean
  refreshInterval: number // minutes
}