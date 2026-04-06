import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' })
const prisma = new PrismaClient({ adapter } as never)

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'sanjumenon2204@gmail.com' },
    select: { hashedPassword: true },
  })
  console.log('Hash in DB:', user?.hashedPassword)
  const match = await bcrypt.compare('Password@123', user?.hashedPassword ?? '')
  console.log('Password match:', match)
  await prisma.$disconnect()
}

main()
