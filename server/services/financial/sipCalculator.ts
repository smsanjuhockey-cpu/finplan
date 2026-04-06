/**
 * SIP Calculator — pure math, no DB calls.
 * All monetary values in paise (BigInt).
 */

/**
 * Calculate the future corpus from a monthly SIP.
 * Formula: FV = SIP × ((1+r)^n − 1) / r × (1+r)
 *
 * @param monthlyAmount  - SIP amount in paise
 * @param annualReturn   - expected annual return rate (e.g., 12 for 12%)
 * @param months         - investment horizon in months
 * @returns corpus in paise
 */
export function sipCorpus(
  monthlyAmount: bigint,
  annualReturn: number,
  months: number
): bigint {
  const r = annualReturn / 12 / 100
  const n = months
  const sip = Number(monthlyAmount)

  if (r === 0) return BigInt(Math.round(sip * n))

  const corpus = sip * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
  return BigInt(Math.round(corpus))
}

/**
 * Calculate the monthly SIP needed to reach a target corpus.
 * Formula: SIP = FV × r / ((1+r)^n − 1) / (1+r)
 *
 * @param targetCorpus - desired corpus in paise
 * @param annualReturn - expected annual return rate (e.g., 12 for 12%)
 * @param months       - investment horizon in months
 * @returns required monthly SIP in paise
 */
export function requiredSIP(
  targetCorpus: bigint,
  annualReturn: number,
  months: number
): bigint {
  const r = annualReturn / 12 / 100
  const n = months
  const fv = Number(targetCorpus)

  if (r === 0) return BigInt(Math.round(fv / n))

  const sip = (fv * r) / ((Math.pow(1 + r, n) - 1) * (1 + r))
  return BigInt(Math.round(sip))
}

/**
 * Calculate FD maturity value.
 * Formula (compound quarterly): A = P × (1 + r/4)^(4t)
 *
 * @param principal    - FD principal in paise
 * @param annualRate   - interest rate (e.g., 7.5 for 7.5%)
 * @param months       - FD tenure in months
 * @returns maturity value in paise
 */
export function fdMaturityValue(
  principal: bigint,
  annualRate: number,
  months: number
): bigint {
  const r = annualRate / 100
  const t = months / 12
  const maturity = Number(principal) * Math.pow(1 + r / 4, 4 * t)
  return BigInt(Math.round(maturity))
}

/**
 * Step-up SIP corpus (SIP increases by X% every year).
 *
 * @param initialSIP   - initial monthly SIP in paise
 * @param annualReturn - expected annual return (e.g., 12%)
 * @param annualStepUp - annual step-up percentage (e.g., 10%)
 * @param years        - investment horizon in years
 * @returns corpus in paise
 */
export function stepUpSIPCorpus(
  initialSIP: bigint,
  annualReturn: number,
  annualStepUp: number,
  years: number
): bigint {
  let corpus = 0n
  let monthlySIP = Number(initialSIP)
  const monthlyRate = annualReturn / 12 / 100

  for (let year = 0; year < years; year++) {
    for (let month = 0; month < 12; month++) {
      const totalMonths = (years - year) * 12 - month
      const futureValue = monthlySIP * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate)
      corpus += BigInt(Math.round(futureValue / ((years - year) * 12 - month) * 1))
    }
    monthlySIP = monthlySIP * (1 + annualStepUp / 100)
  }

  // Simplified: compute year by year
  corpus = 0n
  let sip = Number(initialSIP)
  for (let y = 0; y < years; y++) {
    const monthsRemaining = (years - y) * 12
    const r = monthlyRate
    const yearCorpus = sip * ((Math.pow(1 + r, 12) - 1) / r) * Math.pow(1 + r, monthsRemaining - 12)
    corpus += BigInt(Math.round(yearCorpus))
    sip = sip * (1 + annualStepUp / 100)
  }

  return corpus
}
