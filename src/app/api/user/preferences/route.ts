// src/app/api/user/preferences/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { cookies } from 'next/headers'

// Tipizzazione delle preferenze supportate
interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  tutorialsDismissed?: Record<string, boolean>
  expensesExcludedCategories?: (string | number)[]
  dashboardChartColors?: Record<string, any>
  autoSnapshotSettings?: {
    enabled?: boolean
    lastSnapshot?: string
    frequency?: '6h' | '12h' | '24h'
    [key: string]: any
  }
}

const PREFERENCES_COOKIE_NAME = 'user_preferences'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 anno

// GET - Ottieni tutte le preferenze utente
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult

    const cookieStore = await cookies()
    const preferencesData = cookieStore.get(PREFERENCES_COOKIE_NAME)
    
    let preferences: UserPreferences = {}
    
    if (preferencesData?.value) {
      try {
        preferences = JSON.parse(preferencesData.value)
      } catch (error) {
        console.warn('Error parsing preferences cookie:', error)
        // Se il cookie è corrotto, lo resettiamo
        preferences = {}
      }
    }

    return NextResponse.json({
      success: true,
      preferences
    })

  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero delle preferenze' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna preferenze utente (merge con quelle esistenti)
export async function PUT(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult

    const body = await request.json()
    const { preferences: newPreferences }: { preferences: Partial<UserPreferences> } = body

    if (!newPreferences || typeof newPreferences !== 'object') {
      return NextResponse.json(
        { error: 'Preferenze non valide' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const existingData = cookieStore.get(PREFERENCES_COOKIE_NAME)
    
    let currentPreferences: UserPreferences = {}
    if (existingData?.value) {
      try {
        currentPreferences = JSON.parse(existingData.value)
      } catch (error) {
        console.warn('Error parsing existing preferences:', error)
      }
    }

    // Merge delle preferenze (deep merge per oggetti annidati)
    const updatedPreferences: UserPreferences = {
      ...currentPreferences,
      ...newPreferences,
      // Merge specifico per oggetti annidati
      tutorialsDismissed: {
        ...currentPreferences.tutorialsDismissed,
        ...newPreferences.tutorialsDismissed
      },
      dashboardChartColors: {
        ...currentPreferences.dashboardChartColors,
        ...newPreferences.dashboardChartColors
      },
      autoSnapshotSettings: {
        ...currentPreferences.autoSnapshotSettings,
        ...newPreferences.autoSnapshotSettings
      }
    }

    // Rimuovi proprietà undefined per mantenere il cookie pulito
    Object.keys(updatedPreferences).forEach(key => {
      if (updatedPreferences[key as keyof UserPreferences] === undefined) {
        delete updatedPreferences[key as keyof UserPreferences]
      }
    })

    const response = NextResponse.json({
      success: true,
      preferences: updatedPreferences,
      message: 'Preferenze aggiornate con successo'
    })

    // Imposta il cookie HttpOnly
    response.cookies.set(PREFERENCES_COOKIE_NAME, JSON.stringify(updatedPreferences), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento delle preferenze' },
      { status: 500 }
    )
  }
}

// POST - Aggiorna una singola preferenza
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult

    const body = await request.json()
    const { key, value } = body

    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { error: 'Chiave preferenza richiesta' },
        { status: 400 }
      )
    }

    // Crea un oggetto preferences parziale
    const partialPreferences: Partial<UserPreferences> = {
      [key]: value
    }

    // Riutilizza la logica di PUT
    return PUT(new NextRequest(request.url, {
      method: 'PUT',
      headers: request.headers,
      body: JSON.stringify({ preferences: partialPreferences })
    }))

  } catch (error) {
    console.error('Error updating single preference:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento della preferenza' },
      { status: 500 }
    )
  }
}

// DELETE - Reset tutte le preferenze
export async function DELETE(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult

    const response = NextResponse.json({
      success: true,
      message: 'Preferenze resettate con successo'
    })

    // Rimuovi il cookie
    response.cookies.delete(PREFERENCES_COOKIE_NAME)

    return response

  } catch (error) {
    console.error('Error resetting user preferences:', error)
    return NextResponse.json(
      { error: 'Errore nel reset delle preferenze' },
      { status: 500 }
    )
  }
}