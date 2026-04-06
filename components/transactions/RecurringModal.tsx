'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/trpc'
import { cn } from '@/lib/utils'

const INSTRUMENT_LABELS: Record<string, string> = {
  emi:               'EMI (Loan)',
  sip:               'SIP (Mutual Fund)',
  rd:                'Recurring Deposit',
  insurance_premium: 'Insurance Premium',
  subscription:      'Subscription',
  rent:              'Rent',
  salary:            'Salary',
  ppf:               'PPF',
  nps:               'NPS',
  other:             'Other',
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily:      'Daily',
  weekly:     'Weekly',
  biweekly:   'Bi-weekly',
  monthly:    'Monthly',
  quarterly:  'Quarterly',
  halfyearly: 'Half-yearly',
  yearly:     'Yearly',
}

const DEFAULT_TYPE: Record<string, string> = {
  emi: 'expense', sip: 'investment', rd: 'investment',
  insurance_premium: 'expense', subscription: 'expense',
  rent: 'expense', salary: 'income', ppf: 'investment',
  nps: 'investment', other: 'expense',
}

type RecurringRule = {
  id: string
  name: string
  amount: bigint
  type: string
  frequency: string
  instrumentType: string
  startDate: Date
  endDate?: Date | null
  dueDayOfMonth?: number | null
  categoryId?: string | null
  accountId?: string | null
  description?: string | null
  autoGenerateTxn: boolean
  loanPrincipal?: bigint | null
  loanInterestRate?: unknown
  loanTenureMonths?: number | null
  loanOutstanding?: bigint | null
  sipFundName?: string | null
  sipFolioNumber?: string | null
  sipExpectedReturn?: unknown
}

