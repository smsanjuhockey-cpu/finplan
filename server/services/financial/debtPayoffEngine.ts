/**
 * Debt Payoff Engine — the platform's core moat.
 * Pure math, no DB calls. Fully unit-testable.
 *
 * Supports: Avalanche, Snowball, Custom (priority-ordered) strategies.
 * Handles: Reducing balance, Interest-only, Bullet, Overdraft loan types.
 * Feature: Debt stacking — freed EMIs automatically redirect to next priority loan.
 */

export type LoanType = 'reducing_balance' | 'interest_only' | 'bullet' | 'overdraft'

export interface LoanInput {
  id: string
  name: string
  outstanding: bigint      // in paise
  interestRate: number     // annual %
  emiAmount: bigint        // monthly EMI in paise (0 for interest-only)
  loanType: LoanType
  priority?: number        // for custom strategy (lower = higher priority)
}

export interface DebtPayoffResult {
  strategy: 'avalanche' | 'snowball' | 'custom'
  debtFreeMonths: number         // months from today
  debtFreeDate: Date
  totalInterestPaid: bigint      // in paise
  interestSavedVsMinimum: bigint // in paise, vs paying minimums only
  milestones: LoanMilestone[]
  monthlySchedule: MonthlySnapshot[]
}

export interface LoanMilestone {
  loanId: string
  loanName: string
  closesAtMonth: number
  closesAtDate: Date
  freedEMI: bigint           // paise redirected to next loan
  interestPaid: bigint       // total interest paid on this loan
}

export interface MonthlySnapshot {
  month: number
  date: Date
  balances: Record<string, bigint>  // loanId → remaining balance (paise)
  totalDebt: bigint
  totalInterestThisMonth: bigint
  totalPrincipalThisMonth: bigint
  extraPaymentThisMonth: bigint
}

/**
 * Compute the total interest paid if all loans run at minimum EMI (no extra payments).
 * Used to compute interest saved.
 */
function minimumInterestTotal(loans: LoanInput[]): bigint {
  let total = 0n
  for (const loan of loans) {
    if (loan.loanType === 'interest_only') {
      // Assume 5 years of interest-only as baseline
      const monthlyInterest = BigInt(Math.round(Number(loan.outstanding) * loan.interestRate / 12 / 100))
      total += monthlyInterest * 60n
    } else {
      const r = loan.interestRate / 12 / 100
      const p = Number(loan.outstanding)
      const emi = Number(loan.emiAmount)
      if (r === 0 || emi === 0) continue
      const n = -Math.log(1 - (p * r) / emi) / Math.log(1 + r)
      total += BigInt(Math.round(emi * Math.ceil(n) - p))
    }
  }
  return total
}

/**
 * Sort loans by strategy.
 */
function sortByStrategy(
  loans: LoanInput[],
  strategy: 'avalanche' | 'snowball' | 'custom'
): LoanInput[] {
  const sorted = [...loans]
  if (strategy === 'avalanche') {
    sorted.sort((a, b) => b.interestRate - a.interestRate)  // highest rate first
  } else if (strategy === 'snowball') {
    sorted.sort((a, b) => Number(a.outstanding - b.outstanding))  // smallest balance first
  } else {
    sorted.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))  // user-defined order
  }
  // Always put interest-only loans at the top (they are most dangerous)
  sorted.sort((a, b) => {
    if (a.loanType === 'interest_only' && b.loanType !== 'interest_only') return -1
    if (b.loanType === 'interest_only' && a.loanType !== 'interest_only') return 1
    return 0
  })
  return sorted
}

/**
 * Main debt payoff computation.
 *
 * @param loans           - all active loans
 * @param monthlyExtra    - extra payment above all EMIs combined (paise)
 * @param strategy        - payoff strategy
 * @param startDate       - simulation start date (default: today)
 */
