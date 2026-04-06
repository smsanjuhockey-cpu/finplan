import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'

const assetTypeEnum = z.enum([
  'savings_account', 'fd', 'rd', 'mutual_fund', 'stocks',
  'ppf', 'epf', 'nps', 'real_estate',
  'gold_physical', 'gold_etf', 'sgb', 'crypto', 'other',
])

export const assetsRouter = createTRPCRouter({

  /** List all assets */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.asset.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: 'asc' },
    })
  }),

  /** Total value across all assets */
  totalValue: protectedProcedure.query(async ({ ctx }) => {
    const assets = await ctx.db.asset.findMany({
      where: { userId: ctx.session.user.id },
      select: { currentValue: true, assetType: true },
    })
    const total = assets.reduce((sum, a) => sum + a.currentValue, 0n)
    return { total, count: assets.length }
  }),

  /** Add an asset — only name, type, and current value required */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      assetType: assetTypeEnum,
      currentValue: z.number().min(0), // INR
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.asset.create({
        data: {
          userId: ctx.session.user.id as string,
          name: input.name,
          assetType: input.assetType,
          currentValue: BigInt(Math.round(input.currentValue * 100)),
          purchaseValue: BigInt(Math.round(input.currentValue * 100)), // default same as current
          notes: input.notes,
        },
      })
    }),

  /** Update current value */
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      currentValue: z.number().min(0).optional(), // INR
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.asset.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      })
      if (!asset) throw new TRPCError({ code: 'NOT_FOUND' })
      return ctx.db.asset.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.currentValue !== undefined && {
            currentValue: BigInt(Math.round(input.currentValue * 100)),
          }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
      })
    }),

  /** Delete an asset */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.asset.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      })
      if (!asset) throw new TRPCError({ code: 'NOT_FOUND' })
      return ctx.db.asset.delete({ where: { id: input.id } })
    }),
})