type Props = {
  onClose: () => void
  editRule?: RecurringRule
}

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export function RecurringModal({ onClose, editRule }: Props) {
  const utils = api.useUtils()
  const { data: categories } = api.categories.list.useQuery()
  const { data: accounts }   = api.accounts.list.useQuery()

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    name:              editRule?.name ?? '',
    amount:            editRule ? (Number(editRule.amount) / 100).toString() : '',
    type:              editRule?.type ?? 'expense',
    frequency:         editRule?.frequency ?? 'monthly',
    instrumentType:    editRule?.instrumentType ?? 'other',
    startDate:         editRule ? new Date(editRule.startDate).toISOString().split('T')[0] : today,
    endDate:           editRule?.endDate ? new Date(editRule.endDate).toISOString().split('T')[0] : '',
    dueDayOfMonth:     editRule?.dueDayOfMonth?.toString() ?? '',
    categoryId:        editRule?.categoryId ?? '',
    accountId:         editRule?.accountId ?? '',
    description:       editRule?.description ?? '',
    autoGenerateTxn:   editRule?.autoGenerateTxn ?? true,
    // EMI
    loanPrincipal:     editRule?.loanPrincipal ? (Number(editRule.loanPrincipal) / 100).toString() : '',
    loanInterestRate:  editRule?.loanInterestRate ? String(editRule.loanInterestRate) : '',
    loanTenureMonths:  editRule?.loanTenureMonths?.toString() ?? '',
    loanOutstanding:   editRule?.loanOutstanding ? (Number(editRule.loanOutstanding) / 100).toString() : '',
    // SIP
    sipFundName:       editRule?.sipFundName ?? '',
    sipFolioNumber:    editRule?.sipFolioNumber ?? '',
    sipExpectedReturn: editRule?.sipExpectedReturn ? String(editRule.sipExpectedReturn) : '',
  })

  // Auto-set transaction type when instrument changes
  useEffect(() => {
    if (!editRule) {
      setForm(f => ({ ...f, type: DEFAULT_TYPE[f.instrumentType] ?? 'expense' }))
    }
  }, [form.instrumentType, editRule])

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const isEMI = form.instrumentType === 'emi'
  const isSIP = form.instrumentType === 'sip'

  const createMutation = api.recurring.create.useMutation({
    onSuccess: () => { utils.recurring.list.invalidate(); onClose() },
  })
  const updateMutation = api.recurring.update.useMutation({
    onSuccess: () => { utils.recurring.list.invalidate(); onClose() },
  })

  const isPending = createMutation.isPending || updateMutation.isPending
  const error = createMutation.error || updateMutation.error

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name:            form.name,
      amount:          parseFloat(form.amount),
      type:            form.type as 'income' | 'expense' | 'investment' | 'transfer',
      frequency:       form.frequency as never,
      instrumentType:  form.instrumentType as never,
      startDate:       form.startDate,
      endDate:         form.endDate || undefined,
      dueDayOfMonth:   form.dueDayOfMonth ? parseInt(form.dueDayOfMonth) : undefined,
      categoryId:      form.categoryId || undefined,
      accountId:       form.accountId || undefined,
      description:     form.description || undefined,
      autoGenerateTxn: form.autoGenerateTxn,
      loanPrincipal:   form.loanPrincipal    ? parseFloat(form.loanPrincipal)    : undefined,
      loanInterestRate: form.loanInterestRate ? parseFloat(form.loanInterestRate) : undefined,
      loanTenureMonths: form.loanTenureMonths ? parseInt(form.loanTenureMonths)   : undefined,
      loanOutstanding:  form.loanOutstanding  ? parseFloat(form.loanOutstanding)  : undefined,
      sipFundName:      form.sipFundName || undefined,
      sipFolioNumber:   form.sipFolioNumber || undefined,
      sipExpectedReturn: form.sipExpectedReturn ? parseFloat(form.sipExpectedReturn) : undefined,
    }

    if (editRule) {
      updateMutation.mutate({ id: editRule.id, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {editRule ? 'Edit Recurring Rule' : 'Add Recurring Rule'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {/* Instrument type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={form.instrumentType} onChange={set('instrumentType')} className={inputClass}>
              {Object.entries(INSTRUMENT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Name + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input required value={form.name} onChange={set('name')} placeholder="e.g. Home Loan EMI" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
              <input required type="number" min={0.01} step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" className={inputClass} />
            </div>
          </div>

          {/* Transaction type + Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
              <select value={form.type} onChange={set('type')} className={inputClass}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="investment">Investment</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select value={form.frequency} onChange={set('frequency')} className={inputClass}>
                {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input required type="date" value={form.startDate} onChange={set('startDate')} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="date" value={form.endDate} onChange={set('endDate')} className={inputClass} />
            </div>
          </div>

          {/* Due day + Category + Account */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Day</label>
              <input type="number" min={1} max={31} value={form.dueDayOfMonth} onChange={set('dueDayOfMonth')} placeholder="e.g. 5" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.categoryId} onChange={set('categoryId')} className={inputClass}>
                <option value="">— None —</option>
                {(categories ?? []).filter(c => c.type === form.type).map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
              <select value={form.accountId} onChange={set('accountId')} className={inputClass}>
                <option value="">— None —</option>
                {(accounts ?? []).map(a => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* EMI-specific fields */}
          {isEMI && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Loan Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Principal (₹)</label>
                  <input type="number" min={0} step="0.01" value={form.loanPrincipal} onChange={set('loanPrincipal')} placeholder="0.00" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                  <input type="number" min={0} max={100} step="0.01" value={form.loanInterestRate} onChange={set('loanInterestRate')} placeholder="e.g. 8.5" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tenure (months)</label>
                  <input type="number" min={1} value={form.loanTenureMonths} onChange={set('loanTenureMonths')} placeholder="e.g. 240" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Outstanding (₹)</label>
                  <input type="number" min={0} step="0.01" value={form.loanOutstanding} onChange={set('loanOutstanding')} placeholder="0.00" className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* SIP-specific fields */}
          {isSIP && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">SIP Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fund Name</label>
                  <input value={form.sipFundName} onChange={set('sipFundName')} placeholder="e.g. Mirae Asset Large Cap Fund" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Folio Number</label>
                  <input value={form.sipFolioNumber} onChange={set('sipFolioNumber')} placeholder="Optional" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Expected Return (%)</label>
                  <input type="number" min={0} max={100} step="0.1" value={form.sipExpectedReturn} onChange={set('sipExpectedReturn')} placeholder="e.g. 12" className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* Description + auto-generate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <input value={form.description} onChange={set('description')} placeholder="Any additional notes" className={inputClass} />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.autoGenerateTxn}
              onChange={e => setForm(f => ({ ...f, autoGenerateTxn: e.target.checked }))}
              className="rounded accent-indigo-600"
            />
            Auto-generate transaction on due date
          </label>

          {error && <p className="text-sm text-red-600">{error.message}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={cn('flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors', isPending ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700')}
            >
              {isPending ? 'Saving…' : editRule ? 'Update' : 'Add Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
