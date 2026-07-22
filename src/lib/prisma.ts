import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import ws from 'ws'

const connectionString = process.env.DATABASE_URL

if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  (() => {
    const adapter = new PrismaNeon({ connectionString })
    return new PrismaClient({ adapter })
  })()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
