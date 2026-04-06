'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  /** Called with the value in paise */
  onChangePaise?: (paise: bigint) => void
  /** Called with the value in INR (float) */
  onChangeINR?: (inr: number) => void
  /** Initial value in paise */
  defaultPaise?: bigint
  /** Placeholder */
  placeholder?: string
  className?: string
  label?: string
  error?: string
  disabled?: boolean
  id?: string
}

/**
 * INR currency input component.
 * Displays value in INR, but calls back with paise (BigInt).
 * Handles Indian number formatting and paise conversion.
 */
export function CurrencyInput({
  onChangePaise,
  onChangeINR,
  defaultPaise,
  placeholder = '0',
  className,
  label,
  error,
  disabled,
  id,
}: CurrencyInputProps) {
  const [raw, setRaw] = useState(
    defaultPaise !== undefined ? String(Number(defaultPaise) / 100) : ''
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Only allow digits and a single decimal point
    const val = e.target.value.replace(/[^0-9.]/g, '')
    // Prevent multiple decimals
    const parts = val.split('.')
    const cleaned = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : val

    setRaw(cleaned)

    const num = parseFloat(cleaned)
    if (!isNaN(num) && num >= 0) {
      const paise = BigInt(Math.round(num * 100))
      onChangePaise?.(paise)
      onChangeINR?.(num)
    } else if (cleaned === '' || cleaned === '0') {
      onChangePaise?.(0n)
      onChangeINR?.(0)
    }
  }

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm font-medium pointer-events-none">
          ₹
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'w-full pl-7 pr-3 py-2.5 rounded-lg border text-sm',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 bg-white',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            className
          )}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
