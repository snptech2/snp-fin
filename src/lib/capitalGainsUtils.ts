// src/lib/capitalGainsUtils.ts
import { PrismaClient } from '@prisma/client'

// Tipi per Portfolio e BitcoinPrice (copiati dalle pagine)
interface Portfolio {
  id: number
  name: string
  type: 'dca_bitcoin' | 'crypto_wallet'
  stats: {
    totalBTC?: number
    netBTC?: number
    totalROI?: number
    [key: string]: any
  }
}

interface BitcoinPrice {
  btcPrice: number
  currency: string
  cached: boolean
  timestamp: string
}

export interface CapitalGainsResult {
  capitalGains: number // Positiva = plusvalenza, negativa = minusvalenza
  averageCost: number // Costo medio per BTC
  totalBtcHeld: number // BTC totali nel portfolio (prima della vendita)
  totalInvestment: number // Investimento totale (prima della vendita)
}

export interface CapitalGainsTransaction {
  type: 'income' | 'expense'
  amount: number // Valore assoluto della plus/minusvalenza
  description: string
  categoryName: string
}

/**
 * Calcola le plusvalenze/minusvalenze per una vendita di Bitcoin
 */
export async function calculateCapitalGains(
  prisma: PrismaClient,
  portfolioId: number,
  btcSold: number, // Quantità BTC venduta (valore positivo)
  eurReceived: number // EUR ricevuti dalla vendita
): Promise<CapitalGainsResult> {
  
  // Recupera tutte le transazioni del portfolio (escluso quella che stiamo per creare)
  const transactions = await prisma.dCATransaction.findMany({
    where: { portfolioId },
    orderBy: { date: 'asc' }
  })

  // Calcola BTC totali e investimento totale
  let totalBtc = 0
  let totalInvestment = 0

  for (const tx of transactions) {
    if (tx.type === 'buy') {
      totalBtc += tx.btcQuantity
      totalInvestment += tx.eurPaid  // 🟠 AGGIORNATO
    } else if (tx.type === 'sell') {
      totalBtc -= Math.abs(tx.btcQuantity) // btcQuantity è già negativa per le vendite
      // Non sottraiamo dall'investimento - manteniamo il costo originale
    }
  }

  // Calcola costo medio per BTC
  const averageCost = totalBtc > 0 ? totalInvestment / totalBtc : 0

  // Calcola plusvalenza/minusvalenza
  const costBasis = averageCost * btcSold
  const capitalGains = eurReceived - costBasis

  return {
    capitalGains,
    averageCost,
    totalBtcHeld: totalBtc,
    totalInvestment
  }
}

/**
 * Crea automaticamente la transazione per plusvalenze/minusvalenze
 */
export async function createCapitalGainsTransaction(
  prisma: PrismaClient,
  userId: number,
  accountId: number,
  capitalGains: number,
  btcSold: number,
  portfolioName: string
): Promise<CapitalGainsTransaction | null> {
  
  // Se non ci sono plusvalenze/minusvalenze significative, non creare transazione
  if (Math.abs(capitalGains) < 0.01) {
    return null
  }

  const isGain = capitalGains > 0
  const transactionType = isGain ? 'income' : 'expense'
  const categoryName = isGain ? 'Plusvalenze Bitcoin' : 'Minusvalenze Bitcoin'
  const categoryColor = isGain ? '#10B981' : '#EF4444' // Verde per guadagni, rosso per perdite

  // Cerca o crea la categoria
  let category = await prisma.category.findFirst({
    where: {
      userId,
      name: categoryName,
      type: transactionType
    }
  })

  if (!category) {
    category = await prisma.category.create({
      data: {
        userId,
        name: categoryName,
        type: transactionType,
        color: categoryColor
      }
    })
  }

  // Crea la transazione
  const description = `${isGain ? 'Plusvalenza' : 'Minusvalenza'} da vendita ${btcSold} BTC (${portfolioName})`
  
  await prisma.transaction.create({
    data: {
      userId,
      accountId,
      categoryId: category.id,
      type: transactionType,
      amount: Math.abs(capitalGains),
      description,
      date: new Date()
    }
  })

  // Aggiorna il saldo del conto
  if (isGain) {
    await prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: Math.abs(capitalGains) } }
    })
  } else {
    await prisma.account.update({
      where: { id: accountId },
      data: { balance: { decrement: Math.abs(capitalGains) } }
    })
  }

  return {
    type: transactionType,
    amount: Math.abs(capitalGains),
    description,
    categoryName
  }
}

/**
 * Formato euro per display
 */
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

/**
 * Formato BTC per display
 */
export function formatBTC(amount: number): string {
  return `${amount.toFixed(8)} BTC`
}

/**
 * Calcola il valore corrente di un DCA portfolio
 */
export function getDCACurrentValue(portfolio: Portfolio, btcPrice: number): number {
  if (portfolio.type !== 'dca_bitcoin' && !portfolio.stats?.totalBTC && !portfolio.stats?.netBTC) {
    return 0;
  }
  
  if (!btcPrice) {
    return 0;
  }
  
  // Priority: netBTC (includes network fees)
  if (portfolio.stats?.netBTC !== undefined && portfolio.stats?.netBTC !== null) {
    return portfolio.stats.netBTC * btcPrice;
  }
  
  // Fallback: totalBTC (may not include network fees)
  if (portfolio.stats?.totalBTC !== undefined && portfolio.stats?.totalBTC !== null) {
    return portfolio.stats.totalBTC * btcPrice;
  }
  
  return 0;
}