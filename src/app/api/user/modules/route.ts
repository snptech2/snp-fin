// src/app/api/user/modules/route.ts - API gestione moduli utente
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'
import { UserModuleSettings, validateModuleDependencies, APP_MODULES } from '@/utils/modules'

const prisma = new PrismaClient()

// GET - Ottieni configurazione moduli utente
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        moduleSettings: true,
        appProfile: true,
        onboardingCompleted: true,
        onboardingStep: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    // 🔧 FIX: Se moduleSettings è null ma l'onboarding è completato, inizializza con il profilo
    let moduleSettings = user.moduleSettings as UserModuleSettings | null
    
    if (!moduleSettings && user.onboardingCompleted && user.appProfile) {
      console.log('🔧 Initializing missing moduleSettings for profile:', user.appProfile)
      const { getDefaultModuleSettings } = await import('@/utils/modules')
      moduleSettings = getDefaultModuleSettings(user.appProfile)
      
      // Salva le impostazioni nel database
      await prisma.user.update({
        where: { id: userId },
        data: { moduleSettings: moduleSettings }
      })
    }

    return NextResponse.json({
      moduleSettings,
      appProfile: user.appProfile,
      onboardingCompleted: user.onboardingCompleted,
      onboardingStep: user.onboardingStep
    })

  } catch (error) {
    console.error('Errore nel recupero configurazione moduli:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero configurazione moduli' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna configurazione moduli utente
export async function PUT(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const body = await request.json()
    const { moduleSettings, appProfile } = body

    // Validazione
    if (moduleSettings && moduleSettings.enabledModules) {
      // Verifica che tutti i moduli esistano
      const invalidModules = moduleSettings.enabledModules.filter(
        (moduleId: string) => !APP_MODULES[moduleId]
      )
      if (invalidModules.length > 0) {
        return NextResponse.json(
          { error: `Moduli non validi: ${invalidModules.join(', ')}` },
          { status: 400 }
        )
      }

      // Verifica dipendenze
      const dependencyErrors = validateModuleDependencies(moduleSettings.enabledModules)
      if (dependencyErrors.length > 0) {
        return NextResponse.json(
          { error: `Errori dipendenze: ${dependencyErrors.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Aggiorna configurazione
    const updateData: any = {}
    if (moduleSettings !== undefined) {
      updateData.moduleSettings = moduleSettings
    }
    if (appProfile !== undefined) {
      updateData.appProfile = appProfile
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        moduleSettings: true,
        appProfile: true,
        onboardingCompleted: true,
        onboardingStep: true
      }
    })

    return NextResponse.json({
      moduleSettings: updatedUser.moduleSettings as UserModuleSettings | null,
      appProfile: updatedUser.appProfile,
      onboardingCompleted: updatedUser.onboardingCompleted,
      onboardingStep: updatedUser.onboardingStep
    })

  } catch (error) {
    console.error('Errore nell\'aggiornamento configurazione moduli:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento configurazione moduli' },
      { status: 500 }
    )
  }
}