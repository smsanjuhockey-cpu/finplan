/**
 * Loan DNA classification for FinPlan
 * Each loan type has different payoff math and different urgency level.
 */

export interface LoanDNA {
  type: 'reducing_balance' | 'interest_only' | 'bullet' | 'overdraft'
  label: string
  description: string
  dangerLevel: 1 | 2 | 3 | 4 | 5
  alertMessage: string
}

export const LOAN_DNA: Record<string, LoanDNA> = {
  reducing_balance: {
    type: 'reducing_balance',
    label: 'Standard EMI Loan',
    description: 'Each EMI pays both interest and principal. Balance reduces every month.',
    dangerLevel: 2,
    alertMessage: '',
  },
  interest_only: {
    type: 'interest_only',
    label: 'Interest-Only Loan',
    description: 'EMI covers only the interest. Principal never reduces unless extra payments are made.',
    dangerLevel: 5,
    alertMessage:
      'DANGER: This loan principal will NEVER reduce unless you make extra payments. Every month you wait costs you more in interest.',
  },
  bullet: {
    type: 'bullet',
    label: 'Bullet Loan',
    description: 'Only interest is paid during tenure. Full principal is due at maturity.',
    dangerLevel: 4,
    alertMessage: 'The full principal is due at maturity. Start building a corpus to repay it.',
  },
  overdraft: {
    type: 'overdraft',
    label: 'Overdraft / Credit Line',
    description: 'Revolving credit. Balance fluctuates based on usage and repayments.',
    dangerLevel: 3,
    alertMessage: 'High-interest revolving debt. Pay down aggressively to reduce daily interest.',
  },
}

/** Common Indian loan types for the Add Loan form */
export const LOAN_CATEGORIES = [
  { value: 'home_loan',       label: 'Home Loan',             defaultType: 'reducing_balance' },
  { value: 'car_loan',        label: 'Car Loan',              defaultType: 'reducing_balance' },
  { value: 'personal_loan',   label: 'Personal Loan',         defaultType: 'reducing_balance' },
  { value: 'education_loan',  label: 'Education Loan',        defaultType: 'reducing_balance' },
  { value: 'credit_card',     label: 'Credit Card',           defaultType: 'overdraft'        },
  { value: 'gold_loan',       label: 'Gold Loan',             defaultType: 'reducing_balance' },
  { value: 'business_loan',   label: 'Business Loan',         defaultType: 'reducing_balance' },
  { value: 'lap',             label: 'Loan Against Property', defaultType: 'interest_only'    },
  { value: 'other',           label: 'Other Loan',            defaultType: 'reducing_balance' },
] as const
