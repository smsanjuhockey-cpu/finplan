import { createTRPCRouter, protectedProcedure } from '../trpc'

export const categoriesRouter = createTRPCRouter({
  /** List all transaction categories (system + user-created) */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.transactionCategory.findMany({
      where: {
        OR: [
          { isSystem: true },
          { userId: ctx.session.user.id },
        ],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    })
  }),
})
