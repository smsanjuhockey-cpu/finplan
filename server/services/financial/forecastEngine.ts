/**
 * Rule-based financial forecast engine.
 * Projects monthly income/expense/savings for the next N months
 * using recurring rules, life events, and historical averages.
 * Pure functions — no DB calls.
 */

export type ForecastInput = {
  monthlyIncome:   bigint   // average income from last 3 months
  monthlyExpenses: bigint   // average expenses from last 3 months
  recurringRules:  Array<{
    amount:         bigint
    type:           string   // 'income' | 'expense' | 'investment'
    frequency:      string
    isActive:       boolean
    startDate:      Date
    endDate?:       Date | null
  }>
  lifeEvents: Array<{
    estimatedDate:   Date
    financialImpact: bigint | null  // monthly change in paise (+ = income, - = expense)
    oneTimeCost:     bigint | null
    isActive:        boolean
  }>
  currentNetWorth: bigint
  months:          number   // how many months to project
}

export type ForecastMonth = {
  month:     number  // 1-12
  year:      number
  income:    bigint
  expenses:  bigint
  savings:   bigint
  netWorth:  bigint
  lifeEventImpacts: string[]
}

function monthlyEquivalent(amount: bigint, frequency: string): bigint {
  switch (frequency) {
    case 'daily':      return amount * 30n
    case 'weekly':     return amount * 4n
    case 'biweekly':   return amount * 2n
    case 'monthly':    return amount
    case 'quarterly':  return amount / 3n
    case 'halfyearly': return amount / 6n
    case 'yearly':     return amount / 12n
    default:           return amount
  }
}

export function runForecast(input: ForecastInput): ForecastMonth[] {
  const results: ForecastMonth[] = []
  let runningNetWorth = input.currentNetWorth

  // Compute base monthly amounts from recurring rules
  let baseIncome   = input.monthlyIncome
  let baseExpenses = input.monthlyExpenses

  const activeRules = input.recurringRules.filter(r => r.isActive)

  // Override base with recurring rules if available
  const recurringIncome   = activeRules.filter(r => r.type === 'income').reduce((s, r) => s + monthlyEquivalent(r.amount, r.frequency), 0n)
  const recurringExpenses = activeRules.filter(r => r.type === 'expense' || r.type === 'investment').reduce((s, r) => s + monthlyEquivalent(r.amount, r.frequency), 0n)

  // Use recurring if meaningful data exists, otherwise fall back to historical average
  if (recurringIncome > 0n) baseIncome = recurringIncome
  if (recurringExpenses > 0n) baseExpenses = recurringExpenses

  const now = new Date()

  for (let i = 0; i < input.months; i++) {
    const projDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const m = projDate.getMonth() + 1
    const y = projDate.getFullYear()

    let monthIncome   = baseIncome
    let monthExpenses = baseExpenses
    const impacts: string[] = []

    // Apply life events for this month
    for (const event of input.lifeEvents) {
      if (!event.isActive) continue
      const eventDate = new Date(event.estimatedDate)
      if (eventDate.getFullYear() === y && eventDate.getMonth() + 1 === m) {
        if (event.financialImpact) {
          if (event.financialImpact > 0n) monthIncome += event.financialImpact
          else monthExpenses -= event.financialImpact // negative = extra expense
          impacts.push(`Life event impact: ${event.financialImpact > 0n ? '+' : ''}${Number(event.financialImpact) / 100}/mo`)
        }
        if (event.oneTimeCost && event.oneTimeCost > 0n) {
          monthExpenses += event.oneTimeCost
          impacts.push(`One-time cost: ₹${Number(event.oneTimeCost) / 100}`)
        }
      }
      // Ongoing monthly impact after life event date
      if (event.financialImpact && eventDate <= projDate) {
        if (event.financialImpact > 0n) monthIncome += event.financialImpact
        else monthExpenses -= event.financialImpact
      }
    }

    const savings = monthIncome - monthExpenses
    runningNetWorth += savings

    results.push({ month: m, year: y, income: monthIncome, expenses: monthExpenses, savings, netWorth: runningNetWorth, lifeEventImpacts: impacts })
  }

  return results
}
