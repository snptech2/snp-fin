// src/app/api/crypto-portfolios/[id]/network-fees/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// GET - Lista network fees per crypto portfolio specifico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const resolvedParams = await params
    const cryptoPortfolioId = parseInt(resolvedParams.id)

    // Verifica portfolio ownership
    const portfolio = await prisma.cryptoPortfolio.findFirst({
      where: { id: cryptoPortfolioId, userId }
    })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // Ottieni fees del portfolio
    const fees = await prisma.networkFee.findMany({
      where: { cryptoPortfolioId },
      include: {
        asset: {
          select: {
            id: true,
            symbol: true,
            name: true,
            decimals: true
          }
        }
      },
      orderBy: { date: 'desc' }
    })

    // Raggruppa fees per asset per statistiche
    const feesByAsset = fees.reduce((acc, fee) => {
      const symbol = fee.asset?.symbol || 'UNKNOWN'
      if (!acc[symbol]) {
        acc[symbol] = {
          asset: fee.asset,
          totalQuantity: 0,
          totalEurValue: 0,
          count: 0,
          fees: []
        }
      }
      acc[symbol].totalQuantity += fee.quantity || 0
      acc[symbol].totalEurValue += fee.eurValue || 0
      acc[symbol].count += 1
      acc[symbol].fees.push(fee)
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      fees,
      feesByAsset,
      totalFees: fees.length,
      totalEurValue: fees.reduce((sum, fee) => sum + (fee.eurValue || 0), 0)
    })

  } catch (error) {
    console.error('Errore recupero network fees crypto portfolio:', error)
    return NextResponse.json({ error: 'Errore recupero network fees' }, { status: 500 })
  }
}

// POST - Crea nuova network fee per crypto portfolio
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const resolvedParams = await params
    const cryptoPortfolioId = parseInt(resolvedParams.id)
    const body = await request.json()

    const { assetId, quantity, eurValue, date, description } = body

    // Validazioni
    if (!assetId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Asset e quantità richiesti (quantità > 0)' },
        { status: 400 }
      )
    }

    // Verifica portfolio ownership
    const portfolio = await prisma.cryptoPortfolio.findFirst({
      where: { id: cryptoPortfolioId, userId }
    })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // Verifica asset exists
    const asset = await prisma.cryptoPortfolioAsset.findFirst({
      where: { id: parseInt(assetId) }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset non trovato' }, { status: 404 })
    }

    // Crea network fee
    const fee = await prisma.networkFee.create({
      data: {
        cryptoPortfolioId,
        assetId: parseInt(assetId),
        quantity: parseFloat(quantity),
        eurValue: eurValue ? parseFloat(eurValue) : null,
        date: date ? new Date(date) : new Date(),
        description: description?.trim() || null
      },
      include: {
        asset: {
          select: {
            id: true,
            symbol: true,
            name: true,
            decimals: true
          }
        }
      }
    })

    return NextResponse.json(fee, { status: 201 })

  } catch (error) {
    console.error('Errore creazione network fee crypto portfolio:', error)
    return NextResponse.json({ error: 'Errore creazione network fee' }, { status: 500 })
  }
}