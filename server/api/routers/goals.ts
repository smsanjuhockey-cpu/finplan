import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const goalsRouter = createTRPCRouter({

  /** List all goals for the user */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.goal.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: [{ status: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
      include: {
        linkedSipRule: { select: { id: true, name: true, amount: true, frequency: true } },
        _count: { select: { contributions: true } },
      },
    })
  }),

  /** Create a goal */
  create: protectedProcedure
    .input(z.object({
      name:               z.string().min(1).max(100),
      description:        z.string().max(500).optional(),
      category:           z.enum(['emergency_fund','home_purchase','vehicle','vacation','education','wedding','retirement','children_education','custom']).default('custom'),
      targetAmount:       z.number().positive(),
      currentAmount:      z.number().min(0).default(0),
      targetDate:         z.string().optional(),
      priority:           z.enum(['high', 'medium', 'low']).default('medium'),
      linkedSipRuleId:    z.string().optional(),
      expectedReturnRate: z.number().min(0).max(100).optional(),
      icon:               z.string().optional(),
      color:              z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.goal.create({
        data: {
          userId:             ctx.session.user.id,
          name:               input.name,
          description:        input.description ?? null,
          category:           input.category,
          targetAmount:       BigInt(Math.round(input.targetAmount * 100)),
          currentAmount:      BigInt(Math.round(input.currentAmount * 100)),
          targetDate:         input.targetDate ? new Date(input.targetDate) : null,
          priority:           input.priority,
          linkedSipRuleId:    input.linkedSipRuleId ?? null,
          expectedReturnRate: input.expectedReturnRate ?? null,
          icon:               input.icon ?? null,
          color:              input.color ?? null,
          status:             'active',
        },
      })
    }),

  /** Update a goal */
  update: protectedProcedure
    .input(z.object({
      id:                 z.string(),
      name:               z.string().min(1).max(100).optional(),
      description:        z.string().max(500).optional(),
      targetAmount:       z.number().positive().optional(),
      targetDate:         z.string().nullable().optional(),
      priority:           z.enum(['high', 'medium', 'low']).optional(),
      status:             z.enum(['active', 'paused', 'completed', 'abandoned']).optional(),
      linkedSipRuleId:    z.string().nullable().optional(),
      expectedReturnRate: z.number().min(0).max(100).nullable().optional(),
      icon:               z.string().optional(),
      color:              z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input
      const goal = await ctx.db.goal.findUnique({ where: { id } })
      if (!goal || goal.userId !== ctx.session.user.id) throw new TRPCError({ code: 'NOT_FOUND' })

      return ctx.db.goal.update({
        where: { id },
        data: {
          ...(fields.name               !== undefined && { name: fields.name }),
          ...(fields.description        !== undefined && { description: fields.description }),
          ...(fields.targetAmount       !== undefined && { targetAmount: BigInt(Math.round(fields.targetAmount * 100)) }),
          ...(fields.targetDate         !== undefined && { targetDate: fields.targetDate ? new Date(fields.targetDate) : null }),
          ...(fields.priority           !== undefined && { priority: fields.priority }),
          ...(fields.status             !== undefined && { status: fields.status, completedAt: fields.status === 'completed' ? new Date() : null }),
          ...(fields.linkedSipRuleId    !== undefined && { linkedSipRuleId: fields.linkedSipRuleId }),
          ...(fields.expectedReturnRate !== undefined && { expectedReturnRate: fields.expectedReturnRate }),
          ...(fields.icon               !== undefined && { icon: fields.icon }),
          ...(fields.color              !== undefined && { color: fields.color }),
        },
      })
    }),

  /** Add a contribution to a goal */
  addContribution: protectedProcedure
    .input(z.object({
      goalId:        z.string(),
      amount:        z.number().positive(),
      note:          z.string().max(200).optional(),
      contributedAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const goal = await ctx.db.goal.findUnique({ where: { id: input.goalId } })
      if (!goal || goal.userId !== ctx.session.user.id) throw new TRPCError({ code: 'NOT_FOUND' })

      const amountPaise = BigInt(Math.round(input.amount * 100))
      const newAmount = goal.currentAmount + amountPaise

      const [contribution] = await ctx.db.$transaction([
        ctx.db.goalContribution.create({
          data: {
            goalId:        input.goalId,
            amount:        amountPaise,
            note:          input.note ?? null,
            contributedAt: input.contributedAt ? new Date(input.contributedAt) : new Date(),
          },
        }),
        ctx.db.goal.update({
          where: { id: input.goalId },
          data: {
            currentAmount: newAmount,
            ...(newAmount >= goal.targetAmount && { status: 'completed', completedAt: new Date() }),
          },
        }),
      ])

      return contribution
    }),

  /** Delete a goal */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const goal = await ctx.db.goal.findUnique({ where: { id: input.id } })
      if (!goal || goal.userId !== ctx.session.user.id) throw new TRPCError({ code: 'NOT_FOUND' })
      await ctx.db.goal.delete({ where: { id: input.id } })
      return { deleted: true }
    }),

  /** Get contributions for a goal */
  getContributions: protectedProcedure
    .input(z.object({ goalId: z.string() }))
    .query(async ({ ctx, input }) => {
      const goal = await ctx.db.goal.findUnique({ where: { id: input.goalId } })
      if (!goal || goal.userId !== ctx.session.user.id) throw new TRPCError({ code: 'NOT_FOUND' })
      return ctx.db.goalContribution.findMany({
        where: { goalId: input.goalId },
        orderBy: { contributedAt: 'desc' },
        take: 20,
      })
    }),
})
