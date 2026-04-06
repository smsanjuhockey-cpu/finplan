'use client'

import { useState } from 'react'
import { api } from '@/lib/trpc'
import { LOAN_DNA } from '@/lib/constants/loanTypes'
import { calculateEMI } from '@/server/services/financial/emiCalculator'
import { formatINR } from '@/lib/currency'

interface AddLoanModalProps {
  onClose: () => void
}

const LIABILITY_TYPES = [
  { value: 'home_loan', label: 'Home Loan' },
  { value: 'car_loan', label: 'Car Loan' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'education_loan', label: 'Education Loan' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'gold_loan', label: 'Gold Loan' },
  { value: 'business_loan', label: 'Business Loan' },
  { value: 'other', label: 'Other' },
] as const

const LOAN_TYPES = [
  { value: 'reducing_balance', label: 'Reducing Balance', desc: 'Standard EMI — principal reduces each month' },
  { value: 'interest_only', label: 'Interest Only', desc: 'Principal never reduces at current payments' },
  { value: 'bullet', label: 'Bullet Repayment', desc: 'Full principal due at end of tenure' },
  { value: 'overdraft', label: 'Overdraft / OD', desc: 'Revolving credit, balance fluctuates' },
] as const

export function AddLoanModal({ onClose }: AddLoanModalProps) {
  const utils = api.useUtils()

  const [form, setForm] = useState({
    name: '',
    liabilityType: 'home_loan' as typeof LIABILITY_TYPES[number]['value'],
    loanType: 'reducing_balance' as typeof LOAN_TYPES[number]['value'],
    lenderName: '',
    principalAmount: '',
    outstandingAmount: '',
    interestRate: '',
    emiAmount: '',
    loanStartDate: '',
    loanEndDate: '',
    notes: '',
  })

  const createLoan = api.liabilities.create.useMutation({
    onSuccess: () => {
      utils.liabilities.list.invalidate()
      utils.liabilities.totalDebt.invalidate()
      utils.debt.plan.invalidate()
      onClose()
    },
  })

  // Auto-calculate EMI hint when principal/rate/tenure available
  const emiHint = (() => {
    const p = parseFloat(form.principalAmount)
    const r = parseFloat(form.interestRate)
    const startDate = form.loanStartDate ? new Date(form.loanStartDate) : null
    const endDate = form.loanEndDate ? new Date(form.loanEndDate) : null

    if (!p || !r || !startDate || !endDate || form.loanType !== 'reducing_balance') return null

    const months = Math.round(
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth())
    )
    if (months <= 0) return null

    try {
      const result = calculateEMI(BigInt(Math.round(p * 100)), r, months)
      return result.emi
    } catch {
      return null
    }
  })()

  const dna = LOAN_DNA[form.loanType as keyof typeof LOAN_DNA]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createLoan.mutate({
      name: form.name,
      liabilityType: form.liabilityType,
      loanType: form.loanType,
      lenderName: form.lenderName,
      principalAmount: parseFloat(form.principalAmount),
      outstandingAmount: parseFloat(form.outstandingAmount || form.principalAmount),
      interestRate: parseFloat(form.interestRate),
      emiAmount: form.emiAmount ? parseFloat(form.emiAmount) : undefined,
      loanStartDate: form.loanStartDate || undefined,
      loanEndDate: form.loanEndDate || undefined,
      notes: form.notes || undefined,
    })
  }

  const field = (label: string, child: React.ReactNode, hint?: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {child}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Add Loan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Loan DNA warning */}
          {dna && dna.dangerLevel >= 4 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              ⚠ {dna.alertMessage}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {field('Loan Name', (
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. SBI Home Loan"
                className={inputClass}
              />
            ))}
            {field('Lender', (
              <input
                required
                value={form.lenderName}
                onChange={e => setForm(f => ({ ...f, lenderName: e.target.value }))}
                placeholder="e.g. SBI, HDFC"
                className={inputClass}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('Loan Category', (
              <select
                value={form.liabilityType}
                onChange={e => setForm(f => ({ ...f, liabilityType: e.target.value as typeof form.liabilityType }))}
                className={inputClass}
              >
                {LIABILITY_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            ))}
            {field('Repayment Type', (
              <select
                value={form.loanType}
                onChange={e => setForm(f => ({ ...f, loanType: e.target.value as typeof form.loanType }))}
                className={inputClass}
              >
                {LOAN_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            ), LOAN_TYPES.find(t => t.value === form.loanType)?.desc)}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('Original Principal (₹)', (
              <input
                required
                type="number"
                min={1}
                step="0.01"
                value={form.principalAmount}
                onChange={e => setForm(f => ({ ...f, principalAmount: e.target.value }))}
                placeholder="2000000"
                className={inputClass}
              />
            ))}
            {field('Outstanding Balance (₹)', (
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={form.outstandingAmount}
                onChange={e => setForm(f => ({ ...f, outstandingAmount: e.target.value }))}
                placeholder="Same as principal if new"
                className={inputClass}
              />
            ))}
          </div>

          {field('Interest Rate (% p.a.)', (
            <input
              required
              type="number"
              min={0.01}
              max={50}
              step="0.01"
              value={form.interestRate}
              onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))}
              placeholder="8.5"
              className={inputClass}
            />
          ))}

          {form.loanType !== 'interest_only' && field('Monthly EMI (₹)', (
            <div>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.emiAmount}
                onChange={e => setForm(f => ({ ...f, emiAmount: e.target.value }))}
                placeholder={emiHint ? `Auto: ${formatINR(emiHint)}` : 'Enter EMI'}
                className={inputClass}
              />
              {emiHint && !form.emiAmount && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, emiAmount: (Number(emiHint) / 100).toString() }))}
                  className="text-xs text-indigo-600 mt-1 hover:underline"
                >
                  Use calculated EMI: {formatINR(emiHint)}/mo
                </button>
              )}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            {field('Start Date', (
              <input
                type="date"
                value={form.loanStartDate}
                onChange={e => setForm(f => ({ ...f, loanStartDate: e.target.value }))}
                className={inputClass}
              />
            ))}
            {field('End Date / Maturity', (
              <input
                type="date"
                value={form.loanEndDate}
                onChange={e => setForm(f => ({ ...f, loanEndDate: e.target.value }))}
                className={inputClass}
              />
            ))}
          </div>

          {field('Notes (optional)', (
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. HDFC floating rate, linked to repo rate"
              className={inputClass}
            />
          ))}

          {createLoan.error && (
            <p className="text-sm text-red-600">{createLoan.error.message}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoan.isPending}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {createLoan.isPending ? 'Adding…' : 'Add Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
