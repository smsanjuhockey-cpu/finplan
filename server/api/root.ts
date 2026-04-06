/**
 * tRPC root router — wires all sub-routers together.
 * This is the single API contract the frontend consumes.
 */
import { createTRPCRouter } from './trpc'
import { userRouter } from './routers/user'
import { accountsRouter } from './routers/accounts'
import { transactionsRouter } from './routers/transactions'
import { categoriesRouter } from './routers/categories'
import { budgetsRouter } from './routers/budgets'
import { goalsRouter } from './routers/goals'
import { assetsRouter } from './routers/assets'
import { liabilitiesRouter } from './routers/liabilities'
import { debtRouter } from './routers/debt'
import { recurringRouter } from './routers/recurring'
import { netWorthRouter } from './routers/networth'
import { taxRouter } from './routers/tax'
import { forecastRouter } from './routers/forecast'
import { aiRouter } from './routers/ai'
import { healthScoreRouter } from './routers/healthScore'
import { lifeEventsRouter } from './routers/lifeEvents'
import { adminRouter } from './routers/admin'

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  user: userRouter,
  accounts: accountsRouter,
  transactions: transactionsRouter,
  categories: categoriesRouter,
  budgets: budgetsRouter,
  goals: goalsRouter,
  assets: assetsRouter,
  liabilities: liabilitiesRouter,
  debt: debtRouter,
  recurring: recurringRouter,
  netWorth: netWorthRouter,
  tax: taxRouter,
  forecast: forecastRouter,
  ai: aiRouter,
  healthScore: healthScoreRouter,
  lifeEvents: lifeEventsRouter,
})

export type AppRouter = typeof appRouter
