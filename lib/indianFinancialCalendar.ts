/**
 * Indian Financial Calendar utilities for FinPlan
 *
 * Indian Fiscal Year: April 1 to March 31
 * e.g., FY 2025-26 = April 1, 2025 to March 31, 2026
 */

import { addMonths, format, getMonth, getYear, setDate, setMonth } from 'date-fns'

// ─── FISCAL YEAR ──────────────────────────────────────────────────────────────

/**
 * Get the current Indian fiscal year string.
 * @example getCurrentFY() → "2025-26"
 */
export function getCurrentFY(date: Date = new Date()): string {
  const month = getMonth(date) // 0-indexed: 0=Jan, 3=Apr
  const year = getYear(date)
  if (month >= 3) {
    // April onwards: FY starts this year
    return `${year}-${String(year + 1).slice(2)}`
  } else {
    // Jan-Mar: FY started last year
    return `${year - 1}-${String(year).slice(2)}`
  }
}

/**
 * Get start and end dates for a given FY string.
 * @example getFYDates("2025-26") → { start: 2025-04-01, end: 2026-03-31 }
 */
export function getFYDates(fy: string): { start: Date; end: Date } {
  const startYear = parseInt(fy.split('-')[0])
  const start = new Date(startYear, 3, 1)   // April 1
  const end = new Date(startYear + 1, 2, 31) // March 31
  return { start, end }
}

/**
 * Get the assessment year for a given fiscal year.
 * @example getAssessmentYear("2025-26") → "2026-27"
 */
export function getAssessmentYear(fy: string): string {
  const startYear = parseInt(fy.split('-')[0])
  const ay1 = startYear + 1
  const ay2 = startYear + 2
  return `${ay1}-${String(ay2).slice(2)}`
}

/**
 * Get the quarter label for a given date.
 * @example getFinancialQuarter(new Date('2025-07-15')) → "Q2 FY26"
 */
export function getFinancialQuarter(date: Date): string {
  const month = getMonth(date) // 0-indexed
  const fy = getCurrentFY(date)
  const fyShort = fy.split('-')[1] // "26"

  if (month >= 3 && month <= 5) return `Q1 FY${fyShort}` // Apr-Jun
  if (month >= 6 && month <= 8) return `Q2 FY${fyShort}` // Jul-Sep
  if (month >= 9 && month <= 11) return `Q3 FY${fyShort}` // Oct-Dec
  return `Q4 FY${fyShort}` // Jan-Mar
}

/**
 * Get days remaining until FY end (March 31).
 */
export function daysToFYEnd(from: Date = new Date()): number {
  const fy = getCurrentFY(from)
  const { end } = getFYDates(fy)
  const diff = end.getTime() - from.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Check if within N days of FY end (March 31).
 * Used for 80C / PPF deadline alerts.
 */
export function isNearFYEnd(withinDays: number = 30, from: Date = new Date()): boolean {
  return daysToFYEnd(from) <= withinDays
}

// ─── ADVANCE TAX DATES ────────────────────────────────────────────────────────

/**
 * Get advance tax due dates for a given fiscal year.
 * Q1: June 15 (15% of tax)
 * Q2: September 15 (45% of tax)
 * Q3: December 15 (75% of tax)
 * Q4: March 15 (100% of tax)
 */
export function getAdvanceTaxDates(fy: string): Array<{ date: Date; percent: number; label: string }> {
  const startYear = parseInt(fy.split('-')[0])
  return [
    { date: new Date(startYear, 5, 15),     percent: 15,  label: 'Q1 Advance Tax (15%)' },
    { date: new Date(startYear, 8, 15),     percent: 45,  label: 'Q2 Advance Tax (45%)' },
    { date: new Date(startYear, 11, 15),    percent: 75,  label: 'Q3 Advance Tax (75%)' },
    { date: new Date(startYear + 1, 2, 15), percent: 100, label: 'Q4 Advance Tax (100%)' },
  ]
}

/**
 * Get ITR filing deadline for a given FY (July 31 of assessment year).
 */
export function getITRDeadline(fy: string): Date {
  const startYear = parseInt(fy.split('-')[0])
  return new Date(startYear + 1, 6, 31) // July 31 of AY
}

// ─── UPCOMING EVENTS ──────────────────────────────────────────────────────────

export interface FinancialCalendarEvent {
  date: Date
  title: string
  type: 'advance_tax' | 'itr_deadline' | 'ppf_deadline' | 'fy_end' | 'fy_start'
  description: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Get all upcoming Indian financial calendar events in the next N days.
 */
export function getUpcomingFinancialEvents(
  from: Date = new Date(),
  days: number = 90
): FinancialCalendarEvent[] {
  const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000)
  const events: FinancialCalendarEvent[] = []
  const fy = getCurrentFY(from)
  const { start, end } = getFYDates(fy)

  // FY end (March 31)
  if (end >= from && end <= to) {
    events.push({
      date: end,
      title: 'Financial Year End',
      type: 'fy_end',
      description: 'Last day to make 80C investments, PPF contributions, and tax-saving moves.',
      urgency: daysToFYEnd(from) <= 7 ? 'critical' : daysToFYEnd(from) <= 30 ? 'high' : 'medium',
    })
  }

  // Advance tax dates
  for (const { date, percent, label } of getAdvanceTaxDates(fy)) {
    if (date >= from && date <= to) {
      const daysAway = Math.ceil((date.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
      events.push({
        date,
        title: label,
        type: 'advance_tax',
        description: `Pay ${percent}% of estimated annual tax. Missing this attracts interest under Section 234C.`,
        urgency: daysAway <= 7 ? 'critical' : daysAway <= 14 ? 'high' : 'medium',
      })
    }
  }

  // ITR deadline
  const itrDeadline = getITRDeadline(fy)
  if (itrDeadline >= from && itrDeadline <= to) {
    const daysAway = Math.ceil((itrDeadline.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
    events.push({
      date: itrDeadline,
      title: 'ITR Filing Deadline',
      type: 'itr_deadline',
      description: 'Last date to file Income Tax Return without penalty (for non-audit cases).',
      urgency: daysAway <= 7 ? 'critical' : daysAway <= 30 ? 'high' : 'low',
    })
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
}

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────

/**
 * Format a date in Indian standard format: "15 Apr 2026"
 */
export function formatIndianDate(date: Date): string {
  return format(date, 'd MMM yyyy')
}

/**
 * Format a date as month-year: "April 2026"
 */
export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy')
}

/**
 * Get the start of a month from a YYYY-MM string.
 */
export function parseYYYYMM(yyyymm: string): Date {
  const [year, month] = yyyymm.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

/**
 * Format a date to YYYY-MM string.
 */
export function toYYYYMM(date: Date): string {
  return format(date, 'yyyy-MM')
}

/**
 * Get all months in a fiscal year as Date objects (start of each month).
 */
export function getFYMonths(fy: string): Date[] {
  const { start } = getFYDates(fy)
  return Array.from({ length: 12 }, (_, i) => addMonths(start, i))
}
