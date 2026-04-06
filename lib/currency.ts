/**
 * Currency utilities for FinPlan
 *
 * CRITICAL: All monetary values in the database are stored as BigInt in paise.
 * (1 INR = 100 paise)
 *
 * This is the ONLY file that should convert between paise and display strings.
 * Every component that displays or accepts a monetary value MUST use this module.
 */

// ─── CONVERSION ───────────────────────────────────────────────────────────────

/** Convert paise (BigInt) to INR as a number */
export function toINR(paise: bigint): number {
  return Number(paise) / 100
}

/** Convert INR (number) to paise (BigInt) */
export function toPaise(inr: number): bigint {
  return BigInt(Math.round(inr * 100))
}

/** Convert paise string from DB (serialized BigInt) to number */
export function paiseToNumber(paise: bigint | number | string): number {
  return Number(paise) / 100
}

// ─── FORMATTING ───────────────────────────────────────────────────────────────

/**
 * Format paise to Indian currency string.
 * Uses Indian number system: ₹1,00,000 (not ₹100,000)
 *
 * @example formatINR(10000000n) → "₹1,00,000"
 * @example formatINR(150000n) → "₹1,500"
 * @example formatINR(-5000000n) → "-₹50,000"
 */
export function formatINR(paise: bigint | number, options?: FormatOptions): string {
  const inr = Number(paise) / 100
  const abs = Math.abs(inr)
  const sign = inr < 0 ? '-' : ''

  if (options?.compact) {
    return sign + '₹' + formatCompact(abs)
  }

  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: options?.decimals ?? 0,
    maximumFractionDigits: options?.decimals ?? 0,
  })

  return sign + '₹' + formatted
}

interface FormatOptions {
  /** Show compact form: ₹1.2L, ₹3.4Cr */
  compact?: boolean
  /** Number of decimal places (default 0) */
  decimals?: number
}

/**
 * Format large numbers in Indian compact notation.
 * @example formatCompact(1200000) → "12L"
 * @example formatCompact(34500000) → "3.45Cr"
 */
export function formatCompact(inr: number): string {
  if (inr >= 10_000_000) {
    const cr = inr / 10_000_000
    return cr % 1 === 0 ? `${cr}Cr` : `${cr.toFixed(2)}Cr`
  }
  if (inr >= 100_000) {
    const l = inr / 100_000
    return l % 1 === 0 ? `${l}L` : `${l.toFixed(2)}L`
  }
  if (inr >= 1_000) {
    const k = inr / 1_000
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`
  }
  return inr.toString()
}

/**
 * Format paise as compact INR.
 * @example formatINRCompact(120000000n) → "₹12L"
 * @example formatINRCompact(34500000000n) → "₹345Cr"
 */
export function formatINRCompact(paise: bigint | number): string {
  return formatINR(paise, { compact: true })
}

// ─── PARSING ──────────────────────────────────────────────────────────────────

/**
 * Parse an INR string to paise.
 * Handles: "1,20,000", "1.2L", "₹3,500", "3500.50"
 *
 * @example parseINR("1,20,000") → 12000000n
 * @example parseINR("₹3,500") → 350000n
 */
export function parseINR(input: string): bigint {
  // Remove currency symbol, spaces, commas
  const cleaned = input.replace(/[₹,\s]/g, '')

  // Handle L/Cr shorthand
  if (/L$/i.test(cleaned)) {
    const val = parseFloat(cleaned.replace(/L$/i, '')) * 100_000
    return toPaise(val)
  }
  if (/Cr$/i.test(cleaned)) {
    const val = parseFloat(cleaned.replace(/Cr$/i, '')) * 10_000_000
    return toPaise(val)
  }

  const num = parseFloat(cleaned)
  if (isNaN(num)) return 0n
  return toPaise(num)
}

// ─── ARITHMETIC (all in paise, no floats) ────────────────────────────────────

/** Add paise amounts safely */
export function addPaise(...amounts: bigint[]): bigint {
  return amounts.reduce((sum, a) => sum + a, 0n)
}

/** Subtract paise amounts safely */
export function subtractPaise(a: bigint, b: bigint): bigint {
  return a - b
}

/** Multiply paise by a percentage (e.g., 0.3 for 30%) */
export function percentOf(paise: bigint, percent: number): bigint {
  return BigInt(Math.round(Number(paise) * percent))
}

/** Calculate percentage: what % is `part` of `total`? */
export function percentageOf(part: bigint, total: bigint): number {
  if (total === 0n) return 0
  return (Number(part) / Number(total)) * 100
}

// ─── VALIDATION ───────────────────────────────────────────────────────────────

/** Check if a paise value is positive */
export function isPositivePaise(paise: bigint): boolean {
  return paise > 0n
}

/** Clamp paise to a minimum of 0 */
export function clampPaise(paise: bigint): bigint {
  return paise < 0n ? 0n : paise
}
