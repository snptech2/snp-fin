import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'
import { updateRiservaTasseBudget } from '@/lib/partitaIVAUtils'

const prisma = new PrismaClient()

// GET - Lista entrate P.IVA con filtri
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const { searchParams } = new URL(request.url)
    const anno = searchParams.get('anno')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Costruisci filtri
    const where: any = { userId }
    if (anno) {
      where.config = {
        anno: parseInt(anno)
      }
    }
    
    const incomes = await prisma.partitaIVAIncome.findMany({
      where,
      include: {
        config: true,
        account: {
          select: { id: true, name: true }
        }
      },
      orderBy: { dataIncasso: 'desc' },
      take: limit
    })
    
    return NextResponse.json(incomes)
  } catch (error) {
    console.error('Errore nel recupero entrate P.IVA:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero delle entrate' },
      { status: 500 }
    )
  }
}

// POST - Crea nuova entrata P.IVA
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const body = await request.json()
    const { dataIncasso, dataEmissione, riferimento, entrata, anno, accountId } = body
    
    // Validazione
    if (!dataIncasso || !dataEmissione || !riferimento || !entrata || !anno) {
      return NextResponse.json(
        { error: 'Tutti i campi obbligatori devono essere compilati' },
        { status: 400 }
      )
    }
    
    const importoEntrata = parseFloat(entrata)
    if (isNaN(importoEntrata) || importoEntrata <= 0) {
      return NextResponse.json(
        { error: 'L\'importo deve essere un numero positivo' },
        { status: 400 }
      )
    }
    
    // Ottieni o crea configurazione per l'anno
    let config = await prisma.partitaIVAConfig.findUnique({
      where: {
        anno_userId: {
          anno: parseInt(anno),
          userId
        }
      }
    })
    
    if (!config) {
      config = await prisma.partitaIVAConfig.create({
        data: {
          anno: parseInt(anno),
          userId,
          percentualeImponibile: 78,
          percentualeImposta: 5,
          percentualeContributi: 26.23
        }
      })
    }
    
    // Calcola valori automatici
    const imponibile = (importoEntrata * config.percentualeImponibile) / 100
    const imposta = (imponibile * config.percentualeImposta) / 100
    const contributi = (imponibile * config.percentualeContributi) / 100
    const totaleTasse = imposta + contributi
    
    // Verifica account se specificato
    let account = null
    if (accountId) {
      account = await prisma.account.findFirst({
        where: { id: parseInt(accountId), userId, type: 'bank' }
      })
      
      if (!account) {
        return NextResponse.json(
          { error: 'Conto bancario non trovato' },
          { status: 404 }
        )
      }
    }
    
    // Crea entrata e aggiorna saldo in transazione atomica
    const result = await prisma.$transaction(async (tx) => {
      // Crea entrata P.IVA
      const income = await tx.partitaIVAIncome.create({
        data: {
          dataIncasso: new Date(dataIncasso),
          dataEmissione: new Date(dataEmissione),
          riferimento,
          entrata: importoEntrata,
          imponibile,
          imposta,
          contributi,
          totaleTasse,
          userId,
          configId: config.id,
          accountId: accountId ? parseInt(accountId) : null
        },
        include: {
          config: true,
          account: {
            select: { id: true, name: true }
          }
        }
      })
      
      // Se specificato un conto, aggiorna il saldo e crea transazione normale
      if (account) {
        // Aggiorna saldo conto
        await tx.account.update({
          where: { id: account.id },
          data: { balance: { increment: importoEntrata } }
        })
        
        // Trova o crea categoria "Entrate Partita IVA"
        let category = await tx.category.findFirst({
          where: { name: 'Entrate Partita IVA', userId, type: 'income' }
        })
        
        if (!category) {
          category = await tx.category.create({
            data: {
              name: 'Entrate Partita IVA',
              type: 'income',
              color: '#10B981',
              userId
            }
          })
        }
        
        // Crea transazione normale
        await tx.transaction.create({
          data: {
            description: `P.IVA - ${riferimento}`,
            amount: importoEntrata,
            date: new Date(dataIncasso),
            type: 'income',
            accountId: account.id,
            categoryId: category.id,
            userId
          }
        })
      }
      
      // Aggiorna budget RISERVA TASSE
      await updateRiservaTasseBudget(userId, tx)
      
      return income
    })
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Errore nella creazione entrata P.IVA:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione dell\'entrata' },
      { status: 500 }
    )
  }
}