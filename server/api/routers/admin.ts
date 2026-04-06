import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { createTRPCRouter, adminProcedure } from '../trpc'

export const adminRouter = createTRPCRouter({

  /** Platform-wide stats for the overview dashboard */
  platformStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalUsers,
      onboardedUsers,
      suspendedUsers,
      adminUsers,
      newThisWeek,
      newThisMonth,
      totalTransactions,
      activeUsers,
      totalLiabilities,
      totalAssets,
      totalGoals,
      recentSignups,
    ] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.user.count({ where: { onboardingCompleted: true } }),
      ctx.db.user.count({ where: { suspendedAt: { not: null } } }),
      ctx.db.user.count({ where: { role: 'admin' } }),
      ctx.db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      ctx.db.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      ctx.db.transaction.count(),
      ctx.db.user.count({
        where: {
          transactions: { some: { date: { gte: thirtyDaysAgo } } },
        },
      }),
      ctx.db.liability.aggregate({
        where: { isActive: true },
        _sum: { outstandingAmount: true },
        _count: true,
      }),
      ctx.db.asset.aggregate({
        _sum: { currentValue: true },
        _count: true,
      }),
      ctx.db.goal.count(),
      ctx.db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, name: true, email: true, createdAt: true,
          onboardingCompleted: true, role: true, suspendedAt: true,
        },
      }),
    ])

    return {
      totalUsers,
      onboardedUsers,
      suspendedUsers,
      adminUsers,
      newThisWeek,
      newThisMonth,
      totalTransactions,
      activeUsersLast30d: activeUsers,
      totalDebtTracked: totalLiabilities._sum.outstandingAmount ?? 0n,
      totalLiabilityCount: totalLiabilities._count,
      totalAssetsValue: totalAssets._sum.currentValue ?? 0n,
      totalAssetCount: totalAssets._count,
      totalGoals,
      recentSignups,
    }
  }),

  /** Paginated user list with activity counts */
  listUsers: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
      search: z.string().optional(),
      role: z.enum(['user', 'admin']).optional(),
      suspended: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {}
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: 'insensitive' } },
          { email: { contains: input.search, mode: 'insensitive' } },
        ]
      }
      if (input.role) where.role = input.role
      if (input.suspended === true) where.suspendedAt = { not: null }
      if (input.suspended === false) where.suspendedAt = null

      const items = await ctx.db.user.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, role: true,
          createdAt: true, onboardingCompleted: true, suspendedAt: true,
          _count: {
            select: { transactions: true, liabilities: true, assets: true, goals: true },
          },
          liabilities: {
            where: { isActive: true },
            select: { outstandingAmount: true },
          },
        },
      })

      let nextCursor: string | undefined
      if (items.length > input.limit) {
        nextCursor = items.pop()?.id
      }

      return {
        items: items.map(u => ({
          ...u,
          totalDebt: u.liabilities.reduce((s, l) => s + l.outstandingAmount, 0n),
          liabilities: undefined,
        })),
        nextCursor,
      }
    }),

  /** Detailed view of a single user — no transaction descriptions */
  getUserDetail: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true, name: true, email: true, role: true, avatarUrl: true,
          createdAt: true, updatedAt: true, onboardingCompleted: true,
          suspendedAt: true, annualIncome: true, employmentType: true,
          taxRegime: true,
          // Counts only
          _count: {
            select: {
              transactions: true, liabilities: true, assets: true,
              goals: true, accounts: true, aiChatMessages: true,
            },
          },
          // Account total balance only
          accounts: {
            where: { isActive: true },
            select: { currentBalance: true },
          },
          // Liability breakdown by type (no names/notes)
          liabilities: {
            where: { isActive: true },
            select: { liabilityType: true, outstandingAmount: true },
          },
          // Asset breakdown by type
          assets: {
            select: { assetType: true, currentValue: true },
          },
          // Transaction type counts + most recent date only
          transactions: {
            select: { type: true, date: true },
            orderBy: { date: 'desc' },
            take: 1000,
          },
        },
      })

      if (!user) throw new TRPCError({ code: 'NOT_FOUND' })

      const totalBalance = user.accounts.reduce((s, a) => s + a.currentBalance, 0n)

      const liabilityBreakdown = user.liabilities.reduce<Record<string, { count: number; total: bigint }>>((acc, l) => {
        if (!acc[l.liabilityType]) acc[l.liabilityType] = { count: 0, total: 0n }
        acc[l.liabilityType].count++
        acc[l.liabilityType].total += l.outstandingAmount
        return acc
      }, {})

      const assetBreakdown = user.assets.reduce<Record<string, { count: number; total: bigint }>>((acc, a) => {
        if (!acc[a.assetType]) acc[a.assetType] = { count: 0, total: 0n }
        acc[a.assetType].count++
        acc[a.assetType].total += a.currentValue
        return acc
      }, {})

      const txnTypeCounts = user.transactions.reduce<Record<string, number>>((acc, t) => {
        acc[t.type] = (acc[t.type] ?? 0) + 1
        return acc
      }, {})

      const mostRecentTxnDate = user.transactions[0]?.date ?? null

      return {
        id: user.id, name: user.name, email: user.email, role: user.role,
        avatarUrl: user.avatarUrl, createdAt: user.createdAt, updatedAt: user.updatedAt,
        onboardingCompleted: user.onboardingCompleted, suspendedAt: user.suspendedAt,
        annualIncome: user.annualIncome, employmentType: user.employmentType,
        taxRegime: user.taxRegime, counts: user._count,
        totalBalance, liabilityBreakdown, assetBreakdown,
        txnTypeCounts, mostRecentTxnDate,
      }
    }),

  /** Suspend a user */
  suspendUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot suspend yourself' })
      }
      return ctx.db.user.update({
        where: { id: input.userId },
        data: { suspendedAt: new Date() },
        select: { id: true, suspendedAt: true },
      })
    }),

  /** Unsuspend a user */
  unsuspendUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: input.userId },
        data: { suspendedAt: null },
        select: { id: true, suspendedAt: true },
      })
    }),

  /** Change a user's role */
  setRole: adminProcedure
    .input(z.object({ userId: z.string(), role: z.enum(['user', 'admin']) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id && input.role === 'user') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot demote yourself' })
      }
      return ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
        select: { id: true, role: true },
      })
    }),

  /** Hard-delete a user and all their data */
  deleteUser: adminProcedure
    .input(z.object({ userId: z.string(), confirm: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot delete yourself' })
      }
      await ctx.db.user.delete({ where: { id: input.userId } })
      return { deleted: true }
    }),
})
