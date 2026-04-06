import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const lifeEventsRouter = createTRPCRouter({

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.lifeEvent.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { estimatedDate: 'asc' },
    })
  }),

  create: protectedProcedure
    .input(z.object({
      type:            z.enum(['baby_arriving','maternity_leave','job_change','salary_increment','bonus_received','marriage','home_purchase','parent_support','medical_emergency','other']),
      name:            z.string().min(1).max(100),
      estimatedDate:   z.string(),
      financialImpact: z.number().optional(), // monthly INR, positive = income, negative = expense
      oneTimeCost:     z.number().min(0).optional(),
      notes:           z.string().max(300).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.lifeEvent.create({
        data: {
          userId:          ctx.session.user.id,
          type:            input.type,
          name:            input.name,
          estimatedDate:   new Date(input.estimatedDate),
          financialImpact: input.financialImpact !== undefined ? BigInt(Math.round(input.financialImpact * 100)) : null,
          oneTimeCost:     input.oneTimeCost     !== undefined ? BigInt(Math.round(input.oneTimeCost * 100))     : null,
          notes:           input.notes ?? null,
        },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id:              z.string(),
      name:            z.string().min(1).max(100).optional(),
      estimatedDate:   z.string().optional(),
      financialImpact: z.number().optional(),
      oneTimeCost:     z.number().min(0).optional(),
      notes:           z.string().max(300).optional(),
      isActive:        z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.lifeEvent.findUnique({ where: { id: input.id } })
      if (!event || event.userId !== ctx.session.user.id) throw new TRPCError({ code: 'NOT_FOUND' })
      return ctx.db.lifeEvent.update({
        where: { id: input.id },
        data: {
          ...(input.name          !== undefined && { name: input.name }),
          ...(input.estimatedDate !== undefined && { estimatedDate: new Date(input.estimatedDate) }),
          ...(input.financialImpact !== undefined && { financialImpact: BigInt(Math.round(input.financialImpact * 100)) }),
          ...(input.oneTimeCost   !== undefined && { oneTimeCost: BigInt(Math.round(input.oneTimeCost * 100)) }),
          ...(input.notes         !== undefined && { notes: input.notes }),
          ...(input.isActive      !== undefined && { isActive: input.isActive }),
        },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.lifeEvent.findUnique({ where: { id: input.id } })
      if (!event || event.userId !== ctx.session.user.id) throw new TRPCError({ code: 'NOT_FOUND' })
      await ctx.db.lifeEvent.delete({ where: { id: input.id } })
      return { deleted: true }
    }),
})
