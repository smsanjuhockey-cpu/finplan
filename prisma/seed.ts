/**
 * Prisma seed — runs on first setup.
 * Seeds all system transaction categories with Indian financial context.
 */
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { SYSTEM_CATEGORIES } from '../lib/constants/categories'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' })
const prisma = new PrismaClient({ adapter } as never)

async function main() {
  console.log('🌱 Seeding FinPlan database...')

  // Seed system categories (userId = null means system-level)
  let created = 0
  let skipped = 0

  for (const cat of SYSTEM_CATEGORIES) {
    const existing = await prisma.transactionCategory.findFirst({
      where: { id: cat.id },
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.transactionCategory.create({
      data: {
        id: cat.id,
        userId: null,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type as 'income' | 'expense' | 'investment' | 'transfer',
        isSystem: true,
        sortOrder: SYSTEM_CATEGORIES.indexOf(cat),
      },
    })
    created++
  }

  console.log(`✅ Categories: ${created} created, ${skipped} already existed`)

  // Grant admin role to ADMIN_EMAIL if set
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (adminUser) {
      await prisma.user.update({ where: { email: adminEmail }, data: { role: 'admin' } })
      console.log(`✅ Admin role granted to ${adminEmail}`)
    } else {
      console.log(`⚠️  ADMIN_EMAIL=${adminEmail} — no user found. Register first, then re-run seed.`)
    }
  }

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
