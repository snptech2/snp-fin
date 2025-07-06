import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// GET - Ottieni configurazione per anno
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const { searchParams } = new URL(request.url)
    const anno = searchParams.get('anno')
    
    if (!anno) {
      return NextResponse.json(
        { error: 'Anno richiesto' },
        { status: 400 }
      )
    }
    
    const config = await prisma.partitaIVAConfig.findUnique({
      where: {
        anno_userId: {
          anno: parseInt(anno),
          userId
        }
      }
    })
    
    // Se non esiste, crea configurazione default per l'anno
    if (!config) {
      const newConfig = await prisma.partitaIVAConfig.create({
        data: {
          anno: parseInt(anno),
          userId,
          percentualeImponibile: 78,
          percentualeImposta: 5,
          percentualeContributi: 26.23
        }
      })
      return NextResponse.json(newConfig)
    }
    
    return NextResponse.json(config)
  } catch (error) {
    console.error('Errore nel recupero configurazione P.IVA:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero della configurazione' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna configurazione per anno
export async function PUT(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const body = await request.json()
    const { anno, percentualeImponibile, percentualeImposta, percentualeContributi } = body
    
    // Validazione
    if (!anno || percentualeImponibile === undefined || percentualeImposta === undefined || percentualeContributi === undefined) {
      return NextResponse.json(
        { error: 'Anno e tutte le percentuali sono obbligatorie' },
        { status: 400 }
      )
    }
    
    if (percentualeImponibile < 0 || percentualeImponibile > 100 ||
        percentualeImposta < 0 || percentualeImposta > 100 ||
        percentualeContributi < 0 || percentualeContributi > 100) {
      return NextResponse.json(
        { error: 'Le percentuali devono essere tra 0 e 100' },
        { status: 400 }
      )
    }
    
    const config = await prisma.partitaIVAConfig.upsert({
      where: {
        anno_userId: {
          anno: parseInt(anno),
          userId
        }
      },
      update: {
        percentualeImponibile: parseFloat(percentualeImponibile),
        percentualeImposta: parseFloat(percentualeImposta),
        percentualeContributi: parseFloat(percentualeContributi)
      },
      create: {
        anno: parseInt(anno),
        userId,
        percentualeImponibile: parseFloat(percentualeImponibile),
        percentualeImposta: parseFloat(percentualeImposta),
        percentualeContributi: parseFloat(percentualeContributi)
      }
    })
    
    return NextResponse.json(config)
  } catch (error) {
    console.error('Errore nell\'aggiornamento configurazione P.IVA:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento della configurazione' },
      { status: 500 }
    )
  }
}

// GET all configurations for user
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const configs = await prisma.partitaIVAConfig.findMany({
      where: { userId },
      orderBy: { anno: 'desc' }
    })
    
    return NextResponse.json(configs)
  } catch (error) {
    console.error('Errore nel recupero configurazioni P.IVA:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero delle configurazioni' },
      { status: 500 }
    )
  }
}

// DELETE - Elimina configurazione per anno
export async function DELETE(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const { searchParams } = new URL(request.url)
    const anno = searchParams.get('anno')
    
    if (!anno) {
      return NextResponse.json(
        { error: 'Anno richiesto' },
        { status: 400 }
      )
    }
    
    // Verifica che non ci siano entrate per questo anno
    const existingIncomes = await prisma.partitaIVAIncome.count({
      where: {
        userId,
        config: {
          anno: parseInt(anno)
        }
      }
    })
    
    if (existingIncomes > 0) {
      return NextResponse.json(
        { error: 'Non puoi eliminare un anno che contiene entrate' },
        { status: 400 }
      )
    }
    
    // Verifica che non ci siano pagamenti per questo anno
    const existingPayments = await prisma.partitaIVATaxPayment.count({
      where: {
        userId,
        data: {
          gte: new Date(`${anno}-01-01`),
          lt: new Date(`${parseInt(anno) + 1}-01-01`)
        }
      }
    })
    
    if (existingPayments > 0) {
      return NextResponse.json(
        { error: 'Non puoi eliminare un anno che contiene pagamenti tasse' },
        { status: 400 }
      )
    }
    
    // Elimina la configurazione
    await prisma.partitaIVAConfig.delete({
      where: {
        anno_userId: {
          anno: parseInt(anno),
          userId
        }
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore nell\'eliminazione configurazione P.IVA:', error)
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione della configurazione' },
      { status: 500 }
    )
  }
}