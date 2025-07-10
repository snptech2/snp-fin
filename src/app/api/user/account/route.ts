// src/app/api/user/account/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { extractTokenFromRequest, getUserFromToken } from '@/lib/auth'
import { verifyPassword } from '@/lib/auth'

const prisma = new PrismaClient()

// DELETE /api/user/account - Elimina account utente e tutti i dati correlati
export async function DELETE(request: NextRequest) {
  try {
    // 1. Verifica autenticazione
    const token = extractTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const tokenPayload = getUserFromToken(token)
    if (!tokenPayload) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // 2. Ottieni e verifica password
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Password richiesta per conferma' }, { status: 400 })
    }

    // 3. Verifica utente e password
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    if (!user.password) {
      return NextResponse.json({ error: 'Account senza password impostata' }, { status: 400 })
    }

    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Password non corretta' }, { status: 400 })
    }

    // 4. Eliminazione transazionale di tutti i dati
    await prisma.$transaction(async (tx) => {
      const userId = user.id

      // Elimina in ordine di dipendenza (dal più specifico al più generale)
      
      // 1. Elimina transazioni DCA (cascade eliminerà le network fees)
      await tx.dCATransaction.deleteMany({ where: { portfolio: { userId } } })
      
      // 2. Elimina transazioni crypto portfolio (cascade eliminerà holdings e network fees)
      await tx.cryptoPortfolioTransaction.deleteMany({ where: { portfolio: { userId } } })
      
      // 3. Elimina network fees rimanenti
      await tx.networkFee.deleteMany({ where: { portfolio: { userId } } })
      await tx.networkFee.deleteMany({ where: { cryptoPortfolio: { userId } } })
      
      // 4. Elimina holdings crypto
      await tx.cryptoPortfolioHolding.deleteMany({ where: { portfolio: { userId } } })
      
      // 5. Elimina portfolio (DCA e Crypto)
      await tx.dCAPortfolio.deleteMany({ where: { userId } })
      await tx.cryptoPortfolio.deleteMany({ where: { userId } })
      
      // 6. Elimina transazioni normali
      await tx.transaction.deleteMany({ where: { userId } })
      
      // 7. Elimina trasferimenti
      await tx.transfer.deleteMany({ where: { userId } })
      
      // 8. Elimina partita IVA (incomes, tax payments, configs)
      await tx.partitaIVAIncome.deleteMany({ where: { userId } })
      await tx.partitaIVATaxPayment.deleteMany({ where: { userId } })
      await tx.partitaIVAConfig.deleteMany({ where: { userId } })
      
      // 9. Elimina beni non correnti e crediti
      await tx.nonCurrentAsset.deleteMany({ where: { userId } })
      await tx.credit.deleteMany({ where: { userId } })
      
      // 10. Elimina categorie, budget
      await tx.category.deleteMany({ where: { userId } })
      await tx.budget.deleteMany({ where: { userId } })
      
      // 11. Elimina account
      await tx.account.deleteMany({ where: { userId } })
      
      // 12. Infine elimina l'utente
      await tx.user.delete({ where: { id: userId } })
    })

    // 5. Log di audit (opzionale)
    console.log(`🗑️ Account eliminato: ${user.email} (ID: ${user.id}) - ${new Date().toISOString()}`)

    // 6. Risposta di successo
    return NextResponse.json({ 
      message: 'Account eliminato con successo',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Errore eliminazione account:', error)
    return NextResponse.json(
      { error: 'Errore interno del server durante eliminazione account' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}