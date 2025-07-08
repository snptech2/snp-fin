// src/app/api/user/onboarding/route.ts - API gestione onboarding guidato
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'
import { getDefaultModuleSettings, APP_PROFILES } from '@/utils/modules'

const prisma = new PrismaClient()

// POST - Completa step onboarding
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const body = await request.json()
    const { step, profileId, moduleSettings, accountData, categoryData } = body

    const updateData: any = {
      onboardingStep: step
    }

    // Step finale - completa onboarding
    if (step >= 5) {
      updateData.onboardingCompleted = true
      updateData.onboardingCompletedAt = new Date()
    }

    // Step 2 - Selezione profilo
    if (profileId && APP_PROFILES[profileId]) {
      updateData.appProfile = profileId
      
      // Se non è custom, imposta i moduli del profilo
      if (profileId !== 'custom') {
        updateData.moduleSettings = getDefaultModuleSettings(profileId)
      }
    }

    // Step 3 - Configurazione moduli custom
    if (moduleSettings && profileId === 'custom') {
      updateData.moduleSettings = moduleSettings
    }

    // Aggiorna utente
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        onboardingStep: true,
        onboardingCompleted: true,
        appProfile: true,
        moduleSettings: true
      }
    })

    // Step 4 e 5 - Crea dati iniziali se forniti
    if (step === 4 || step === 5) {
      console.log(`🏦 Step ${step} - Creating account data:`, accountData)
      // Crea conto principale se fornito
      if (accountData) {
        const initialBalance = accountData.balance || 0
        console.log('💰 Initial balance:', initialBalance)
        
        // 💰 GESTIONE CORRETTA SALDO INIZIALE
        // Se c'è un saldo iniziale, lo gestiamo correttamente con transazione
        const account = await prisma.account.create({
          data: {
            name: accountData.name || 'Conto Principale',
            type: accountData.type || 'bank',
            balance: initialBalance, // Impostiamo il saldo
            isDefault: true,
            userId
          }
        })
        console.log('✅ Account created:', account)

        // Se saldo > 0, creiamo una transazione di apertura per mantenere consistenza contabile
        if (initialBalance > 0) {
          // Prima creiamo la categoria "Saldo Iniziale" se non esiste
          let initialBalanceCategory = await prisma.category.findFirst({
            where: {
              userId,
              name: 'Saldo Iniziale',
              type: 'income'
            }
          })

          if (!initialBalanceCategory) {
            initialBalanceCategory = await prisma.category.create({
              data: {
                name: 'Saldo Iniziale',
                type: 'income',
                color: '#10B981', // Verde per entrata
                userId
              }
            })
          }

          // Creiamo la transazione di apertura
          const transaction = await prisma.transaction.create({
            data: {
              description: `Saldo iniziale del conto "${account.name}"`,
              amount: initialBalance,
              date: new Date(), // Data corrente
              type: 'income',
              accountId: account.id,
              categoryId: initialBalanceCategory.id,
              userId
            }
          })
          console.log('✅ Initial transaction created:', transaction)
        }
      }

      // Crea categorie base se fornite
      if (categoryData && Array.isArray(categoryData)) {
        await prisma.category.createMany({
          data: categoryData.map((cat: any) => ({
            name: cat.name,
            type: cat.type,
            color: cat.color || '#3B82F6',
            userId
          }))
        })
      }
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: step >= 5 ? 'Onboarding completato!' : `Step ${step} completato`
    })

  } catch (error) {
    console.error('Errore nell\'onboarding:', error)
    return NextResponse.json(
      { error: 'Errore nell\'onboarding' },
      { status: 500 }
    )
  }
}

// GET - Stato onboarding
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboardingStep: true,
        onboardingCompleted: true,
        appProfile: true,
        moduleSettings: true,
        onboardingCompletedAt: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    return NextResponse.json(user)

  } catch (error) {
    console.error('Errore nel recupero stato onboarding:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero stato onboarding' },
      { status: 500 }
    )
  }
}