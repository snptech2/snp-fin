// src/app/api/crypto-portfolios/[id]/network-fees/[feeId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// PUT - Aggiorna network fee esistente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; feeId: string }> }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const resolvedParams = await params
    const cryptoPortfolioId = parseInt(resolvedParams.id)
    const feeId = parseInt(resolvedParams.feeId)
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

    // Verifica fee exists e appartiene al portfolio
    const existingFee = await prisma.networkFee.findFirst({
      where: { id: feeId, cryptoPortfolioId }
    })

    if (!existingFee) {
      return NextResponse.json({ error: 'Network fee non trovata' }, { status: 404 })
    }

    // Verifica asset exists
    const asset = await prisma.cryptoPortfolioAsset.findFirst({
      where: { id: parseInt(assetId) }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset non trovato' }, { status: 404 })
    }

    // Aggiorna network fee
    const updatedFee = await prisma.networkFee.update({
      where: { id: feeId },
      data: {
        assetId: parseInt(assetId),
        quantity: parseFloat(quantity),
        eurValue: eurValue ? parseFloat(eurValue) : null,
        date: date ? new Date(date) : existingFee.date,
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

    return NextResponse.json(updatedFee)

  } catch (error) {
    console.error('Errore aggiornamento network fee:', error)
    return NextResponse.json({ error: 'Errore aggiornamento network fee' }, { status: 500 })
  }
}

// DELETE - Elimina network fee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; feeId: string }> }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const resolvedParams = await params
    const cryptoPortfolioId = parseInt(resolvedParams.id)
    const feeId = parseInt(resolvedParams.feeId)

    // Verifica portfolio ownership
    const portfolio = await prisma.cryptoPortfolio.findFirst({
      where: { id: cryptoPortfolioId, userId }
    })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // Verifica fee exists e appartiene al portfolio
    const existingFee = await prisma.networkFee.findFirst({
      where: { id: feeId, cryptoPortfolioId }
    })

    if (!existingFee) {
      return NextResponse.json({ error: 'Network fee non trovata' }, { status: 404 })
    }

    // Elimina network fee
    await prisma.networkFee.delete({
      where: { id: feeId }
    })

    return NextResponse.json({ message: 'Network fee eliminata con successo' })

  } catch (error) {
    console.error('Errore eliminazione network fee:', error)
    return NextResponse.json({ error: 'Errore eliminazione network fee' }, { status: 500 })
  }
}