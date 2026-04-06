import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const FREQUENCY_MONTHS: Record<string, number> = {
  monthly: 1, quarterly: 3, halfyearly: 6, yearly: 12,
}
const FREQUENCY_DAYS: Record<string, number> = {
  daily: 1, weekly: 7, biweekly: 14,
}

function computeNextDueDate(
  startDate: Date,
  frequency: string,
  dueDayOfMonth?: number | null,
): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Monthly with a fixed day-of-month (e.g. EMI on the 5th every month)
  if (dueDayOfMonth && frequency === 'monthly') {
    const candidate = new Date(today.getFullYear(), today.getMonth(), dueDayOfMonth)
    if (candidate >= today) return candidate
    return new Date(today.getFullYear(), today.getMonth() + 1, dueDayOfMonth)
  }

  if (startDate >= today) return startDate

  // Advance from startDate until we reach a future date
  const next = new Date(startDate)
  while (next < today) {
    const months = FREQUENCY_MONTHS[frequency]
    const days = FREQUENCY_DAYS[frequency]
    if (months) next.setMonth(next.getMonth() + months)
    else if (days) next.setDate(next.getDate() + days)
    else break
  }
  return next
}

// ─── SCHEMAS ──────────────────────────────────────────────────────────────────

const RecurringCreateInput = z.object({
  name:           z.string().min(1).max(100),
  amount:         z.number().positive(),                         // INR
  type:           z.enum(['income', 'expense', 'investment', 'transfer']),
  frequency:      z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'halfyearly', 'yearly']),
  instrumentType: z.enum(['emi', 'sip', 'rd', 'insurance_premium', 'subscription', 'rent', 'salary', 'ppf', 'nps', 'other']).default('other'),
  startDate:      z.string(),                                    // ISO date string
  endDate:        z.string().optional(),
  dueDayOfMonth:  z.number().min(1).max(31).optional(),
  categoryId:     z.string().optional(),
  accountId:      z.string().optional(),
  description:    z.string().max(200).optional(),
  autoGenerateTxn: z.boolean().default(true),
  // EMI-specific
  loanPrincipal:     z.number().positive().optional(),
  loanInterestRate:  z.number().min(0).max(100).optional(),
  loanTenureMonths:  z.number().positive().int().optional(),
  loanOutstanding:   z.number().positive().optional(),
  // SIP-specific
  sipFundName:       z.string().max(100).optional(),
  sipFolioNumber:    z.string().max(50).optional(),
  sipExpectedReturn: z.number().min(0).max(100).optional(),
})

// ─── ROUTER ───────────────────────────────────────────────────────────────────

export const recurringRouter = createTRPCRouter({

  /** List all recurring rules for the current user */
  list: protectedProcedure.query(async ({ ctx }) => {
    const rules = await ctx.db.recurringRule.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { nextDueDate: 'asc' },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        account:  { select: { id: true, name: true, icon: true } },
      },
    })
    return rules
  }),

  /** Create a new recurring rule */
  create: protectedProcedure
    .input(RecurringCreateInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const startDate = new Date(input.startDate)
      const nextDueDate = computeNextDueDate(startDate, input.frequency, input.dueDayOfMonth)

      return ctx.db.recurringRule.create({
        data: {
          userId,
          name:           input.name,
          amount:         BigInt(Math.round(input.amount * 100)),
          type:           input.type,
          frequency:      input.frequency,
          instrumentType: input.instrumentType,
          startDate,
          endDate:        input.endDate ? new Date(input.endDate) : null,
          dueDayOfMonth:  input.dueDayOfMonth ?? null,
          nextDueDate,
          categoryId:     input.categoryId ?? null,
          accountId:      input.accountId ?? null,
          description:    input.description ?? null,
          autoGenerateTxn: input.autoGenerateTxn,
          // EMI fields
          loanPrincipal:    input.loanPrincipal    ? BigInt(Math.round(input.loanPrincipal * 100))    : null,
          loanInterestRate: input.loanInterestRate ?? null,
          loanTenureMonths: input.loanTenureMonths ?? null,
          loanOutstanding:  input.loanOutstanding  ? BigInt(Math.round(input.loanOutstanding * 100))  : null,
          // SIP fields
          sipFundName:       input.sipFundName       ?? null,
          sipFolioNumber:    input.sipFolioNumber    ?? null,
          sipExpectedReturn: input.sipExpectedReturn ?? null,
        },
      })
    }),

  /** Update a recurring rule */
  update: protectedProcedure
    .input(z.object({ id: z.string() }).merge(RecurringCreateInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input

      const existing = await ctx.db.recurringRule.findUnique({ where: { id } })
      if (!existing || existing.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const startDate = fields.startDate ? new Date(fields.startDate) : existing.startDate
      const frequency = fields.frequency ?? existing.frequency
      const dueDayOfMonth = fields.dueDayOfMonth ?? existing.dueDayOfMonth
      const nextDueDate = computeNextDueDate(startDate, frequency, dueDayOfMonth)

      return ctx.db.recurringRule.update({
        where: { id },
        data: {
          ...(fields.name            !== undefined && { name: fields.name }),
          ...(fields.amount          !== undefined && { amount: BigInt(Math.round(fields.amount * 100)) }),
          ...(fields.type            !== undefined && { type: fields.type }),
          ...(fields.frequency       !== undefined && { frequency: fields.frequency }),
          ...(fields.instrumentType  !== undefined && { instrumentType: fields.instrumentType }),
          ...(fields.startDate       !== undefined && { startDate }),
          ...(fields.endDate         !== undefined && { endDate: fields.endDate ? new Date(fields.endDate) : null }),
          ...(fields.dueDayOfMonth   !== undefined && { dueDayOfMonth: fields.dueDayOfMonth }),
          ...(fields.categoryId      !== undefined && { categoryId: fields.categoryId }),
          ...(fields.accountId       !== undefined && { accountId: fields.accountId }),
          ...(fields.description     !== undefined && { description: fields.description }),
          ...(fields.autoGenerateTxn !== undefined && { autoGenerateTxn: fields.autoGenerateTxn }),
          ...(fields.loanPrincipal   !== undefined && { loanPrincipal: fields.loanPrincipal ? BigInt(Math.round(fields.loanPrincipal * 100)) : null }),
          ...(fields.loanInterestRate !== undefined && { loanInterestRate: fields.loanInterestRate }),
          ...(fields.loanTenureMonths !== undefined && { loanTenureMonths: fields.loanTenureMonths }),
          ...(fields.loanOutstanding  !== undefined && { loanOutstanding: fields.loanOutstanding ? BigInt(Math.round(fields.loanOutstanding * 100)) : null }),
          ...(fields.sipFundName      !== undefined && { sipFundName: fields.sipFundName }),
          ...(fields.sipFolioNumber   !== undefined && { sipFolioNumber: fields.sipFolioNumber }),
          ...(fields.sipExpectedReturn !== undefined && { sipExpectedReturn: fields.sipExpectedReturn }),
          nextDueDate,
        },
      })
    }),

  /** Toggle isActive (pause / resume) */
  toggle: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.db.recurringRule.findUnique({ where: { id: input.id } })
      if (!rule || rule.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      return ctx.db.recurringRule.update({
        where: { id: input.id },
        data: { isActive: !rule.isActive },
        select: { id: true, isActive: true },
      })
    }),

  /** Delete a recurring rule */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.db.recurringRule.findUnique({ where: { id: input.id } })
      if (!rule || rule.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      await ctx.db.recurringRule.delete({ where: { id: input.id } })
      return { deleted: true }
    }),
})
