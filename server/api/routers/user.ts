/**
 * User router — profile, onboarding, registration
 */
import { TRPCError } from '@trpc/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc'

export const userRouter = createTRPCRouter({
  /** Register a new user with email + password */
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
      })
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An account with this email already exists.',
        })
      }

      const hashedPassword = await bcrypt.hash(input.password, 12)

      const user = await ctx.db.user.create({
        data: {
          name: input.name,
          email: input.email,
          hashedPassword,
        },
        select: { id: true, email: true, name: true },
      })

      return user
    }),

  /** Get the current user's profile */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        annualIncome: true,
        employmentType: true,
        taxRegime: true,
        onboardingCompleted: true,
        createdAt: true,
      },
    })
    if (!user) throw new TRPCError({ code: 'NOT_FOUND' })
    return user
  }),

  /** Update user profile */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        annualIncome: z.number().positive().optional(), // in INR, converted to paise in mutation
        employmentType: z
          .enum(['salaried', 'self_employed', 'freelancer', 'business_owner', 'retired', 'student'])
          .optional(),
        taxRegime: z.enum(['old', 'new']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = {}
      if (input.name) data.name = input.name
      if (input.employmentType) data.employmentType = input.employmentType
      if (input.taxRegime) data.taxRegime = input.taxRegime
      if (input.annualIncome !== undefined) {
        data.annualIncome = BigInt(Math.round(input.annualIncome * 100)) // convert to paise
      }

      const updated = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data,
        select: { id: true, name: true, annualIncome: true, employmentType: true, taxRegime: true },
      })

      // Auto-complete onboarding if all key fields are now filled
      if (updated.annualIncome && updated.employmentType && updated.taxRegime) {
        await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: { onboardingCompleted: true },
        })
      }

      return updated
    }),

  /** Change password */
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { hashedPassword: true },
      })
      if (!user?.hashedPassword) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No password set on this account' })
      const valid = await bcrypt.compare(input.currentPassword, user.hashedPassword)
      if (!valid) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Current password is incorrect' })
      const hashed = await bcrypt.hash(input.newPassword, 12)
      await ctx.db.user.update({ where: { id: ctx.session.user.id }, data: { hashedPassword: hashed } })
      return { success: true }
    }),

  /** Mark onboarding as complete, optionally saving profile data */
  completeOnboarding: protectedProcedure
    .input(z.object({
      annualIncome: z.number().min(0).optional(),
      employmentType: z.enum(['salaried', 'self_employed', 'freelancer', 'student', 'retired']).optional(),
      taxRegime: z.enum(['old', 'new']).optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          onboardingCompleted: true,
          ...(input?.annualIncome !== undefined && {
            annualIncome: BigInt(Math.round(input.annualIncome * 100)),
          }),
          ...(input?.employmentType && { employmentType: input.employmentType }),
          ...(input?.taxRegime && { taxRegime: input.taxRegime }),
        },
        select: { id: true, onboardingCompleted: true },
      })
    }),
})
