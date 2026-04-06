/**
 * EMI Calculator — pure math, no DB calls.
 * All monetary values in paise (BigInt).
 */

export interface EMIResult {
  emi: bigint            // monthly EMI in paise
  totalPayable: bigint   // total amount payable over tenure (paise)
  totalInterest: bigint  // total interest component (paise)
}

/**
 * Calculate monthly EMI.
 * Formula: EMI = P × r × (1+r)^n / ((1+r)^n − 1)
 *
 * @param principal  - loan amount in paise
 * @param annualRate - annual interest rate (e.g., 8.5 for 8.5%)
 * @param months     - loan tenure in months
 */
export function calculateEMI(
  principal: bigint,
  annualRate: number,
  months: number
): EMIResult {
  if (annualRate === 0) {
    const emi = principal / BigInt(months)
    return { emi, totalPayable: principal, totalInterest: 0n }
  }

  const r = annualRate / 12 / 100  // monthly rate
  const n = months
  const p = Number(principal)

  const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  const totalPayable = emi * n
  const totalInterest = totalPayable - p

  return {
    emi: BigInt(Math.round(emi)),
    totalPayable: BigInt(Math.round(totalPayable)),
    totalInterest: BigInt(Math.round(totalInterest)),
  }
}

/**
 * Calculate remaining tenure given current outstanding and EMI.
 */
export function remainingMonths(
  outstanding: bigint,
  annualRate: number,
  emiAmount: bigint
): number {
  if (annualRate === 0) {
    return Math.ceil(Number(outstanding) / Number(emiAmount))
  }
  const r = annualRate / 12 / 100
  const p = Number(outstanding)
  const emi = Number(emiAmount)

  if (emi <= p * r) return Infinity // EMI doesn't cover interest

  const n = -Math.log(1 - (p * r) / emi) / Math.log(1 + r)
  return Math.ceil(n)
}

export interface AmortizationRow {
  month: number
  date: Date
  openingBalance: bigint
  emi: bigint
  principal: bigint
  interest: bigint
  closingBalance: bigint
}

/**
 * Generate full amortization schedule for a reducing-balance loan.
 */
export function generateAmortization(
  outstanding: bigint,
  annualRate: number,
  emiAmount: bigint,
  startDate: Date,
  extraMonthlyPayment: bigint = 0n
): AmortizationRow[] {
  const schedule: AmortizationRow[] = []
  let balance = outstanding
  let month = 0
  const r = annualRate / 12 / 100

  while (balance > 0n && month < 600) {
    month++
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + month)

    const interestPaise = BigInt(Math.round(Number(balance) * r))
    const totalPayment = emiAmount + extraMonthlyPayment
    const principalPaid = totalPayment - interestPaise > balance
      ? balance  // last payment — don't overpay
      : totalPayment - interestPaise

    if (principalPaid <= 0n) break // EMI below interest — infinite loop guard

    const closingBalance = balance - principalPaid

    schedule.push({
      month,
      date,
      openingBalance: balance,
      emi: totalPayment,
      principal: principalPaid,
      interest: interestPaise,
      closingBalance: closingBalance < 0n ? 0n : closingBalance,
    })

    balance = closingBalance < 0n ? 0n : closingBalance
  }

  return schedule
}
