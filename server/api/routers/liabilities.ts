import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const liabilitiesRouter = createTRPCRouter({
  /** List all active liabilities */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.liability.findMany({
      where: { userId: ctx.session.user.id, isActive: true },
      orderBy: { interestRate: 'desc' }, // highest rate first by default
    })
  }),

  /** Total outstanding debt */
  totalDebt: protectedProcedure.query(async ({ ctx }) => {
    const liabilities = await ctx.db.liability.findMany({
      where: { userId: ctx.session.user.id, isActive: true },
      select: { outstandingAmount: true, emiAmount: true, liabilityType: true, loanType: true },
    })
    const total = liabilities.reduce((sum, l) => sum + l.outstandingAmount, 0n)
    const monthlyEmi = liabilities.reduce((sum, l) => sum + (l.emiAmount ?? 0n), 0n)
    return { total, monthlyEmi, count: liabilities.length }
  }),

  /** Add a loan / liability */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      liabilityType: z.enum([
        'home_loan', 'car_loan', 'personal_loan', 'education_loan',
        'credit_card', 'gold_loan', 'business_loan', 'other',
      ]),
      loanType: z.enum(['reducing_balance', 'interest_only', 'bullet', 'overdraft']).default('reducing_balance'),
      lenderName: z.string().min(1),
      principalAmount: z.number().positive(),   // INR
      outstandingAmount: z.number().positive(),  // INR
      interestRate: z.number().min(0.01).max(50), // annual %
      emiAmount: z.number().optional(),           // INR
      loanStartDate: z.string().optional(),
      loanEndDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.liability.create({
        data: {
          userId: ctx.session.user.id as string,
          name: input.name,
          liabilityType: input.liabilityType,
          loanType: input.loanType,
          lenderName: input.lenderName,
          principalAmount: BigInt(Math.round(input.principalAmount * 100)),
          outstandingAmount: BigInt(Math.round(input.outstandingAmount * 100)),
          interestRate: input.interestRate,
          emiAmount: input.emiAmount ? BigInt(Math.round(input.emiAmount * 100)) : null,
          loanStartDate: input.loanStartDate ? new Date(input.loanStartDate) : null,
          loanEndDate: input.loanEndDate ? new Date(input.loanEndDate) : null,
          notes: input.notes,
        },
      })
    }),

  /** Update outstanding amount (after payment) */
  updateOutstanding: protectedProcedure
    .input(z.object({
      id: z.string(),
      outstandingAmount: z.number().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const liability = await ctx.db.liability.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      })
      if (!liability) throw new TRPCError({ code: 'NOT_FOUND' })
      return ctx.db.liability.update({
        where: { id: input.id },
        data: { outstandingAmount: BigInt(Math.round(input.outstandingAmount * 100)) },
      })
    }),

  /** Delete a liability */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const liability = await ctx.db.liability.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      })
      if (!liability) throw new TRPCError({ code: 'NOT_FOUND' })
      return ctx.db.liability.update({
        where: { id: input.id },
        data: { isActive: false },
      })
    }),
})
