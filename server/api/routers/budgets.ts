import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'

// ─── ROUTER ───────────────────────────────────────────────────────────────────

export const budgetsRouter = createTRPCRouter({

  /** Get the active budget for a given month/year, or null if none exists */
  getCurrent: protectedProcedure
    .input(z.object({ month: z.number().min(1).max(12), year: z.number() }))
    .query(async ({ ctx, input }) => {
      const startDate = new Date(input.year, input.month - 1, 1)
      const endDate   = new Date(input.year, input.month, 0, 23, 59, 59)

      const budget = await ctx.db.budget.findFirst({
        where: {
          userId: ctx.session.user.id,
          isActive: true,
          startDate: { lte: endDate },
          endDate:   { gte: startDate },
        },
        include: {
          categories: {
            include: { category: { select: { id: true, name: true, icon: true, color: true, type: true } } },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!budget) return null

      // Fetch actual spending per category for the month
      const categoryIds = budget.categories.map(bc => bc.categoryId)
      const spendingRows = categoryIds.length > 0
        ? await ctx.db.transaction.groupBy({
            by: ['categoryId'],
            where: {
              userId: ctx.session.user.id,
              date: { gte: startDate, lte: endDate },
              type: 'expense',
              categoryId: { in: categoryIds },
            },
            _sum: { amount: true },
          })
        : []

      const spendingMap = new Map(spendingRows.map(r => [r.categoryId, r._sum.amount ?? 0n]))

      // Total actual spending for the month (all expenses)
      const totalSpendingAgg = await ctx.db.transaction.aggregate({
        where: { userId: ctx.session.user.id, date: { gte: startDate, lte: endDate }, type: 'expense' },
        _sum: { amount: true },
      })
      const totalSpent = totalSpendingAgg._sum.amount ?? 0n

      return {
        ...budget,
        totalSpent,
        categories: budget.categories.map(bc => ({
          ...bc,
          spent: spendingMap.get(bc.categoryId) ?? 0n,
        })),
      }
    }),

  /** Create a budget for a given month */
  create: protectedProcedure
    .input(z.object({
      month:        z.number().min(1).max(12),
      year:         z.number(),
      totalAmount:  z.number().positive(),
      budgetMethod: z.enum(['custom', 'fifty_thirty_twenty', 'zero_based']).default('custom'),
      name:         z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId    = ctx.session.user.id
      const startDate = new Date(input.year, input.month - 1, 1)
      const endDate   = new Date(input.year, input.month, 0, 23, 59, 59)
      const totalPaise = BigInt(Math.round(input.totalAmount * 100))

      // Deactivate any existing budget for this period
      await ctx.db.budget.updateMany({
        where: { userId, startDate, endDate, isActive: true },
        data: { isActive: false },
      })

      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      const name = input.name ?? `${MONTHS[input.month - 1]} ${input.year} Budget`

      let needsAmount: bigint | null = null
      let wantsAmount: bigint | null = null
      let savingsAmount: bigint | null = null

      if (input.budgetMethod === 'fifty_thirty_twenty') {
        needsAmount   = BigInt(Math.round(Number(totalPaise) * 0.50))
        wantsAmount   = BigInt(Math.round(Number(totalPaise) * 0.30))
        savingsAmount = BigInt(Math.round(Number(totalPaise) * 0.20))
      }

      return ctx.db.budget.create({
        data: { userId, name, periodType: 'monthly', startDate, endDate, totalAmount: totalPaise, budgetMethod: input.budgetMethod, needsAmount, wantsAmount, savingsAmount },
      })
    }),

  /** Update budget total/method */
  update: protectedProcedure
    .input(z.object({
      id:           z.string(),
      totalAmount:  z.number().positive().optional(),
      budgetMethod: z.enum(['custom', 'fifty_thirty_twenty', 'zero_based']).optional(),
      name:         z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const budget = await ctx.db.budget.findUnique({ where: { id: input.id } })
      if (!budget || budget.userId !== ctx.session.user.id) throw new TRPCError({ code: 'NOT_FOUND' })

      const totalPaise = input.totalAmount ? BigInt(Math.round(input.totalAmount * 100)) : budget.totalAmount
      const method     = input.budgetMethod ?? budget.budgetMethod

      let needsAmount   = budget.needsAmount
      let wantsAmount   = budget.wantsAmount
      let savingsAmount = budget.savingsAmount

      if (method === 'fifty_thirty_twenty') {
        needsAmount   = BigInt(Math.round(Number(totalPaise) * 0.50))
        wantsAmount   = BigInt(Math.round(Number(totalPaise) * 0.30))
        savingsAmount = BigInt(Math.round(Number(totalPaise) * 0.20))
      }

      return ctx.db.budget.update({
        where: { id: input.id },
        data: {
          ...(input.name         && { name: input.name }),
          ...(input.totalAmount  && { totalAmount: totalPaise }),
          ...(input.budgetMethod && { budgetMethod: method }),
          needsAmount, wantsAmount, savingsAmount,
        },
      })
    }),

  /** Upsert a category allocation in a budget */
  upsertCategory: protectedProcedure
    .input(z.object({
      budgetId:        z.string(),
      categoryId:      z.string(),
      allocatedAmount: z.number().min(0),
      bucket:          z.enum(['needs', 'wants', 'savings', 'uncategorized']).default('uncategorized'),
    }))
    .mutation(async ({ ctx, input }) => {
      const budget = await ctx.db.budget.findUnique({ where: { id: input.budgetId } })
      if (!budget || budget.userId !== ctx.session.user.id) throw new TRPCError({ code: 'NOT_FOUND' })

      const existing = await ctx.db.budgetCategory.findFirst({
        where: { budgetId: input.budgetId, categoryId: input.categoryId },
      })

      const allocPaise = BigInt(Math.round(input.allocatedAmount * 100))

      if (existing) {
        return ctx.db.budgetCategory.update({
          where: { id: existing.id },
          data: { allocatedAmount: allocPaise, bucket: input.bucket },
        })
      }

      const count = await ctx.db.budgetCategory.count({ where: { budgetId: input.budgetId } })
      return ctx.db.budgetCategory.create({
        data: { budgetId: input.budgetId, categoryId: input.categoryId, allocatedAmount: allocPaise, bucket: input.bucket, sortOrder: count },
      })
    }),

  /** Remove a category allocation */
  removeCategory: protectedProcedure
    .input(z.object({ budgetId: z.string(), categoryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const budget = await ctx.db.budget.findUnique({ where: { id: input.budgetId } })
      if (!budget || budget.userId !== ctx.session.user.id) throw new TRPCError({ code: 'NOT_FOUND' })
      await ctx.db.budgetCategory.deleteMany({ where: { budgetId: input.budgetId, categoryId: input.categoryId } })
      return { removed: true }
    }),

  /** Get spending categories for the month (to help populate budget allocations) */
  spendingCategories: protectedProcedure
    .input(z.object({ month: z.number().min(1).max(12), year: z.number() }))
    .query(async ({ ctx, input }) => {
      const startDate = new Date(input.year, input.month - 1, 1)
      const endDate   = new Date(input.year, input.month, 0, 23, 59, 59)

      return ctx.db.transaction.groupBy({
        by: ['categoryId'],
        where: { userId: ctx.session.user.id, type: 'expense', date: { gte: startDate, lte: endDate }, categoryId: { not: null } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      })
    }),
})
