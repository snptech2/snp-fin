import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Crea utente di default se non esiste
  const user = await prisma.user.upsert({
    where: { email: 'utente@snpfinance.com' },
    update: {},
    create: {
      name: 'Utente SNP Finance',
      email: 'utente@snpfinance.com',
      currency: 'EUR'
    }
  })

  console.log('✅ Utente creato:', user)
}

main()
  .catch((e) => {
    console.error('❌ Errore:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })