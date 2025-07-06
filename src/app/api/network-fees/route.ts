// src/app/api/network-fees/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// GET - Lista fee di rete (con filtro opzionale per portfolio)
export async function GET(request: NextRequest) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const { searchParams } = new URL(request.url)
    const portfolioId = searchParams.get('portfolioId')
    const cryptoPortfolioId = searchParams.get('cryptoPortfolioId')

    const whereClause: any = {}
    
    if (portfolioId) {
      const id = parseInt(portfolioId)
      if (!isNaN(id)) {
        whereClause.portfolioId = id
      }
    }

    if (cryptoPortfolioId) {
      const id = parseInt(cryptoPortfolioId)
      if (!isNaN(id)) {
        whereClause.cryptoPortfolioId = id
      }
    }

    const fees = await prisma.networkFee.findMany({
      where: whereClause,
      include: {
        portfolio: {
          select: {
            id: true,
            name: true,
            userId: true
          }
        },
        cryptoPortfolio: {
          select: {
            id: true,
            name: true,
            userId: true
          }
        },
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

    // Filtra per user (supporta sia DCA che Crypto portfolios)
    const userFees = fees.filter(fee => {
      if (fee.portfolio) {
        return fee.portfolio.userId === userId
      }
      if (fee.cryptoPortfolio) {
        return fee.cryptoPortfolio.userId === userId
      }
      return false
    })

    // Aggiungi conversioni appropriate
    const feesWithConversions = userFees.map(fee => ({
      ...fee,
      // Per DCA (Bitcoin) - conversione sats a BTC
      btcAmount: fee.sats ? fee.sats / 100000000 : null,
      // Per Crypto - mantieni quantity nativa
      portfolioType: fee.portfolio ? 'dca' : 'crypto'
    }))

    return NextResponse.json(feesWithConversions)
  } catch (error) {
    console.error('Errore nel recupero fee di rete:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero fee di rete' },
      { status: 500 }
    )
  }
}

// POST - Crea nuova fee di rete
export async function POST(request: NextRequest) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const body = await request.json()
    const { 
      portfolioId, cryptoPortfolioId, assetId,
      sats, quantity, eurValue, 
      date, description 
    } = body

    // Validazioni: deve essere specificato un tipo di portfolio
    if (!portfolioId && !cryptoPortfolioId) {
      return NextResponse.json(
        { error: 'Specificare portfolioId (DCA) o cryptoPortfolioId (Crypto)' },
        { status: 400 }
      )
    }

    // Validazioni specifiche per tipo
    if (portfolioId) {
      // DCA Portfolio - richiede sats
      if (!sats || sats <= 0) {
        return NextResponse.json(
          { error: 'Fee in sats richiesta per DCA portfolio' },
          { status: 400 }
        )
      }
    } else if (cryptoPortfolioId) {
      // Crypto Portfolio - richiede assetId e quantity
      if (!assetId || !quantity || quantity <= 0) {
        return NextResponse.json(
          { error: 'Asset e quantità richiesti per Crypto portfolio' },
          { status: 400 }
        )
      }
    }

    // Verifica ownership del portfolio
    let portfolioExists = false
    let assetExists = false

    if (portfolioId) {
      // Verifica DCA Portfolio
      const dcaPortfolio = await prisma.dCAPortfolio.findFirst({
        where: { id: parseInt(portfolioId), userId }
      })
      portfolioExists = !!dcaPortfolio
    } else if (cryptoPortfolioId) {
      // Verifica Crypto Portfolio
      const cryptoPortfolio = await prisma.cryptoPortfolio.findFirst({
        where: { id: parseInt(cryptoPortfolioId), userId }
      })
      portfolioExists = !!cryptoPortfolio

      // Verifica Asset esiste
      if (portfolioExists && assetId) {
        const asset = await prisma.cryptoPortfolioAsset.findFirst({
          where: { id: parseInt(assetId) }
        })
        assetExists = !!asset
      }
    }

    if (!portfolioExists) {
      return NextResponse.json(
        { error: 'Portfolio non trovato' },
        { status: 404 }
      )
    }

    if (cryptoPortfolioId && !assetExists) {
      return NextResponse.json(
        { error: 'Asset non trovato' },
        { status: 404 }
      )
    }

    // Prepara dati per creazione
    const feeData: any = {
      date: date ? new Date(date) : new Date(),
      description: description?.trim() || null
    }

    // Aggiungi campi specifici per tipo portfolio
    if (portfolioId) {
      feeData.portfolioId = parseInt(portfolioId)
      feeData.sats = parseInt(sats)
    } else if (cryptoPortfolioId) {
      feeData.cryptoPortfolioId = parseInt(cryptoPortfolioId)
      feeData.assetId = parseInt(assetId)
      feeData.quantity = parseFloat(quantity)
      feeData.eurValue = eurValue ? parseFloat(eurValue) : null
    }

    const fee = await prisma.networkFee.create({
      data: feeData,
      include: {
        portfolio: {
          select: {
            id: true,
            name: true
          }
        },
        cryptoPortfolio: {
          select: {
            id: true,
            name: true
          }
        },
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

    // Aggiungi conversioni appropriate
    const feeWithConversions = {
      ...fee,
      btcAmount: fee.sats ? fee.sats / 100000000 : null,
      portfolioType: fee.portfolio ? 'dca' : 'crypto'
    }

    return NextResponse.json(feeWithConversions, { status: 201 })
  } catch (error) {
    console.error('Errore nella creazione fee di rete:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione fee di rete' },
      { status: 500 }
    )
  }
}

// DELETE - Cancella fee di rete (per operazioni batch)
export async function DELETE(request: NextRequest) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Array di IDs richiesto' },
        { status: 400 }
      )
    }

    // Verifica che tutte le fee esistano e appartengano all'utente
    const fees = await prisma.networkFee.findMany({
      where: {
        id: { in: ids.map(id => parseInt(id)) },
        OR: [
          { portfolio: { userId } },
          { cryptoPortfolio: { userId } }
        ]
      }
    })

    if (fees.length !== ids.length) {
      return NextResponse.json(
        { error: 'Alcune fee non sono state trovate' },
        { status: 404 }
      )
    }

    const deletedFees = await prisma.networkFee.deleteMany({
      where: {
        id: { in: ids.map(id => parseInt(id)) }
      }
    })

    return NextResponse.json({ 
      message: `${deletedFees.count} fee cancellate con successo`,
      deletedCount: deletedFees.count
    })
  } catch (error) {
    console.error('Errore nella cancellazione fee di rete:', error)
    return NextResponse.json(
      { error: 'Errore nella cancellazione fee di rete' },
      { status: 500 }
    )
  }
}