import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'
import { updateRiservaTasseBudget } from '@/lib/partitaIVAUtils'

const prisma = new PrismaClient()

// PUT - Modifica entrata P.IVA
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const params = await context.params
    const incomeId = parseInt(params.id)
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
    
    // Verifica che l'entrata esista e appartenga all'utente
    const existingIncome = await prisma.partitaIVAIncome.findFirst({
      where: { id: incomeId, userId },
      include: { account: true }
    })
    
    if (!existingIncome) {
      return NextResponse.json(
        { error: 'Entrata non trovata' },
        { status: 404 }
      )
    }
    
    // Ottieni configurazione per l'anno
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
    
    // Aggiorna entrata e saldi in transazione atomica
    const result = await prisma.$transaction(async (tx) => {
      // Se il conto è cambiato, aggiusta i saldi
      if (existingIncome.accountId !== (accountId ? parseInt(accountId) : null)) {
        // Rimuovi dal conto vecchio
        if (existingIncome.accountId) {
          await tx.account.update({
            where: { id: existingIncome.accountId },
            data: { balance: { decrement: existingIncome.entrata } }
          })
          
          // Rimuovi la transazione vecchia
          await tx.transaction.deleteMany({
            where: {
              description: `P.IVA - ${existingIncome.riferimento}`,
              accountId: existingIncome.accountId,
              amount: existingIncome.entrata,
              type: 'income',
              userId
            }
          })
        }
        
        // Aggiungi al conto nuovo
        if (account) {
          await tx.account.update({
            where: { id: account.id },
            data: { balance: { increment: importoEntrata } }
          })
          
          // Trova o crea categoria
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
          
          // Crea nuova transazione
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
      } else if (existingIncome.accountId) {
        // Stesso conto, aggiorna solo la differenza
        const differenza = importoEntrata - existingIncome.entrata
        if (differenza !== 0) {
          await tx.account.update({
            where: { id: existingIncome.accountId },
            data: { balance: { increment: differenza } }
          })
          
          // Aggiorna la transazione esistente
          await tx.transaction.updateMany({
            where: {
              description: `P.IVA - ${existingIncome.riferimento}`,
              accountId: existingIncome.accountId,
              amount: existingIncome.entrata,
              type: 'income',
              userId
            },
            data: {
              description: `P.IVA - ${riferimento}`,
              amount: importoEntrata,
              date: new Date(dataIncasso)
            }
          })
        }
      }
      
      // Aggiorna l'entrata P.IVA
      const income = await tx.partitaIVAIncome.update({
        where: { id: incomeId },
        data: {
          dataIncasso: new Date(dataIncasso),
          dataEmissione: new Date(dataEmissione),
          riferimento,
          entrata: importoEntrata,
          imponibile,
          imposta,
          contributi,
          totaleTasse,
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
      
      // Aggiorna budget RISERVA TASSE
      await updateRiservaTasseBudget(userId, tx)
      
      return income
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Errore nella modifica entrata P.IVA:', error)
    return NextResponse.json(
      { error: 'Errore nella modifica dell\'entrata' },
      { status: 500 }
    )
  }
}

// DELETE - Elimina entrata P.IVA
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const params = await context.params
    const incomeId = parseInt(params.id)
    
    // Verifica che l'entrata esista e appartenga all'utente
    const existingIncome = await prisma.partitaIVAIncome.findFirst({
      where: { id: incomeId, userId },
      include: { account: true }
    })
    
    if (!existingIncome) {
      return NextResponse.json(
        { error: 'Entrata non trovata' },
        { status: 404 }
      )
    }
    
    // Elimina entrata e aggiusta saldi in transazione atomica
    await prisma.$transaction(async (tx) => {
      // Se collegata a un conto, rimuovi il saldo e la transazione
      if (existingIncome.accountId) {
        await tx.account.update({
          where: { id: existingIncome.accountId },
          data: { balance: { decrement: existingIncome.entrata } }
        })
        
        // Rimuovi la transazione collegata
        await tx.transaction.deleteMany({
          where: {
            description: `P.IVA - ${existingIncome.riferimento}`,
            accountId: existingIncome.accountId,
            amount: existingIncome.entrata,
            type: 'income',
            userId
          }
        })
      }
      
      // Elimina l'entrata P.IVA
      await tx.partitaIVAIncome.delete({
        where: { id: incomeId }
      })
      
      // Aggiorna budget RISERVA TASSE
      await updateRiservaTasseBudget(userId, tx)
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore nell\'eliminazione entrata P.IVA:', error)
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione dell\'entrata' },
      { status: 500 }
    )
  }
}