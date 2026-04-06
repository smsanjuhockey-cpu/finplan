import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const netWorthRouter = createTRPCRouter({

  /** Net worth summary: total assets, liabilities, net worth, asset breakdown by type */
  summary: protectedProcedure.query(async ({ ctx }) => {
    const [assets, liabilities] = await Promise.all([
      ctx.db.asset.findMany({
        where: { userId: ctx.session.user.id },
        select: { assetType: true, currentValue: true, name: true },
      }),
      ctx.db.liability.findMany({
        where: { userId: ctx.session.user.id, isActive: true },
        select: { outstandingAmount: true, liabilityType: true, name: true, interestRate: true },
      }),
    ])

    const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0n)
    const totalLiabilities = liabilities.reduce((s, l) => s + l.outstandingAmount, 0n)
    const netWorth = totalAssets - totalLiabilities

    // Group assets by type
    const assetBreakdown = assets.reduce<Record<string, bigint>>((acc, a) => {
      acc[a.assetType] = (acc[a.assetType] ?? 0n) + a.currentValue
      return acc
    }, {})

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      assetBreakdown,
      assetCount: assets.length,
      liabilityCount: liabilities.length,
    }
  }),

  /** Save a snapshot of current net worth */
  takeSnapshot: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id

    const [assets, liabilities] = await Promise.all([
      ctx.db.asset.findMany({ where: { userId }, select: { assetType: true, currentValue: true } }),
      ctx.db.liability.findMany({ where: { userId, isActive: true }, select: { liabilityType: true, outstandingAmount: true } }),
    ])

    const totalAssets      = assets.reduce((s, a) => s + a.currentValue, 0n)
    const totalLiabilities = liabilities.reduce((s, l) => s + l.outstandingAmount, 0n)
    const netWorth         = totalAssets - totalLiabilities

    const assetsBreakdown      = assets.reduce<Record<string, string>>((acc, a) => { acc[a.assetType] = String(acc[a.assetType] ? BigInt(acc[a.assetType]) + a.currentValue : a.currentValue); return acc }, {})
    const liabilitiesBreakdown = liabilities.reduce<Record<string, string>>((acc, l) => { acc[l.liabilityType] = String(acc[l.liabilityType] ? BigInt(acc[l.liabilityType]) + l.outstandingAmount : l.outstandingAmount); return acc }, {})

    const today = new Date(); today.setHours(0, 0, 0, 0)

    return ctx.db.netWorthSnapshot.upsert({
      where: { userId_snapshotDate: { userId, snapshotDate: today } },
      create: { userId, snapshotDate: today, totalAssets, totalLiabilities, netWorth, assetsBreakdown, liabilitiesBreakdown },
      update: { totalAssets, totalLiabilities, netWorth, assetsBreakdown, liabilitiesBreakdown },
    })
  }),

  /** Get snapshot history (last N snapshots) */
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(60).default(12) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.netWorthSnapshot.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { snapshotDate: 'desc' },
        take: input.limit,
        select: { id: true, snapshotDate: true, totalAssets: true, totalLiabilities: true, netWorth: true },
      })
    }),
})
