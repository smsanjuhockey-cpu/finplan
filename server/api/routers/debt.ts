import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { computeDebtPayoff, simulateLumpSum } from '@/server/services/financial/debtPayoffEngine'
import type { LoanInput } from '@/server/services/financial/debtPayoffEngine'

export const debtRouter = createTRPCRouter({
  /** Compute the debt freedom plan for a given strategy + extra payment */
  plan: protectedProcedure
    .input(z.object({
      strategy: z.enum(['avalanche', 'snowball', 'custom']).default('avalanche'),
      monthlyExtra: z.number().min(0).default(0), // INR
    }))
    .query(async ({ ctx, input }) => {
      const liabilities = await ctx.db.liability.findMany({
        where: { userId: ctx.session.user.id, isActive: true },
      })

      if (liabilities.length === 0) return null

      const loans: LoanInput[] = liabilities.map((l) => ({
        id: l.id,
        name: l.name,
        outstanding: l.outstandingAmount,
        interestRate: Number(l.interestRate),
        emiAmount: l.emiAmount ?? 0n,
        loanType: l.loanType as LoanInput['loanType'],
      }))

      const result = computeDebtPayoff(
        loans,
        BigInt(Math.round(input.monthlyExtra * 100)),
        input.strategy
      )

      // Return without the full monthly schedule (too large for default query)
      return {
        strategy: result.strategy,
        debtFreeMonths: result.debtFreeMonths,
        debtFreeDate: result.debtFreeDate,
        totalInterestPaid: result.totalInterestPaid,
        interestSavedVsMinimum: result.interestSavedVsMinimum,
        milestones: result.milestones,
      }
    }),

  /** Full month-by-month schedule (for amortization table download) */
  fullSchedule: protectedProcedure
    .input(z.object({
      strategy: z.enum(['avalanche', 'snowball', 'custom']).default('avalanche'),
      monthlyExtra: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const liabilities = await ctx.db.liability.findMany({
        where: { userId: ctx.session.user.id, isActive: true },
      })
      if (liabilities.length === 0) return []

      const loans: LoanInput[] = liabilities.map((l) => ({
        id: l.id,
        name: l.name,
        outstanding: l.outstandingAmount,
        interestRate: Number(l.interestRate),
        emiAmount: l.emiAmount ?? 0n,
        loanType: l.loanType as LoanInput['loanType'],
      }))

      const result = computeDebtPayoff(
        loans,
        BigInt(Math.round(input.monthlyExtra * 100)),
        input.strategy
      )

      return result.monthlySchedule
    }),

  /** Simulate impact of a lump sum payment */
  simulateLumpSum: protectedProcedure
    .input(z.object({
      loanId: z.string(),
      lumpSum: z.number().positive(),
      strategy: z.enum(['avalanche', 'snowball', 'custom']).default('avalanche'),
      monthlyExtra: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const liabilities = await ctx.db.liability.findMany({
        where: { userId: ctx.session.user.id, isActive: true },
      })

      const loans: LoanInput[] = liabilities.map((l) => ({
        id: l.id,
        name: l.name,
        outstanding: l.outstandingAmount,
        interestRate: Number(l.interestRate),
        emiAmount: l.emiAmount ?? 0n,
        loanType: l.loanType as LoanInput['loanType'],
      }))

      return simulateLumpSum(
        loans,
        BigInt(Math.round(input.monthlyExtra * 100)),
        input.strategy,
        BigInt(Math.round(input.lumpSum * 100)),
        input.loanId
      )
    }),
})
