'use client'

import { useState } from 'react'
import { api } from '@/lib/trpc'
import { formatINR } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { BulkUploadModal } from '@/components/transactions/BulkUploadModal'
import { RecurringModal } from '@/components/transactions/RecurringModal'

const TYPE_META = {
  income:     { label: 'Income',     color: 'text-green-600',  bg: 'bg-green-50' },
  expense:    { label: 'Expense',    color: 'text-red-600',    bg: 'bg-red-50' },
  investment: { label: 'Investment', color: 'text-blue-600',   bg: 'bg-blue-50' },
  transfer:   { label: 'Transfer',   color: 'text-gray-600',   bg: 'bg-gray-50' },
} as const

type TxType = keyof typeof TYPE_META

function QuickAddForm({ onClose }: { onClose: () => void }) {
  const utils = api.useUtils()
  const now = new Date()

  const [form, setForm] = useState({
    amount: '',
    type: 'expense' as TxType,
    description: '',
    categoryId: '',
    accountId: '',
    date: now.toISOString().split('T')[0],
    notes: '',
    isTaxRelevant: false,
  })

  const { data: categories } = api.categories.list.useQuery()
  const { data: accounts } = api.accounts.list.useQuery()

  const create = api.transactions.create.useMutation({
    onSuccess: () => {
      utils.transactions.list.invalidate()
      utils.transactions.monthlySummary.invalidate()
      utils.accounts.totalBalance.invalidate()
      onClose()
    },
  })

  const direction = form.type === 'income' ? 'credit' : 'debit'
  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Add Transaction</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form
          className="p-6 space-y-4"
          onSubmit={e => {
            e.preventDefault()
            create.mutate({
              amount: parseFloat(form.amount),
              type: form.type,
              direction,
              description: form.description,
              categoryId: form.categoryId || undefined,
              accountId: form.accountId || undefined,
              date: form.date,
              notes: form.notes || undefined,
              isTaxRelevant: form.isTaxRelevant,
            })
          }}
        >
          {/* Type tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(Object.keys(TYPE_META) as TxType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className={cn(
                  'flex-1 py-1.5 rounded-md text-xs font-medium transition-colors capitalize',
                  form.type === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {TYPE_META[t].label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
              <input
                required
                type="number"
                min={0.01}
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                required
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              required
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Grocery shopping at D-Mart"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.categoryId}
                onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                className={inputClass}
              >
                <option value="">— Select —</option>
                {(categories ?? [])
                  .filter(c => c.type === form.type || c.type === 'transfer')
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
              <select
                value={form.accountId}
                onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                className={inputClass}
              >
                <option value="">— None —</option>
                {(accounts ?? []).map(a => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional details"
              className={inputClass}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isTaxRelevant}
              onChange={e => setForm(f => ({ ...f, isTaxRelevant: e.target.checked }))}
              className="rounded accent-indigo-600"
            />
            Mark as tax-relevant (80C, 80D, etc.)
          </label>

          {create.error && <p className="text-sm text-red-600">{create.error.message}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {create.isPending ? 'Saving…' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const INSTRUMENT_META: Record<string, { label: string; color: string; bg: string }> = {
  emi:               { label: 'EMI',          color: 'text-amber-700',  bg: 'bg-amber-50' },
  sip:               { label: 'SIP',          color: 'text-blue-700',   bg: 'bg-blue-50' },
  rd:                { label: 'RD',           color: 'text-blue-700',   bg: 'bg-blue-50' },
  insurance_premium: { label: 'Insurance',    color: 'text-purple-700', bg: 'bg-purple-50' },
  subscription:      { label: 'Subscription', color: 'text-pink-700',   bg: 'bg-pink-50' },
  rent:              { label: 'Rent',         color: 'text-orange-700', bg: 'bg-orange-50' },
  salary:            { label: 'Salary',       color: 'text-green-700',  bg: 'bg-green-50' },
  ppf:               { label: 'PPF',          color: 'text-indigo-700', bg: 'bg-indigo-50' },
  nps:               { label: 'NPS',          color: 'text-indigo-700', bg: 'bg-indigo-50' },
  other:             { label: 'Other',        color: 'text-gray-700',   bg: 'bg-gray-50' },
}
const FREQ_LABEL: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly',
  monthly: 'Monthly', quarterly: 'Quarterly', halfyearly: 'Half-yearly', yearly: 'Yearly',
}

function RecurringTab() {
  const utils = api.useUtils()
  const [showModal, setShowModal] = useState(false)
  const [editRule, setEditRule] = useState<Parameters<typeof RecurringModal>[0]['editRule']>(undefined)

  const { data: rules, isLoading } = api.recurring.list.useQuery()

  const toggle = api.recurring.toggle.useMutation({ onSuccess: () => utils.recurring.list.invalidate() })
  const del    = api.recurring.delete.useMutation({ onSuccess: () => utils.recurring.list.invalidate() })

  const openAdd  = () => { setEditRule(undefined); setShowModal(true) }
  const openEdit = (rule: NonNullable<typeof rules>[0]) => { setEditRule(rule as never); setShowModal(true) }

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{rules?.length ?? 0} recurring rules</p>
        <button onClick={openAdd} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          + Add Rule
        </button>
      </div>

      {!rules?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-4xl mb-3">🔄</p>
          <p className="text-gray-600 font-medium">No recurring rules yet</p>
          <p className="text-gray-400 text-sm mt-1">Track your EMIs, SIPs, salary, subscriptions and more</p>
          <button onClick={openAdd} className="mt-4 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">
            Add First Rule
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {rules.map(rule => {
              const meta = INSTRUMENT_META[rule.instrumentType] ?? INSTRUMENT_META.other
              const typeMeta = TYPE_META[rule.type as TxType] ?? TYPE_META.expense
              const nextDue = new Date(rule.nextDueDate)
              const isOverdue = nextDue < new Date()
              return (
                <div key={rule.id} className={cn('flex items-center justify-between px-5 py-4 group', !rule.isActive && 'opacity-50')}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', meta.bg, meta.color)}>
                      {meta.label.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800 truncate">{rule.name}</p>
                        <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0', meta.bg, meta.color)}>
                          {meta.label}
                        </span>
                        {!rule.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Paused</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                        <span>{FREQ_LABEL[rule.frequency] ?? rule.frequency}</span>
                        <span>·</span>
                        <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                          {isOverdue ? 'Overdue · ' : 'Next: '}
                          {nextDue.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {rule.category && <><span>·</span><span>{rule.category.icon} {rule.category.name}</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <span className={cn('text-sm font-semibold', typeMeta.color)}>
                      {formatINR(rule.amount)}
                    </span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggle.mutate({ id: rule.id })} className="text-xs text-gray-500 hover:text-indigo-600">
                        {rule.isActive ? 'Pause' : 'Resume'}
                      </button>
                      <button onClick={() => openEdit(rule)} className="text-xs text-indigo-500 hover:text-indigo-700">Edit</button>
                      <button
                        onClick={() => { if (confirm('Delete this rule?')) del.mutate({ id: rule.id }) }}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showModal && <RecurringModal onClose={() => setShowModal(false)} editRule={editRule} />}
    </div>
  )
}

export default function TransactionsPage() {
  const now = new Date()
  const [tab, setTab] = useState<'transactions' | 'recurring'>('transactions')
  const [showAdd, setShowAdd] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [filterType, setFilterType] = useState<TxType | ''>('')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const monthStart = new Date(year, month - 1, 1).toISOString()
  const monthEnd = new Date(year, month, 0, 23, 59, 59).toISOString()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = api.transactions.list.useInfiniteQuery(
    {
      limit: 50,
      type: filterType || undefined,
      from: monthStart,
      to: monthEnd,
    },
    { getNextPageParam: (last) => last.nextCursor }
  )

  const { data: summary } = api.transactions.monthlySummary.useQuery({ month, year })
  const utils = api.useUtils()

  const deleteTxn = api.transactions.delete.useMutation({
    onSuccess: () => {
      utils.transactions.list.invalidate()
      utils.transactions.monthlySummary.invalidate()
      utils.accounts.totalBalance.invalidate()
    },
  })

  const transactions = data?.pages.flatMap(p => p.items) ?? []

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div className="space-y-6">
      {/* Page tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setTab('transactions')}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors', tab === 'transactions' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}
          >
            Transactions
          </button>
          <button
            onClick={() => setTab('recurring')}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors', tab === 'recurring' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}
          >
            Recurring
          </button>
        </div>
        {tab === 'transactions' && (
          <div className="flex gap-2">
            <button onClick={() => setShowBulk(true)} className="bg-white border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              ↑ Bulk Upload
            </button>
            <button onClick={() => setShowAdd(true)} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
              + Add Transaction
            </button>
          </div>
        )}
      </div>

      {tab === 'recurring' && <RecurringTab />}

      {tab === 'transactions' && <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">←</button>
          <span className="font-semibold text-gray-800 min-w-[120px] text-center">{MONTHS[month - 1]} {year}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">→</button>
        </div>
      </div>

      {/* Monthly summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Income</p>
            <p className="text-xl font-bold text-green-600 mt-0.5">{formatINR(summary.income)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Expenses</p>
            <p className="text-xl font-bold text-red-600 mt-0.5">{formatINR(summary.expenses)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Invested</p>
            <p className="text-xl font-bold text-blue-600 mt-0.5">{formatINR(summary.investments)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Saved</p>
            <p className={cn('text-xl font-bold mt-0.5', summary.savings >= 0n ? 'text-gray-900' : 'text-red-600')}>
              {formatINR(summary.savings)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{summary.savingsRate.toFixed(1)}% rate</p>
          </div>
        </div>
      )}

      {/* Transactions list */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
            <button
              onClick={() => setFilterType('')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filterType === '' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              All
            </button>
            {(Object.keys(TYPE_META) as TxType[]).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize',
                  filterType === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {TYPE_META[t].label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">{transactions.length} transactions</span>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-600 font-medium">No transactions this month</p>
            <p className="text-gray-400 text-sm mt-1">Add your first transaction to track spending</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((txn) => {
              const meta = TYPE_META[txn.type as TxType] ?? TYPE_META.expense
              return (
                <div key={txn.id} className="flex items-center justify-between py-3 group">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0', meta.bg)}>
                      {txn.category?.icon ?? '📌'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{txn.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                        {txn.category && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-gray-400">{txn.category.name}</span>
                          </>
                        )}
                        {txn.account && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-gray-400">{txn.account.icon} {txn.account.name}</span>
                          </>
                        )}
                        {txn.isTaxRelevant && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Tax</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('text-sm font-semibold', meta.color)}>
                      {txn.direction === 'credit' ? '+' : '-'}{formatINR(txn.amount)}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm('Delete this transaction?')) deleteTxn.mutate({ id: txn.id })
                      }}
                      className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mt-4 w-full text-sm text-indigo-600 hover:text-indigo-800 py-2"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>

      </>}

      {showAdd && <QuickAddForm onClose={() => setShowAdd(false)} />}
      {showBulk && <BulkUploadModal onClose={() => setShowBulk(false)} />}
    </div>
  )
}
