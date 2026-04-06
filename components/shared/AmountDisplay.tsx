'use client'

import { cn } from '@/lib/utils'
import { formatINR, formatINRCompact } from '@/lib/currency'

interface AmountDisplayProps {
  /** Amount in paise (BigInt or number) */
  paise: bigint | number
  /** Show compact form: ₹1.2L instead of ₹1,20,000 */
  compact?: boolean
  /** CSS class name */
  className?: string
  /** Colour based on sign: green for positive, red for negative */
  colored?: boolean
  /** Show + prefix for positive numbers */
  showSign?: boolean
  /** Number of decimal places */
  decimals?: number
}

/**
 * Displays a paise amount as formatted INR.
 * This is the ONLY component that should render money amounts in the UI.
 */
export function AmountDisplay({
  paise,
  compact = false,
  className,
  colored = false,
  showSign = false,
  decimals,
}: AmountDisplayProps) {
  const amount = Number(paise)
  const isNegative = amount < 0
  const isPositive = amount > 0

  const formatted = compact
    ? formatINRCompact(paise)
    : formatINR(paise, { decimals })

  const prefix = showSign && isPositive ? '+' : ''

  return (
    <span
      className={cn(
        'tabular-nums',
        colored && isPositive && 'text-green-600',
        colored && isNegative && 'text-red-600',
        colored && amount === 0 && 'text-gray-500',
        className
      )}
    >
      {prefix}{formatted}
    </span>
  )
}
