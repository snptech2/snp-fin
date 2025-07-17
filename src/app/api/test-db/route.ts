// src/app/api/test-db/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Test database connection and tables
export async function GET(request: NextRequest) {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    const userCount = await prisma.user.count()
    console.log('User count:', userCount)
    
    // Test if tracking tables exist
    const snapshotCount = await prisma.holdingsSnapshot.count()
    console.log('Snapshot count:', snapshotCount)
    
    const settingsCount = await prisma.snapshotSettings.count()
    console.log('Settings count:', settingsCount)
    
    return NextResponse.json({
      success: true,
      userCount,
      snapshotCount,
      settingsCount,
      message: 'Database connection successful'
    })
    
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { 
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}