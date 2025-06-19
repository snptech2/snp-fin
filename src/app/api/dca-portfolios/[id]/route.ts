// src/app/api/dca-portfolios/[id]/route.ts - CON METODO CASH FLOW
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Dettagli portafoglio specifico con statistiche complete CASH FLOW
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID portafoglio non valido' },
        { status: 400 }
      )
    }

    const portfolio = await prisma.dCAPortfolio.findUnique({
      where: { id, userId: 1 },
      include: {
        transactions: {
          orderBy: { date: 'desc' }
        },
        networkFees: {
          orderBy: { date: 'desc' }
        },
        account: true
      }
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portafoglio non trovato' },
        { status: 404 }
      )
    }

    // 🔄 NUOVO: Calcolo Cash Flow Method
    const buyTransactions = portfolio.transactions.filter(tx => tx.type === 'buy')
    const sellTransactions = portfolio.transactions.filter(tx => tx.type === 'sell')

    // Totali acquisti e vendite
    const totalBuyBTC = buyTransactions.reduce((sum, tx) => sum + Math.abs(tx.btcQuantity), 0)
    const totalBuyEUR = buyTransactions.reduce((sum, tx) => sum + tx.eurPaid, 0)
    const totalSellBTC = sellTransactions.reduce((sum, tx) => sum + Math.abs(tx.btcQuantity), 0)
    const totalSellEUR = sellTransactions.reduce((sum, tx) => sum + tx.eurPaid, 0)

    // BTC totali (acquisti - vendite)
    const totalBTC = totalBuyBTC - totalSellBTC
    
    // 💰 CASH FLOW NETTO: Quanto ho speso al netto (acquisti - vendite)
    const netCashFlow = totalBuyEUR - totalSellEUR

    // 🎯 LOGICA CASH FLOW:
    // Se netCashFlow <= 0 → Investimento = 0€ (ho già recuperato tutto)
    // Se netCashFlow > 0 → Investimento = netCashFlow (quanto ho speso net)
    const actualInvestment = Math.max(0, netCashFlow)

    // Fee di rete
    const totalFeesSats = portfolio.networkFees.reduce((sum, fee) => sum + fee.sats, 0)
    const totalFeesBTC = totalFeesSats / 100000000
    const netBTC = totalBTC - totalFeesBTC

    // Prezzo medio di acquisto (solo sui BTC comprati)
    const avgPurchasePrice = totalBuyBTC > 0 ? totalBuyEUR / totalBuyBTC : 0

    // Aggiungi prezzo di acquisto per ogni transazione
    const transactionsWithPrice = portfolio.transactions.map(tx => ({
      ...tx,
      purchasePrice: tx.eurPaid / Math.abs(tx.btcQuantity)
    }))

    const portfolioWithStats = {
      ...portfolio,
      transactions: transactionsWithPrice,
      stats: {
        // 🔄 NUOVI CAMPI CASH FLOW
        totalBuyBTC,
        totalBuyEUR,
        totalSellBTC, 
        totalSellEUR,
        netCashFlow,
        actualInvestment, // 🎯 Investimento reale secondo cash flow
        isFreeBTC: actualInvestment <= 0, // 🎉 Flag "BTC Gratuiti"
        
        // 📊 CAMPI ESISTENTI (per compatibilità)
        totalBTC,
        totalEUR: actualInvestment, // 🔄 CAMBIATO: ora usa actualInvestment
        totalFeesSats,
        totalFeesBTC,
        netBTC,
        avgPrice: avgPurchasePrice, // 🔄 CAMBIATO: prezzo medio di acquisto
        
        // 📈 CONTATORI
        transactionCount: portfolio.transactions.length,
        feesCount: portfolio.networkFees.length,
        buyCount: buyTransactions.length,
        sellCount: sellTransactions.length
      }
    }

    return NextResponse.json(portfolioWithStats)
  } catch (error) {
    console.error('Errore nel recupero portafoglio DCA:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero portafoglio DCA' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna portafoglio
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const { name } = body

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID portafoglio non valido' },
        { status: 400 }
      )
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nome portafoglio richiesto' },
        { status: 400 }
      )
    }

    // Verifica che il portafoglio esista ed appartenga all'utente
    const existingPortfolio = await prisma.dCAPortfolio.findUnique({
      where: { id, userId: 1 }
    })

    if (!existingPortfolio) {
      return NextResponse.json(
        { error: 'Portafoglio non trovato' },
        { status: 404 }
      )
    }

    // Controlla se esiste già un altro portfolio con lo stesso nome
    const duplicatePortfolio = await prisma.dCAPortfolio.findFirst({
      where: {
        userId: 1,
        name: name.trim(),
        id: { not: id } // Esclude il portfolio corrente
      }
    })

    if (duplicatePortfolio) {
      return NextResponse.json(
        { error: 'Esiste già un portafoglio con questo nome' },
        { status: 400 }
      )
    }

    const updatedPortfolio = await prisma.dCAPortfolio.update({
      where: { id },
      data: { name: name.trim() },
      include: {
        transactions: true,
        networkFees: true,
        account: true
      }
    })

    return NextResponse.json(updatedPortfolio)
  } catch (error) {
    console.error('Errore nell\'aggiornamento portafoglio DCA:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento portafoglio DCA' },
      { status: 500 }
    )
  }
}

// DELETE - Elimina portafoglio
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID portafoglio non valido' },
        { status: 400 }
      )
    }

    // Verifica che il portafoglio esista ed appartenga all'utente
    const existingPortfolio = await prisma.dCAPortfolio.findUnique({
      where: { id, userId: 1 }
    })

    if (!existingPortfolio) {
      return NextResponse.json(
        { error: 'Portafoglio non trovato' },
        { status: 404 }
      )
    }

    // Elimina il portafoglio (CASCADE eliminerà automaticamente transazioni e fee)
    await prisma.dCAPortfolio.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore nell\'eliminazione portafoglio DCA:', error)
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione portafoglio DCA' },
      { status: 500 }
    )
  }
}