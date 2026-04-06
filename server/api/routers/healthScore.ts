import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const healthScoreRouter = createTRPCRouter({

  /** Compute and persist health score for today */
  compute: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Gather all data in parallel
    const [income, expenses, investments, liabilities, goals, assets, lastBudget] = await Promise.all([
      ctx.db.transaction.aggregate({
        where: { userId, type: 'income', date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      ctx.db.transaction.aggregate({
        where: { userId, type: 'expense', date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      ctx.db.transaction.aggregate({
        where: { userId, type: 'investment', date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      ctx.db.liability.findMany({
        where: { userId, isActive: true },
        select: { outstandingAmount: true, emiAmount: true },
      }),
      ctx.db.goal.findMany({
        where: { userId, status: 'active' },
        select: { targetAmount: true, currentAmount: true },
      }),
      ctx.db.asset.aggregate({ where: { userId }, _sum: { currentValue: true } }),
      ctx.db.budget.findFirst({
        where: { userId, isActive: true, startDate: { lte: monthEnd }, endDate: { gte: monthStart } },
        include: { categories: { select: { allocatedAmount: true } } },
      }),
    ])

    const monthlyIncome   = income._sum.amount   ?? 0n
    const monthlyExpenses = expenses._sum.amount ?? 0n
    const monthlyInvest   = investments._sum.amount ?? 0n
    const monthlySavings  = monthlyIncome - monthlyExpenses - monthlyInvest

    const totalDebt    = liabilities.reduce((s, l) => s + l.outstandingAmount, 0n)
    const totalEmi     = liabilities.reduce((s, l) => s + (l.emiAmount ?? 0n), 0n)
    const totalAssets  = assets._sum.currentValue ?? 0n

    // ── Component scores (each 0-100) ─────────────────────────────────────────

    // 1. Savings Rate (target ≥ 20%)
    let savingsScore = 50
    if (monthlyIncome > 0n) {
      const rate = Number(monthlySavings * 100n) / Number(monthlyIncome)
      if (rate >= 30) savingsScore = 100
      else if (rate >= 20) savingsScore = 85
      else if (rate >= 10) savingsScore = 65
      else if (rate >= 0)  savingsScore = 40
      else savingsScore = 10
    }

    // 2. Debt-to-Income (EMI / income < 30% = healthy)
    let debtToIncomeScore = 100
    if (monthlyIncome > 0n && totalEmi > 0n) {
      const ratio = Number(totalEmi) / Number(monthlyIncome)
      if (ratio < 0.2)      debtToIncomeScore = 100
      else if (ratio < 0.3) debtToIncomeScore = 80
      else if (ratio < 0.4) debtToIncomeScore = 55
      else if (ratio < 0.5) debtToIncomeScore = 35
      else                  debtToIncomeScore = 15
    }

    // 3. Emergency Fund (3-6 months expenses in liquid assets)
    let emergencyFundScore = 0
    if (monthlyExpenses > 0n && totalAssets > 0n) {
      const monthsCovered = Number(totalAssets) / Number(monthlyExpenses)
      if (monthsCovered >= 6)      emergencyFundScore = 100
      else if (monthsCovered >= 3) emergencyFundScore = 75
      else if (monthsCovered >= 1) emergencyFundScore = 40
      else emergencyFundScore = 15
    }

    // 4. Budget Adherence (did spending stay within budget?)
    let budgetScore = 70 // neutral if no budget
    if (lastBudget) {
      const totalAllocated = lastBudget.categories.reduce((s, c) => s + c.allocatedAmount, 0n)
      if (totalAllocated > 0n) {
        const adherence = 1 - (Number(monthlyExpenses > totalAllocated ? monthlyExpenses - totalAllocated : 0n) / Number(totalAllocated))
        budgetScore = Math.round(Math.max(0, Math.min(100, adherence * 100)))
      }
    }

    // 5. Goal Progress (average % funded across active goals)
    let goalScore = 50
    if (goals.length > 0) {
      const avgPct = goals.reduce((s, g) => s + (g.targetAmount > 0n ? Number(g.currentAmount * 100n) / Number(g.targetAmount) : 0), 0) / goals.length
      goalScore = Math.round(Math.min(100, avgPct))
    }

    // 6. Net Worth Growth (positive net worth = good)
    const netWorth = totalAssets - totalDebt
    let netWorthScore = 50
    if (netWorth > 0n) netWorthScore = Math.min(100, 50 + Math.round(Number(netWorth * 50n) / Math.max(1, Number(totalAssets))))
    else if (netWorth < 0n) netWorthScore = Math.max(0, 50 - Math.round(Math.abs(Number(netWorth)) / Math.max(1, Number(totalDebt)) * 50))

    // Weighted overall
    const overall = Math.round(
      savingsScore    * 0.25 +
      debtToIncomeScore * 0.20 +
      emergencyFundScore * 0.20 +
      budgetScore     * 0.15 +
      goalScore       * 0.10 +
      netWorthScore   * 0.10
    )

    const today = new Date(); today.setHours(0, 0, 0, 0)

    return ctx.db.financialHealthScore.upsert({
      where: { userId_scoreDate: { userId, scoreDate: today } },
      create: {
        userId, scoreDate: today, overallScore: overall,
        savingsRate: savingsScore, debtToIncome: debtToIncomeScore,
        emergencyFund: emergencyFundScore, budgetAdherence: budgetScore,
        goalProgress: goalScore, netWorthGrowth: netWorthScore,
        monthlyIncome, monthlyExpenses, monthlySavings,
      },
      update: {
        overallScore: overall,
        savingsRate: savingsScore, debtToIncome: debtToIncomeScore,
        emergencyFund: emergencyFundScore, budgetAdherence: budgetScore,
        goalProgress: goalScore, netWorthGrowth: netWorthScore,
        monthlyIncome, monthlyExpenses, monthlySavings,
      },
    })
  }),

  /** Latest saved score (or null) */
  getLatest: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.financialHealthScore.findFirst({
      where: { userId: ctx.session.user.id },
      orderBy: { scoreDate: 'desc' },
    })
  }),

  /** Score history for trend chart */
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(24).default(6) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.financialHealthScore.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { scoreDate: 'desc' },
        take: input.limit,
        select: { scoreDate: true, overallScore: true, savingsRate: true, debtToIncome: true, emergencyFund: true, budgetAdherence: true, goalProgress: true, netWorthGrowth: true },
      })
    }),
})