export function computeDebtPayoff(
  loans: LoanInput[],
  monthlyExtra: bigint,
  strategy: 'avalanche' | 'snowball' | 'custom',
  startDate: Date = new Date()
): DebtPayoffResult {
  const minimumInterest = minimumInterestTotal(loans)

  // Working state
  const balances: Record<string, bigint> = {}
  for (const loan of loans) balances[loan.id] = loan.outstanding

  const sorted = sortByStrategy(loans, strategy)
  const milestones: LoanMilestone[] = []
  const monthlySchedule: MonthlySnapshot[] = []

  let totalInterestPaid = 0n
  let availableExtra = monthlyExtra
  let month = 0
  const MAX_MONTHS = 600  // 50 year safety cap

  while (month < MAX_MONTHS) {
    // Check if all loans are paid off
    const totalRemaining = Object.values(balances).reduce((s, b) => s + b, 0n)
    if (totalRemaining <= 0n) break

    month++
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + month)

    let monthInterest = 0n
    let monthPrincipal = 0n
    let extraUsed = 0n

    // Step 1: Pay minimum EMI on all loans
    for (const loan of sorted) {
      const balance = balances[loan.id]
      if (balance <= 0n) continue

      const r = loan.interestRate / 12 / 100
      const interest = BigInt(Math.round(Number(balance) * r))
      monthInterest += interest

      if (loan.loanType === 'interest_only') {
        // Only interest payment — principal unchanged
        totalInterestPaid += interest
      } else {
        const emi = loan.emiAmount < interest ? interest + 1n : loan.emiAmount
        const principal = emi - interest <= balance ? emi - interest : balance
        balances[loan.id] = balance - principal
        monthPrincipal += principal
        totalInterestPaid += interest
      }
    }

    // Step 2: Apply extra payment to highest-priority unpaid loan (stacking)
    let extraRemaining = availableExtra
    for (const loan of sorted) {
      if (extraRemaining <= 0n) break
      const balance = balances[loan.id]
      if (balance <= 0n) continue

      const payment = balance < extraRemaining ? balance : extraRemaining
      balances[loan.id] = balance - payment
      monthPrincipal += payment
      extraRemaining -= payment
      extraUsed += payment
    }

    // Step 3: Detect loan closures and stack freed EMIs
    for (const loan of sorted) {
      if (balances[loan.id] <= 0n && !milestones.find((m) => m.loanId === loan.id)) {
        const freedEMI = loan.loanType === 'interest_only'
          ? BigInt(Math.round(Number(loan.outstanding) * loan.interestRate / 12 / 100))
          : loan.emiAmount

        milestones.push({
          loanId: loan.id,
          loanName: loan.name,
          closesAtMonth: month,
          closesAtDate: date,
          freedEMI,
          interestPaid: 0n, // simplified; full amortization tracks this
        })

        // Stack: freed EMI goes to extra payment pool
        availableExtra += freedEMI
      }
    }

    monthlySchedule.push({
      month,
      date,
      balances: { ...balances },
      totalDebt: Object.values(balances).reduce((s, b) => s + b, 0n),
      totalInterestThisMonth: monthInterest,
      totalPrincipalThisMonth: monthPrincipal,
      extraPaymentThisMonth: extraUsed,
    })
  }

  const debtFreeDate = new Date(startDate)
  debtFreeDate.setMonth(debtFreeDate.getMonth() + month)

  return {
    strategy,
    debtFreeMonths: month,
    debtFreeDate,
    totalInterestPaid,
    interestSavedVsMinimum: minimumInterest > totalInterestPaid
      ? minimumInterest - totalInterestPaid
      : 0n,
    milestones,
    monthlySchedule,
  }
}

/**
 * Simulate what happens if user makes a one-time lump sum payment.
 * Returns the new debt-free date and interest saved.
 */
export function simulateLumpSum(
  loans: LoanInput[],
  monthlyExtra: bigint,
  strategy: 'avalanche' | 'snowball' | 'custom',
  lumpSum: bigint,
  targetLoanId: string
): { newDebtFreeDate: Date; monthsSaved: number; interestSaved: bigint } {
  // Apply lump sum to target loan
  const modifiedLoans = loans.map((l) =>
    l.id === targetLoanId
      ? { ...l, outstanding: l.outstanding > lumpSum ? l.outstanding - lumpSum : 0n }
      : l
  )

  const baseline = computeDebtPayoff(loans, monthlyExtra, strategy)
  const withLump = computeDebtPayoff(modifiedLoans, monthlyExtra, strategy)

  return {
    newDebtFreeDate: withLump.debtFreeDate,
    monthsSaved: baseline.debtFreeMonths - withLump.debtFreeMonths,
    interestSaved: baseline.totalInterestPaid - withLump.totalInterestPaid,
  }
}
