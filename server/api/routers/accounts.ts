import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'

const accountTypeEnum = z.enum([
  'savings', 'current', 'salary', 'wallet', 'credit_card',
  'ppf', 'epf', 'nps', 'fd', 'rd', 'demat',
])

export const accountsRouter = createTRPCRouter({
  /** List all accounts for the current user */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.account.findMany({
      where: { userId: ctx.session.user.id, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
  }),

  /** Get total balance across all accounts */
  totalBalance: protectedProcedure.query(async ({ ctx }) => {
    const accounts = await ctx.db.account.findMany({
      where: { userId: ctx.session.user.id, isActive: true },
      select: { currentBalance: true, accountType: true },
    })
    const total = accounts.reduce((sum, a) => sum + a.currentBalance, 0n)
    return { total, accounts }
  }),

  /** Create a new account */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, 'Account name is required'),
      accountType: accountTypeEnum,
      institutionName: z.string().optional(),
      currentBalance: z.number().min(0).default(0),
      color: z.string().optional(),
      icon: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.account.create({
        data: {
          userId: ctx.session.user.id as string,
          name: input.name,
          accountType: input.accountType,
          institutionName: input.institutionName,
          currentBalance: BigInt(Math.round(input.currentBalance * 100)),
          color: input.color ?? '#6366f1',
          icon: input.icon ?? '🏦',
        },
      })
    }),

  /** Update account balance */
  updateBalance: protectedProcedure
    .input(z.object({
      id: z.string(),
      currentBalance: z.number().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.account.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      })
      if (!account) throw new TRPCError({ code: 'NOT_FOUND' })
      return ctx.db.account.update({
        where: { id: input.id },
        data: { currentBalance: BigInt(Math.round(input.currentBalance * 100)) },
      })
    }),

  /** Soft-delete an account */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.account.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      })
      if (!account) throw new TRPCError({ code: 'NOT_FOUND' })
      return ctx.db.account.update({
        where: { id: input.id },
        data: { isActive: false },
      })
    }),
})
