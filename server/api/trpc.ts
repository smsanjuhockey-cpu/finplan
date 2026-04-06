/**
 * tRPC initialization for FinPlan.
 * Defines the base router, procedure, and auth middleware.
 */
import { initTRPC, TRPCError } from '@trpc/server'
import { type NextRequest } from 'next/server'
import superjson from 'superjson'
import { z } from 'zod'
import { db } from '@/server/db/client'
import { auth } from '@/server/auth/config'

// ─── CONTEXT ─────────────────────────────────────────────────────────────────

export async function createTRPCContext(opts: { req: NextRequest }) {
  const session = await auth()
  return {
    db,
    session,
    req: opts.req,
  }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>

// ─── tRPC INIT ───────────────────────────────────────────────────────────────

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof z.ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────

/** Middleware: requires authenticated session */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  })
})

/** Middleware: requires admin role */
const enforceUserIsAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  if (ctx.session.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  })
})

// ─── ROUTERS & PROCEDURES ────────────────────────────────────────────────────

/** Base router */
export const createTRPCRouter = t.router

/** Public procedure — no auth required */
export const publicProcedure = t.procedure

/** Protected procedure — requires authenticated user */
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed)

/** Admin procedure — requires admin role */
export const adminProcedure = t.procedure.use(enforceUserIsAdmin)
