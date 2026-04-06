/**
 * Indian-specific validators for FinPlan
 */

import { z } from 'zod'

/** PAN Card: 5 letters + 4 digits + 1 letter, all uppercase */
export const panSchema = z
  .string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number. Format: ABCDE1234F')

/** IFSC Code: 4 letters + 0 + 6 alphanumeric */
export const ifscSchema = z
  .string()
  .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code. Format: HDFC0001234')

/** Indian mobile number: 10 digits, starts with 6-9 */
export const mobileSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Invalid mobile number. Must be 10 digits starting with 6-9')

/** Aadhaar number: 12 digits */
export const aadhaarSchema = z
  .string()
  .regex(/^\d{12}$/, 'Invalid Aadhaar number. Must be exactly 12 digits')

/** Indian PIN code: 6 digits */
export const pinCodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'Invalid PIN code. Must be exactly 6 digits')

/** Folio number for Mutual Fund (alphanumeric, 6-20 chars) */
export const folioSchema = z
  .string()
  .min(4, 'Folio number too short')
  .max(25, 'Folio number too long')
  .optional()

/** Financial year string: YYYY-YY format */
export const financialYearSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Invalid FY format. Expected: 2025-26')

/** Interest rate: 0.01% to 50% */
export const interestRateSchema = z
  .number()
  .min(0.01, 'Rate must be at least 0.01%')
  .max(50, 'Rate cannot exceed 50%')

/** Positive INR amount (stored as paise — use toPaise() before saving) */
export const inrAmountSchema = z
  .number()
  .positive('Amount must be positive')
  .max(100_00_00_000, 'Amount too large') // ₹100 crore limit

/** Tenure in months: 1 to 360 (30 years) */
export const tenureMonthsSchema = z
  .number()
  .int()
  .min(1, 'Minimum 1 month')
  .max(360, 'Maximum 360 months (30 years)')

/** Day of month: 1-31 */
export const dayOfMonthSchema = z
  .number()
  .int()
  .min(1)
  .max(31)
