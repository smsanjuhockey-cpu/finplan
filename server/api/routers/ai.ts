import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function buildFinancialContext(db: typeof import('@/server/db/client').db, userId: string): Promise<string> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

  const [summary, accounts, goals, liabilities, assets, healthScore, user, recurringRules, recentExpenses] = await Promise.all([
    db.transaction.aggregate({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    db.account.findMany({ where: { userId, isActive: true }, select: { name: true, accountType: true, currentBalance: true } }),
    db.goal.findMany({ where: { userId, status: 'active' }, select: { name: true, targetAmount: true, currentAmount: true, targetDate: true, priority: true } }),
    db.liability.findMany({ where: { userId, isActive: true }, select: { name: true, liabilityType: true, outstandingAmount: true, interestRate: true, emiAmount: true } }),
    db.asset.findMany({ where: { userId }, select: { name: true, assetType: true, currentValue: true } }),
    db.financialHealthScore.findFirst({ where: { userId }, orderBy: { scoreDate: 'desc' } }),
    db.user.findUnique({ where: { id: userId }, select: { name: true, annualIncome: true, employmentType: true, taxRegime: true } }),
    db.recurringRule.findMany({ where: { userId, isActive: true }, select: { name: true, amount: true, type: true, frequency: true } }),
    db.transaction.groupBy({
      by: ['category'],
      where: { userId, type: 'expense', date: { gte: threeMonthsAgo } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    }),
  ])

  const incomeAgg = await db.transaction.aggregate({ where: { userId, type: 'income', date: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } })
  const expenseAgg = await db.transaction.aggregate({ where: { userId, type: 'expense', date: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } })
  const investAgg = await db.transaction.aggregate({ where: { userId, type: 'investment', date: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } })

  const totalBalance = accounts.reduce((s, a) => s + a.currentBalance, 0n)
  const totalAssets  = assets.reduce((s, a) => s + a.currentValue, 0n)
  const totalDebt    = liabilities.reduce((s, l) => s + l.outstandingAmount, 0n)
  const totalEmi     = liabilities.reduce((s, l) => s + (l.emiAmount ?? 0n), 0n)
  const monthlyIncome = incomeAgg._sum.amount ?? 0n
  const monthlyExpenses = expenseAgg._sum.amount ?? 0n
  const monthlyInvest = investAgg._sum.amount ?? 0n
  const monthlySavings = monthlyIncome - monthlyExpenses - monthlyInvest
  const netWorth = totalAssets - totalDebt

  const paise = (n: bigint) => `₹${(Number(n) / 100).toLocaleString('en-IN')}`
  const pct = (n: bigint, d: bigint) => d > 0n ? ((Number(n) / Number(d)) * 100).toFixed(1) + '%' : 'N/A'

  const emiToIncomeRatio = monthlyIncome > 0n && totalEmi > 0n
    ? ((Number(totalEmi) / Number(monthlyIncome)) * 100).toFixed(1)
    : '0'

  const savingsRate = monthlyIncome > 0n
    ? ((Number(monthlySavings) / Number(monthlyIncome)) * 100).toFixed(1)
    : '0'

  const monthsOfExpenseCovered = monthlyExpenses > 0n && totalAssets > 0n
    ? (Number(totalAssets) / Number(monthlyExpenses)).toFixed(1)
    : '0'

  return `
=== CLIENT FINANCIAL PROFILE ===
Client Name: ${user?.name ?? 'Client'}
Employment: ${user?.employmentType ?? 'unknown'} | Tax Regime: ${user?.taxRegime ?? 'unknown'} | Annual Income (declared): ${user?.annualIncome ? paise(user.annualIncome) : 'not set'}

=== THIS MONTH CASHFLOW (${now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}) ===
Income:    ${paise(monthlyIncome)}
Expenses:  ${paise(monthlyExpenses)}
Invested:  ${paise(monthlyInvest)}
Saved:     ${paise(monthlySavings)} (savings rate: ${savingsRate}%)
Surplus available for advice: ${paise(monthlySavings > 0n ? monthlySavings : 0n)}

=== BALANCE SHEET ===
Total Bank Balance: ${paise(totalBalance)} across ${accounts.length} accounts
${accounts.map(a => `  - ${a.name} (${a.accountType}): ${paise(a.currentBalance)}`).join('\n')}

Total Assets: ${paise(totalAssets)}
${assets.length > 0 ? assets.map(a => `  - ${a.name} (${a.assetType}): ${paise(a.currentValue)}`).join('\n') : '  - No assets recorded'}

Total Debt: ${paise(totalDebt)}
${liabilities.length > 0 ? liabilities.map(l => `  - ${l.name} (${l.liabilityType}): outstanding ${paise(l.outstandingAmount)} @ ${Number(l.interestRate)}% | EMI: ${l.emiAmount ? paise(l.emiAmount) : 'unknown'}`).join('\n') : '  - No active loans'}

Net Worth: ${paise(netWorth)}
EMI-to-Income Ratio: ${emiToIncomeRatio}% ${Number(emiToIncomeRatio) > 40 ? '(CRITICAL - exceeds 40% safe limit)' : Number(emiToIncomeRatio) > 30 ? '(WARNING - high, target <30%)' : '(healthy)'}
Emergency Fund Coverage: ${monthsOfExpenseCovered} months of expenses ${Number(monthsOfExpenseCovered) < 3 ? '(CRITICAL - below 3 months)' : Number(monthsOfExpenseCovered) < 6 ? '(needs improvement - target 6 months)' : '(healthy)'}

=== ACTIVE GOALS ===
${goals.length > 0 ? goals.map(g => {
  const pct = g.targetAmount > 0n ? ((Number(g.currentAmount) / Number(g.targetAmount)) * 100).toFixed(0) : '0'
  const remaining = g.targetAmount - g.currentAmount
  return `  - ${g.name} [${g.priority ?? 'medium'} priority]: ${paise(g.currentAmount)}/${paise(g.targetAmount)} (${pct}% funded, need ${paise(remaining > 0n ? remaining : 0n)} more)${g.targetDate ? ' | deadline: ' + new Date(g.targetDate).toLocaleDateString('en-IN') : ''}`
}).join('\n') : '  - No active goals'}

=== RECURRING COMMITMENTS ===
${recurringRules.length > 0 ? recurringRules.map(r => `  - ${r.name}: ${paise(r.amount)} ${r.frequency} (${r.type})`).join('\n') : '  - No recurring rules set'}

=== TOP SPENDING CATEGORIES (last 3 months) ===
${recentExpenses.length > 0 ? recentExpenses.map(e => `  - ${e.category ?? 'Uncategorised'}: ${paise(e._sum.amount ?? 0n)}`).join('\n') : '  - No expense data'}

=== FINANCIAL HEALTH SCORE ===
${healthScore ? `Overall: ${healthScore.overallScore}/100
  - Savings Rate: ${healthScore.savingsRate}/100
  - Debt-to-Income: ${healthScore.debtToIncome}/100
  - Emergency Fund: ${healthScore.emergencyFund}/100
  - Budget Adherence: ${healthScore.budgetAdherence}/100
  - Goal Progress: ${healthScore.goalProgress}/100
  - Net Worth Growth: ${healthScore.netWorthGrowth}/100` : 'Score not yet computed'}
`.trim()
}

export const aiRouter = createTRPCRouter({

  /** Send a message and get a response (non-streaming) */
  chat: protectedProcedure
    .input(z.object({
      message:   z.string().min(1).max(2000),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Anthropic API key not configured' })
      }

      const userId = ctx.session.user.id

      // Save user message
      await ctx.db.aiChatMessage.create({
        data: { userId, sessionId: input.sessionId, role: 'user', content: input.message },
      })

      // Fetch conversation history (last 20 messages)
      const history = await ctx.db.aiChatMessage.findMany({
        where: { userId, sessionId: input.sessionId },
        orderBy: { createdAt: 'asc' },
        take: 20,
      })

      const financialContext = await buildFinancialContext(ctx.db, userId)

      const messages: Anthropic.MessageParam[] = history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: `You are a Senior Personal Financial Advisor at FinPlan, specialising in Indian personal finance. You have 15+ years of experience helping Indian salaried professionals, business owners, and self-employed individuals build wealth, eliminate debt, and achieve their financial goals.

You are NOT a generic chatbot. You are this client's dedicated advisor who has full visibility into their financial life. Every response must reference the client's actual numbers — never give generic advice.

${financialContext}

=== YOUR ADVISORY MANDATE ===

1. ALWAYS use the client's real data above. Mention specific rupee amounts, ratios, and scores.
2. PROACTIVELY flag issues even if not asked — e.g., if EMI ratio is high, mention it. If emergency fund is thin, warn them.
3. Give SPECIFIC, ACTIONABLE advice: not "invest in SIPs" but "given your ₹X monthly surplus, a ₹Y SIP in a Flexi-cap fund + ₹Z in a debt fund gives you the right equity/debt split for your risk profile."
4. Use Indian financial instruments correctly: SIP, ELSS, PPF, NPS Tier I/II, SGBs, REITs, FD laddering, RD, term insurance, health insurance.
5. For tax questions, always reference their declared regime (old/new) and give precise 80C/80D/HRA/NPS deduction calculations.
6. Structure long responses with clear headings. Use ₹ amounts in Indian numbering (1,00,000 not 100,000).
7. If the client's data shows a red flag (e.g., negative savings, EMI > 40%, no emergency fund, goals far behind), open with that concern before answering the question.
8. End advice with ONE clear "Your next action" step — something they can do this week.
9. Keep responses concise but complete. No filler. No disclaimers like "consult a professional" — you ARE the professional.
10. If asked something completely unrelated to finance, politely redirect.

Tone: Direct, confident, warm. Like a trusted advisor who knows your numbers and genuinely cares about your financial wellbeing.`,
        messages,
      })

      const assistantContent = response.content[0]?.type === 'text' ? response.content[0].text : 'Sorry, I could not generate a response.'

      // Save assistant response
      await ctx.db.aiChatMessage.create({
        data: {
          userId,
          sessionId: input.sessionId,
          role: 'assistant',
          content: assistantContent,
          tokenCount: response.usage.output_tokens,
          modelUsed: response.model,
        },
      })

      return { content: assistantContent }
    }),

  /** Get chat history for a session */
  getHistory: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.aiChatMessage.findMany({
        where: { userId: ctx.session.user.id, sessionId: input.sessionId },
        orderBy: { createdAt: 'asc' },
      })
    }),

  /** List sessions (most recent first) */
  listSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await ctx.db.aiChatMessage.groupBy({
      by: ['sessionId'],
      where: { userId: ctx.session.user.id },
      _max: { createdAt: true },
      _count: { id: true },
      orderBy: { _max: { createdAt: 'desc' } },
      take: 20,
    })
    const previews = await Promise.all(sessions.map(async s => {
      const first = await ctx.db.aiChatMessage.findFirst({
        where: { userId: ctx.session.user.id, sessionId: s.sessionId, role: 'user' },
        orderBy: { createdAt: 'asc' },
        select: { content: true },
      })
      return { sessionId: s.sessionId, preview: first?.content?.slice(0, 60) ?? 'Chat', lastAt: s._max.createdAt, messageCount: s._count.id }
    }))
    return previews
  }),

  /** Get financial snapshot for personalized prompts */
  getSnapshot: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    // Use last 3 months average for expenses (more stable than 1 month)
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

    const [incomeAgg, expenseAgg, expense3mAgg, liabilities, assets, accounts, goals, healthScore, user] = await Promise.all([
      ctx.db.transaction.aggregate({ where: { userId, type: 'income', date: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
      ctx.db.transaction.aggregate({ where: { userId, type: 'expense', date: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
      ctx.db.transaction.aggregate({ where: { userId, type: 'expense', date: { gte: threeMonthsAgo } }, _sum: { amount: true } }),
      ctx.db.liability.aggregate({ where: { userId, isActive: true }, _sum: { outstandingAmount: true, emiAmount: true } }),
      ctx.db.asset.aggregate({ where: { userId }, _sum: { currentValue: true } }),
      // Liquid bank balance = sum of all active accounts
      ctx.db.account.aggregate({ where: { userId, isActive: true }, _sum: { currentBalance: true } }),
      ctx.db.goal.count({ where: { userId, status: 'active' } }),
      ctx.db.financialHealthScore.findFirst({ where: { userId }, orderBy: { scoreDate: 'desc' }, select: { overallScore: true } }),
      ctx.db.user.findUnique({ where: { id: userId }, select: { name: true, taxRegime: true } }),
    ])

    const income = incomeAgg._sum.amount ?? 0n
    const expenses = expenseAgg._sum.amount ?? 0n
    const totalDebt = liabilities._sum.outstandingAmount ?? 0n
    const totalEmi = liabilities._sum.emiAmount ?? 0n
    const totalAssets = assets._sum.currentValue ?? 0n
    const liquidBalance = accounts._sum.currentBalance ?? 0n
    const savings = income - expenses
    const savingsRate = income > 0n ? Number(savings * 100n / income) : 0

    // Emergency fund = liquid bank balance / avg monthly expenses (3-month average)
    const avgMonthlyExpenses = (expense3mAgg._sum.amount ?? 0n) / 3n
    const monthsEmergencyFund = avgMonthlyExpenses > 0n && liquidBalance > 0n
      ? Number(liquidBalance) / Number(avgMonthlyExpenses)
      : 0

    return {
      name: user?.name,
      taxRegime: user?.taxRegime,
      income,
      expenses,
      savings,
      savingsRate,
      totalDebt,
      totalEmi,
      totalAssets,
      liquidBalance,
      netWorth: totalAssets - totalDebt,
      activeGoals: goals,
      healthScore: healthScore?.overallScore ?? null,
      emiToIncomeRatio: income > 0n && totalEmi > 0n ? Number(totalEmi * 100n / income) : 0,
      monthsEmergencyFund,
    }
  }),

  /** Clear / delete a session */
  clearSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.aiChatMessage.deleteMany({ where: { userId: ctx.session.user.id, sessionId: input.sessionId } })
      return { cleared: true }
    }),
})
