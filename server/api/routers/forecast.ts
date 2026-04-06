import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { runForecast } from '@/server/services/financial/forecastEngine'

export const forecastRouter = createTRPCRouter({

  /** Generate a rule-based forecast for the next N months */
  generate: protectedProcedure
    .input(z.object({ months: z.number().min(3).max(24).default(12) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const now    = new Date()
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

      // Gather data
      const [incomeAgg, expensesAgg, recurringRules, lifeEvents, assets, liabilities] = await Promise.all([
        ctx.db.transaction.aggregate({
          where: { userId, type: 'income', date: { gte: threeMonthsAgo } },
          _sum: { amount: true },
        }),
        ctx.db.transaction.aggregate({
          where: { userId, type: { in: ['expense', 'investment'] }, date: { gte: threeMonthsAgo } },
          _sum: { amount: true },
        }),
        ctx.db.recurringRule.findMany({
          where: { userId },
          select: { amount: true, type: true, frequency: true, isActive: true, startDate: true, endDate: true },
        }),
        ctx.db.lifeEvent.findMany({
          where: { userId },
          select: { estimatedDate: true, financialImpact: true, oneTimeCost: true, isActive: true },
        }),
        ctx.db.asset.aggregate({ where: { userId }, _sum: { currentValue: true } }),
        ctx.db.liability.aggregate({ where: { userId, isActive: true }, _sum: { outstandingAmount: true } }),
      ])

      const monthlyIncome   = (incomeAgg._sum.amount   ?? 0n) / 3n
      const monthlyExpenses = (expensesAgg._sum.amount ?? 0n) / 3n
      const currentNetWorth = (assets._sum.currentValue ?? 0n) - (liabilities._sum.outstandingAmount ?? 0n)

      const forecast = runForecast({
        monthlyIncome,
        monthlyExpenses,
        recurringRules,
        lifeEvents,
        currentNetWorth,
        months: input.months,
      })

      return forecast
    }),
})
