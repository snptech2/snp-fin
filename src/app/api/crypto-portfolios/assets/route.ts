// src/app/api/crypto-portfolios/assets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// GET - Lista tutti gli asset crypto disponibili
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
    console.error('Errore ottenimento asset:', error)
    return NextResponse.json({ error: 'Errore ottenimento asset' }, { status: 500 })
  }
}