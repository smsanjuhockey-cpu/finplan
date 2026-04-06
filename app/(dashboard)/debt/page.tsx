'use client'

import { useState } from 'react'
import { api } from '@/lib/trpc'
import { formatINR, formatINRCompact } from '@/lib/currency'
import { formatIndianDate } from '@/lib/indianFinancialCalendar'
import { cn } from '@/lib/utils'
import { AddLoanModal } from '@/components/debt/AddLoanModal'

const STRATEGIES = [
  {
    id: 'avalanche' as const,
    icon: '📉',
    label: 'Avalanche',
    tagline: 'Saves the most money',
    explain: 'You pay minimums on all loans, then throw every extra rupee at the loan with the HIGHEST interest rate first. Once that closes, its freed EMI moves to the next highest. Mathematically optimal — you pay the least total interest.',
    good: 'Best if you want to minimize total interest paid',
  },
  {
    id: 'snowball' as const,
    icon: '⛄',
    label: 'Snowball',
    tagline: 'Fastest motivation boost',
    explain: 'You pay minimums on all loans, then attack the loan with the SMALLEST outstanding balance first. Once that closes, its freed EMI rolls into the next smallest. You feel wins faster, which keeps you motivated.',
    good: 'Best if you need momentum and quick psychological wins',
  },
  {
    id: 'custom' as const,
    icon: '✏️',
    label: 'Custom',
    tagline: 'Your own priority',
    explain: 'You decide which loan to attack first — regardless of rate or balance. Useful when you have a specific loan you want gone (e.g., close the loan from a family member first).',
    good: 'Best if you have a personal reason to prioritize a specific loan',
  },
]

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
      {children}
    </div>
  )
}

