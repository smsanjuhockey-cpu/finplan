import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const transactionsRouter = createTRPCRouter({
  /** List transactions with optional filters */
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
      categoryId: z.string().optional(),
      accountId: z.string().optional(),
      type: z.enum(['income', 'expense', 'transfer', 'investment']).optional(),
      from: z.string().optional(), // ISO date string
      to: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { userId: ctx.session.user.id }
      if (input.categoryId) where.categoryId = input.categoryId
      if (input.accountId) where.accountId = input.accountId
      if (input.type) where.type = input.type
      if (input.from || input.to) {
        where.date = {
          ...(input.from ? { gte: new Date(input.from) } : {}),
          ...(input.to ? { lte: new Date(input.to) } : {}),
        }
      }

      const items = await ctx.db.transaction.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { date: 'desc' },
        include: {
          category: { select: { id: true, name: true, icon: true, color: true } },
          account: { select: { id: true, name: true, icon: true } },
        },
      })

      let nextCursor: string | undefined
      if (items.length > input.limit) {
        const next = items.pop()
        nextCursor = next?.id
      }

      return { items, nextCursor }
    }),

  /** Monthly summary: income, expenses, savings */
  monthlySummary: protectedProcedure
    .input(z.object({
      month: z.number().min(1).max(12),
      year: z.number().min(2000).max(2100),
    }))
    .query(async ({ ctx, input }) => {
      const from = new Date(input.year, input.month - 1, 1)
      const to = new Date(input.year, input.month, 0, 23, 59, 59)

      const txns = await ctx.db.transaction.findMany({
        where: { userId: ctx.session.user.id, date: { gte: from, lte: to } },
        select: { type: true, direction: true, amount: true },
      })

      let income = 0n
      let expenses = 0n
      let investments = 0n

      for (const t of txns) {
        if (t.type === 'income') income += t.amount
        else if (t.type === 'expense') expenses += t.amount
        else if (t.type === 'investment') investments += t.amount
      }

      return {
        income,
        expenses,
        investments,
        savings: income - expenses - investments,
        savingsRate: income > 0n ? Number((income - expenses - investments) * 10000n / income) / 100 : 0,
      }
    }),

  /** Category spending breakdown for a month */
  categoryBreakdown: protectedProcedure
    .input(z.object({
      month: z.number().min(1).max(12),
      year: z.number().min(2000).max(2100),
    }))
    .query(async ({ ctx, input }) => {
      const from = new Date(input.year, input.month - 1, 1)
      const to = new Date(input.year, input.month, 0, 23, 59, 59)

      const txns = await ctx.db.transaction.findMany({
        where: {
          userId: ctx.session.user.id,
          type: 'expense',
          date: { gte: from, lte: to },
        },
        include: { category: { select: { id: true, name: true, icon: true, color: true } } },
      })

      const map = new Map<string, { categoryId: string; name: string; icon: string; color: string; total: bigint }>()
      for (const t of txns) {
        const key = t.categoryId ?? 'uncategorized'
        const existing = map.get(key)
        if (existing) {
          existing.total += t.amount
        } else {
          map.set(key, {
            categoryId: key,
            name: t.category?.name ?? 'Uncategorized',
            icon: t.category?.icon ?? '📌',
            color: t.category?.color ?? '#94a3b8',
            total: t.amount,
          })
        }
      }

      return Array.from(map.values()).sort((a, b) => Number(b.total - a.total))
    }),

  /** Quick-add a transaction */
  create: protectedProcedure
    .input(z.object({
      amount: z.number().positive('Amount must be positive'),
      type: z.enum(['income', 'expense', 'transfer', 'investment']),
      direction: z.enum(['debit', 'credit']),
      description: z.string().min(1),
      categoryId: z.string().optional(),
      accountId: z.string().optional(),
      date: z.string(), // ISO date
      notes: z.string().optional(),
      isTaxRelevant: z.boolean().default(false),
      taxSection: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const txn = await ctx.db.transaction.create({
        data: {
          userId: ctx.session.user.id as string,
          amount: BigInt(Math.round(input.amount * 100)),
          type: input.type,
          direction: input.direction,
          description: input.description,
          categoryId: input.categoryId,
          accountId: input.accountId,
          date: new Date(input.date),
          notes: input.notes,
          isTaxRelevant: input.isTaxRelevant,
          taxSection: input.taxSection,
          isManuallyEntered: true,
        },
        include: {
          category: { select: { id: true, name: true, icon: true } },
        },
      })

      // Update account balance if accountId provided
      if (input.accountId) {
        const delta = input.direction === 'credit'
          ? BigInt(Math.round(input.amount * 100))
          : -BigInt(Math.round(input.amount * 100))
        await ctx.db.account.update({
          where: { id: input.accountId },
          data: { currentBalance: { increment: delta } },
        })
      }

      return txn
    }),

  /** Bulk create transactions from CSV import */
  bulkCreate: protectedProcedure
    .input(z.array(z.object({
      amount: z.number().positive(),
      type: z.enum(['income', 'expense', 'transfer', 'investment']),
      direction: z.enum(['debit', 'credit']),
      description: z.string().min(1),
      date: z.string(),
      categoryId: z.string().optional(),
      accountId: z.string().optional(),
      notes: z.string().optional(),
    })).min(1).max(500))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id as string
      const result = await ctx.db.transaction.createMany({
        data: input.map((t) => ({
          userId,
          amount: BigInt(Math.round(t.amount * 100)),
          type: t.type,
          direction: t.direction,
          description: t.description,
          date: new Date(t.date),
          categoryId: t.categoryId ?? null,
          accountId: t.accountId ?? null,
          notes: t.notes ?? null,
          isManuallyEntered: true,
          isTaxRelevant: false,
        })),
        skipDuplicates: false,
      })
      return { count: result.count }
    }),

  /** Delete a transaction */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const txn = await ctx.db.transaction.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      })
      if (!txn) throw new TRPCError({ code: 'NOT_FOUND' })

      // Reverse account balance if needed
      if (txn.accountId) {
        const delta = txn.direction === 'credit' ? -txn.amount : txn.amount
        await ctx.db.account.update({
          where: { id: txn.accountId },
          data: { currentBalance: { increment: delta } },
        })
      }

      return ctx.db.transaction.delete({ where: { id: input.id } })
    }),
})
