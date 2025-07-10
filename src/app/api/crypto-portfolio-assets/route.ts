// src/app/api/crypto-portfolio-assets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// GET - Lista asset disponibili
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult

    const assets = await prisma.cryptoPortfolioAsset.findMany({
      where: { isActive: true },
      orderBy: { symbol: 'asc' }
    })

    return NextResponse.json(assets)
  } catch (error) {
    console.error('Errore recupero asset:', error)
    return NextResponse.json({ error: 'Errore recupero asset' }, { status: 500 })
  }
}

// POST - Aggiungi asset manualmente con ticker
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult

    const body = await request.json()
    const { symbol, name, decimals = 6 } = body

    if (!symbol?.trim()) {
      return NextResponse.json({ error: 'Simbolo richiesto' }, { status: 400 })
    }

    const symbolUpper = symbol.trim().toUpperCase()

    // Verifica se esiste già
    const existingAsset = await prisma.cryptoPortfolioAsset.findUnique({
      where: { symbol: symbolUpper }
    })

    if (existingAsset) {
      if (!existingAsset.isActive) {
        // Riattiva se era disattivato
        const reactivatedAsset = await prisma.cryptoPortfolioAsset.update({
          where: { symbol: symbolUpper },
          data: { isActive: true }
        })
        return NextResponse.json(reactivatedAsset)
      }
      return NextResponse.json({ error: 'Asset già esistente' }, { status: 400 })
    }

    // Opzionalmente testa se il ticker è supportato su cryptoprices.cc
    let assetName = name?.trim() || symbolUpper
    try {
      const priceResponse = await fetch(`https://cryptoprices.cc/${symbolUpper}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      if (!priceResponse.ok) {
        console.warn(`Ticker ${symbolUpper} potrebbe non essere supportato su cryptoprices.cc`)
      }
    } catch (error) {
      console.warn(`Non è stato possibile verificare il ticker ${symbolUpper}`)
    }

    // Crea asset
    const asset = await prisma.cryptoPortfolioAsset.create({
      data: {
        symbol: symbolUpper,
        name: assetName,
        decimals: Math.max(1, Math.min(18, parseInt(decimals) || 6)),
        isActive: true
      }
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    console.error('Errore creazione asset:', error)
    return NextResponse.json({ error: 'Errore creazione asset' }, { status: 500 })
  }
}