export default function DebtPage() {
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball' | 'custom'>('avalanche')
  const [extraPayment, setExtraPayment] = useState(0)
  const [showAddLoan, setShowAddLoan] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  const { data: liabilities } = api.liabilities.list.useQuery()
  const { data: plan, isLoading } = api.debt.plan.useQuery({ strategy, monthlyExtra: extraPayment })
  const { data: debtSummary } = api.liabilities.totalDebt.useQuery()

  const totalDebt = debtSummary?.total ?? 0n
  const monthlyEmi = debtSummary?.monthlyEmi ?? 0n
  const hasLoans = (liabilities?.length ?? 0) > 0
  const selectedStrategy = STRATEGIES.find(s => s.id === strategy)!

  return (
    <div className="space-y-5">

      {/* Header summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Outstanding Debt</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{formatINR(totalDebt)}</p>
          <p className="text-xs text-gray-400 mt-1">Sum of all loan balances</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Monthly EMI Outgo</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{formatINR(monthlyEmi)}</p>
          <p className="text-xs text-gray-400 mt-1">Fixed minimum payments across all loans</p>
        </div>
        <div className={cn(
          'rounded-xl border p-5',
          plan ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
        )}>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Debt Free Date</p>
          {plan ? (
            <>
              <p className="text-3xl font-bold text-green-700 mt-1">
                {formatIndianDate(new Date(plan.debtFreeDate))}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {plan.debtFreeMonths} months away · saves {formatINRCompact(plan.interestSavedVsMinimum)} vs paying minimums
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-400 mt-1">--</p>
              <p className="text-xs text-gray-400 mt-1">Add your loans to calculate</p>
            </>
          )}
        </div>
      </div>

      {/* How it works banner */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <button
          className="w-full flex items-center justify-between text-left"
          onClick={() => setShowHowItWorks(v => !v)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <span className="font-semibold text-gray-800">How does this Debt Planner work?</span>
          </div>
          <span className="text-gray-400 text-sm">{showHowItWorks ? '▲ Hide' : '▼ Show'}</span>
        </button>

        {showHowItWorks && (
          <div className="mt-4 space-y-4 text-sm text-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-800 mb-1">Step 1 — Add your loans</p>
                <p className="text-gray-500 text-xs">Enter each loan: outstanding balance, interest rate, and current EMI. The planner supports home loans, car loans, personal loans, credit cards, interest-only loans, and more.</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-800 mb-1">Step 2 — Pick a strategy</p>
                <p className="text-gray-500 text-xs">Choose Avalanche (lowest total interest), Snowball (fastest wins), or Custom. The engine calculates your exact debt-free date and total interest cost.</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-800 mb-1">Step 3 — Add extra payment</p>
                <p className="text-gray-500 text-xs">Any amount you can spare each month — even ₹2,000 — dramatically cuts your debt-free date. When one loan closes, its freed EMI auto-stacks onto the next.</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="font-semibold text-amber-800 mb-1">🔁 What is Debt Stacking?</p>
              <p className="text-amber-700 text-xs">
                When Loan A closes, instead of spending that freed EMI, the planner <strong>redirects it automatically to Loan B</strong>. This creates a "snowball" effect — your attack payment grows larger with each loan you close, making the remaining loans pay off exponentially faster.
              </p>
              <p className="text-amber-700 text-xs mt-1">
                Example: You pay ₹5,000 extra/mo. Gold Loan closes → ₹37,781 EMI freed → now ₹42,781 attacks Home Loan → closes faster → all EMIs redirect to final loan.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Loan List */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Your Loans</h3>
            <p className="text-xs text-gray-400 mt-0.5">Ordered by payoff priority (highest interest rate first)</p>
          </div>
          <button
            onClick={() => setShowAddLoan(true)}
            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Add Loan
          </button>
        </div>

        {!hasLoans ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-gray-600 font-medium">No loans added yet</p>
            <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">Add your home loan, car loan, personal loan, or credit card to see your personalised debt-free date</p>
            <button
              onClick={() => setShowAddLoan(true)}
              className="mt-4 bg-indigo-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-indigo-700"
            >
              Add First Loan
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {liabilities?.map((loan, index) => {
              const isInterestOnly = loan.loanType === 'interest_only'
              const monthlyInterest = BigInt(Math.round(Number(loan.outstandingAmount) * Number(loan.interestRate) / 12 / 100))
              const principalPaid = loan.emiAmount ? loan.emiAmount - monthlyInterest : 0n

              return (
                <div
                  key={loan.id}
                  className={cn(
                    'rounded-xl border p-4',
                    isInterestOnly ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xs bg-gray-200 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{loan.name}</span>
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full capitalize">
                            {loan.loanType.replace('_', ' ')}
                          </span>
                          {isInterestOnly && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                              ⚠ Danger: Principal Never Reduces
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{loan.lenderName} · <strong>{Number(loan.interestRate)}% p.a.</strong></p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>Monthly interest: <strong className="text-red-600">{formatINR(monthlyInterest)}</strong></span>
                          {loan.emiAmount && principalPaid > 0n && (
                            <span>Principal paid/mo: <strong className="text-green-600">{formatINR(principalPaid)}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900">{formatINR(loan.outstandingAmount)}</p>
                      <p className="text-xs text-gray-500">outstanding</p>
                      {loan.emiAmount && (
                        <p className="text-xs text-gray-500 mt-0.5">EMI {formatINR(loan.emiAmount)}/mo</p>
                      )}
                    </div>
                  </div>
                  {isInterestOnly && (
                    <div className="mt-3 bg-red-100 rounded-lg px-3 py-2 text-xs text-red-700">
                      ⚠ You are paying <strong>{formatINR(monthlyInterest)}/mo</strong> in pure interest. The ₹{(Number(loan.outstandingAmount)/100).toLocaleString('en-IN')} principal balance is NOT reducing. Use the extra payment slider above to start attacking this.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Debt Payoff Optimizer */}
      {hasLoans && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-gray-900">Debt Payoff Optimizer</h3>
            <p className="text-xs text-gray-400 mt-0.5">Simulate different payoff strategies and see your exact debt-free date</p>
          </div>

          {/* Strategy selector */}
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Choose your strategy</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {STRATEGIES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStrategy(s.id)}
                className={cn(
                  'text-left rounded-xl border p-4 transition-all',
                  strategy === s.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{s.icon}</span>
                  <span className={cn('font-semibold text-sm', strategy === s.id ? 'text-indigo-700' : 'text-gray-800')}>{s.label}</span>
                </div>
                <p className={cn('text-xs font-medium', strategy === s.id ? 'text-indigo-600' : 'text-gray-500')}>{s.tagline}</p>
                {strategy === s.id && (
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">{s.explain}</p>
                )}
              </button>
            ))}
          </div>

          <InfoBox>
            <strong>{selectedStrategy.icon} {selectedStrategy.label}:</strong> {selectedStrategy.good}
          </InfoBox>

          {/* Extra payment */}
          <div className="mt-5 mb-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-sm font-medium text-gray-700">Extra payment per month</p>
                <p className="text-xs text-gray-400">Above your regular EMIs — this is the accelerator</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-400">₹</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={extraPayment || ''}
                  onChange={(e) => setExtraPayment(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-32 text-right text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(500000, extraPayment)}
              step={5000}
              value={extraPayment}
              onChange={(e) => setExtraPayment(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>₹0 (minimums only)</span>
              <span>Type any custom amount in the box →</span>
              <span>₹5L+</span>
            </div>
            {extraPayment === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                💡 Even adding <strong>₹2,000/month</strong> extra can cut years off your debt-free date. Try the slider!
              </p>
            )}
          </div>

          {/* Result */}
          {isLoading ? (
            <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />
          ) : plan ? (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-5 space-y-4">

              {/* 4 key numbers */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Debt Free Date</p>
                  <p className="font-bold text-indigo-700 text-sm">{formatIndianDate(new Date(plan.debtFreeDate))}</p>
                  <p className="text-xs text-gray-400">({plan.debtFreeMonths} months)</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Total Interest</p>
                  <p className="font-bold text-red-600">{formatINRCompact(plan.totalInterestPaid)}</p>
                  <p className="text-xs text-gray-400">you'll pay lenders</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Interest Saved</p>
                  <p className="font-bold text-green-600">{formatINRCompact(plan.interestSavedVsMinimum)}</p>
                  <p className="text-xs text-gray-400">vs paying minimums</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Extra/month</p>
                  <p className="font-bold text-gray-800">{formatINR(BigInt(extraPayment * 100))}</p>
                  <p className="text-xs text-gray-400">above your EMIs</p>
                </div>
              </div>

              {/* Milestones */}
              {plan.milestones.length > 0 && (
                <div className="border-t border-indigo-100 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Loan Closure Timeline</p>
                    <span className="text-xs text-gray-400">— when each loan closes and EMI gets stacked</span>
                  </div>
                  <div className="space-y-2">
                    {plan.milestones.map((m, i) => (
                      <div key={m.loanId} className="bg-white border border-indigo-100 rounded-lg px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">🎉</span>
                          <div>
                            <span className="font-semibold text-green-700 text-sm">{m.loanName}</span>
                            <span className="text-gray-400 text-xs ml-2">fully paid off</span>
                            <p className="text-xs text-gray-500">{formatIndianDate(new Date(m.closesAtDate))}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-indigo-600">{formatINR(m.freedEMI)}/mo freed</p>
                          {i < plan.milestones.length - 1 ? (
                            <p className="text-xs text-gray-400">↓ stacks onto next loan</p>
                          ) : (
                            <p className="text-xs text-green-600 font-medium">🏁 All loans done!</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {showAddLoan && <AddLoanModal onClose={() => setShowAddLoan(false)} />}
    </div>
  )
}
