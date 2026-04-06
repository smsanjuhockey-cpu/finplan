/**
 * Indian Income Tax Slabs — FY 2025-26
 * All limits stored in paise (1 INR = 100 paise)
 */

export interface TaxSlab {
  from: bigint  // income from (paise)
  to: bigint | null  // income to (null = no upper limit)
  rate: number  // tax rate as decimal (0.05 = 5%)
}

export interface TaxRegimeConfig {
  name: string
  slabs: TaxSlab[]
  standardDeduction: bigint   // in paise
  rebateLimit: bigint         // 87A rebate — no tax if income <= this (paise)
  rebateAmount: bigint        // max rebate amount (paise)
  surchargeSlabs: SurchargeSlab[]
  cess: number                // health & education cess (0.04 = 4%)
}

interface SurchargeSlab {
  from: bigint
  to: bigint | null
  rate: number
}

// ─── OLD REGIME FY 2025-26 ───────────────────────────────────────────────────

export const OLD_REGIME: TaxRegimeConfig = {
  name: 'Old Regime',
  standardDeduction: 5_000_00n, // ₹50,000
  rebateLimit: 5_00_000_00n,    // ₹5,00,000
  rebateAmount: 1_250_00n,      // up to ₹12,500
  cess: 0.04,
  slabs: [
    { from: 0n,              to: 2_50_000_00n,  rate: 0.00 },
    { from: 2_50_000_00n,    to: 5_00_000_00n,  rate: 0.05 },
    { from: 5_00_000_00n,    to: 10_00_000_00n, rate: 0.20 },
    { from: 10_00_000_00n,   to: null,           rate: 0.30 },
  ],
  surchargeSlabs: [
    { from: 0n,              to: 50_00_000_00n,   rate: 0.00 },
    { from: 50_00_000_00n,   to: 1_00_00_000_00n, rate: 0.10 },
    { from: 1_00_00_000_00n, to: 2_00_00_000_00n, rate: 0.15 },
    { from: 2_00_00_000_00n, to: 5_00_00_000_00n, rate: 0.25 },
    { from: 5_00_00_000_00n, to: null,             rate: 0.37 },
  ],
}

// ─── NEW REGIME FY 2025-26 ───────────────────────────────────────────────────
// Post-Budget 2024 slabs

export const NEW_REGIME: TaxRegimeConfig = {
  name: 'New Regime',
  standardDeduction: 7_500_00n,  // ₹75,000 (enhanced from FY 2024-25)
  rebateLimit: 7_00_000_00n,     // ₹7,00,000 — no tax up to this
  rebateAmount: 2_500_00n,       // up to ₹25,000 rebate
  cess: 0.04,
  slabs: [
    { from: 0n,              to: 3_00_000_00n,  rate: 0.00 },
    { from: 3_00_000_00n,    to: 7_00_000_00n,  rate: 0.05 },
    { from: 7_00_000_00n,    to: 10_00_000_00n, rate: 0.10 },
    { from: 10_00_000_00n,   to: 12_00_000_00n, rate: 0.15 },
    { from: 12_00_000_00n,   to: 15_00_000_00n, rate: 0.20 },
    { from: 15_00_000_00n,   to: null,           rate: 0.30 },
  ],
  surchargeSlabs: [
    { from: 0n,              to: 50_00_000_00n,   rate: 0.00 },
    { from: 50_00_000_00n,   to: 1_00_00_000_00n, rate: 0.10 },
    { from: 1_00_00_000_00n, to: 2_00_00_000_00n, rate: 0.15 },
    { from: 2_00_00_000_00n, to: null,             rate: 0.15 }, // capped at 15% in new regime
  ],
}

// ─── DEDUCTION LIMITS ────────────────────────────────────────────────────────

export const DEDUCTION_LIMITS = {
  // Chapter VI-A
  SECTION_80C:        1_50_000_00n,  // ₹1,50,000
  SECTION_80CCD_1B:   50_000_00n,    // ₹50,000 (NPS additional)
  SECTION_80D_SELF:   25_000_00n,    // ₹25,000 (health insurance, self/spouse/children)
  SECTION_80D_PARENTS: 25_000_00n,  // ₹25,000 (parents below 60)
  SECTION_80D_SENIOR_PARENTS: 50_000_00n, // ₹50,000 (senior citizen parents)
  // Home loan
  SECTION_24B:        2_00_000_00n,  // ₹2,00,000 (self-occupied property interest)
  SECTION_80EEA:      1_50_000_00n,  // ₹1,50,000 (first-time home buyer, affordable housing)
  // NPS
  SECTION_80CCD_1:    1_50_000_00n,  // Part of 80C limit
  // Education loan
  SECTION_80E:        null,          // No limit — full interest on education loan
  // Donations
  SECTION_80G:        null,          // Varies by institution
} as const

// 80C sub-instrument names (for UI display)
export const SECTION_80C_INSTRUMENTS = [
  'ELSS (Tax-saving Mutual Fund)',
  'PPF (Public Provident Fund)',
  'EPF (Employee Provident Fund)',
  'Life Insurance Premium',
  'NSC (National Savings Certificate)',
  'SCSS (Senior Citizen Savings Scheme)',
  'Sukanya Samriddhi Yojana',
  'Home Loan Principal Repayment',
  'School/College Tuition Fees (children)',
  '5-year Tax Saving FD',
  'NPS (under 80CCD 1)',
] as const

export const SECTION_80D_INSTRUMENTS = [
  'Health Insurance Premium (Self/Spouse/Children)',
  'Health Insurance Premium (Parents)',
  'Preventive Health Checkup',
] as const
