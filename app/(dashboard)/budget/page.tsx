'use client'

import { useState } from 'react'
import { api } from '@/lib/trpc'
import { formatINR, formatINRCompact } from '@/lib/currency'
import { cn } from '@/lib/utils'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const BUCKET_META = {
  needs:          { label: 'Needs',    color: 'bg-blue-500' },
  wants:          { label: 'Wants',    color: 'bg-purple-500' },
  savings:        { label: 'Savings',  color: 'bg-green-500' },
  uncategorized:  { label: 'Other',   color: 'bg-gray-400' },
}
const METHOD_LABELS = { custom: 'Custom', fifty_thirty_twenty: '50/30/20 Rule', zero_based: 'Zero-Based' }

function ProgressBar({ spent, allocated, color = 'bg-indigo-500' }: { spent: bigint; allocated: bigint; color?: string }) {
  const pct = allocated > 0n ? Math.min(100, Math.round(Number(spent * 100n) / Number(allocated))) : 0
  const over = pct >= 100
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', over ? 'bg-red-500' : color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

function CreateBudgetModal({ month, year, onClose }: { month: number; year: number; onClose: () => void }) {
  const utils = api.useUtils()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'custom' | 'fifty_thirty_twenty' | 'zero_based'>('custom')

  const create = api.budgets.create.useMutation({
    onSuccess: () => { utils.budgets.getCurrent.invalidate(); onClose() },
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create Budget</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <p className="text-sm text-gray-500">{MONTHS[month - 1]} {year}</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Budget (₹)</label>
          <input
            type="number" min={1} step="1" required
            value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="e.g. 50000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Budget Method</label>
          <div className="space-y-2">
            {(Object.entries(METHOD_LABELS) as [typeof method, string][]).map(([k, v]) => (
              <label key={k} className={cn('flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors', method === k ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50')}>
                <input type="radio" name="method" value={k} checked={method === k} onChange={() => setMethod(k)} className="mt-0.5 accent-indigo-600" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{v}</p>
                  {k === 'fifty_thirty_twenty' && <p className="text-xs text-gray-500 mt-0.5">50% needs · 30% wants · 20% savings</p>}
                  {k === 'zero_based' && <p className="text-xs text-gray-500 mt-0.5">Allocate every rupee to a category</p>}
                  {k === 'custom' && <p className="text-xs text-gray-500 mt-0.5">Set your own category allocations</p>}
                </div>
              </label>
            ))}
          </div>
        </div>

        {create.error && <p className="text-sm text-red-600">{create.error.message}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            disabled={!amount || create.isPending}
            onClick={() => create.mutate({ month, year, totalAmount: parseFloat(amount), budgetMethod: method })}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create Budget'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AllocateCategoryModal({ budgetId, month, year, onClose }: { budgetId: string; month: number; year: number; onClose: () => void }) {
  const utils = api.useUtils()
  const { data: categories } = api.categories.list.useQuery()
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [bucket, setBucket] = useState<'needs' | 'wants' | 'savings' | 'uncategorized'>('needs')

  const upsert = api.budgets.upsertCategory.useMutation({
    onSuccess: () => { utils.budgets.getCurrent.invalidate(); onClose() },
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Allocate Category</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">— Select —</option>
            {(categories ?? []).filter(c => c.type === 'expense').map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Allocated Amount (₹)</label>
          <input type="number" min={0} step="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bucket</label>
          <select value={bucket} onChange={e => setBucket(e.target.value as typeof bucket)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {Object.entries(BUCKET_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            disabled={!categoryId || !amount || upsert.isPending}
            onClick={() => upsert.mutate({ budgetId, categoryId, allocatedAmount: parseFloat(amount), bucket })}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {upsert.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BudgetPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const [showCreate, setShowCreate] = useState(false)
  const [showAllocate, setShowAllocate] = useState(false)

  const utils = api.useUtils()
  const { data: budget, isLoading } = api.budgets.getCurrent.useQuery({ month, year })

  const removeCategory = api.budgets.removeCategory.useMutation({
    onSuccess: () => utils.budgets.getCurrent.invalidate(),
  })

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  if (isLoading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">←</button>
          <span className="font-semibold text-gray-800 min-w-[120px] text-center">{MONTHS[month - 1]} {year}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">→</button>
        </div>
        {!budget && (
          <button onClick={() => setShowCreate(true)} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">
            + Create Budget
          </button>
        )}
      </div>

      {!budget ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-gray-600 font-medium">No budget for {MONTHS[month - 1]} {year}</p>
          <p className="text-gray-400 text-sm mt-1">Create a budget to track your spending against your goals</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">
            Create Budget
          </button>
        </div>
      ) : (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Budget</p>
              <p className="text-2xl font-bold text-gray-900">{formatINRCompact(budget.totalAmount)}</p>
              <p className="text-xs text-gray-400 mt-1">{METHOD_LABELS[budget.budgetMethod]}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Spent</p>
              <p className={cn('text-2xl font-bold', budget.totalSpent > budget.totalAmount ? 'text-red-600' : 'text-gray-900')}>
                {formatINRCompact(budget.totalSpent)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {budget.totalAmount > 0n ? Math.round(Number(budget.totalSpent * 100n) / Number(budget.totalAmount)) : 0}% used
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Remaining</p>
              {budget.totalAmount >= budget.totalSpent ? (
                <p className="text-2xl font-bold text-green-600">{formatINRCompact(budget.totalAmount - budget.totalSpent)}</p>
              ) : (
                <p className="text-2xl font-bold text-red-600">-{formatINRCompact(budget.totalSpent - budget.totalAmount)}</p>
              )}
              <ProgressBar spent={budget.totalSpent} allocated={budget.totalAmount} />
            </div>
          </div>

          {/* 50/30/20 breakdown */}
          {budget.budgetMethod === 'fifty_thirty_twenty' && budget.needsAmount && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">50 / 30 / 20 Breakdown</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Needs (50%)', amount: budget.needsAmount, color: 'text-blue-600', bar: 'bg-blue-500' },
                  { label: 'Wants (30%)', amount: budget.wantsAmount!, color: 'text-purple-600', bar: 'bg-purple-500' },
                  { label: 'Savings (20%)', amount: budget.savingsAmount!, color: 'text-green-600', bar: 'bg-green-500' },
                ].map(b => (
                  <div key={b.label}>
                    <p className="text-xs text-gray-500 mb-1">{b.label}</p>
                    <p className={cn('text-lg font-bold', b.color)}>{formatINR(b.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category allocations */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Category Allocations</h3>
              <button onClick={() => setShowAllocate(true)} className="text-sm text-indigo-600 hover:underline">+ Add Category</button>
            </div>

            {budget.categories.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm">No categories allocated yet</p>
                <button onClick={() => setShowAllocate(true)} className="mt-2 text-sm text-indigo-600 hover:underline">Add your first allocation</button>
              </div>
            ) : (
              <div className="space-y-3">
                {budget.categories.map(bc => {
                  const pct = bc.allocatedAmount > 0n
                    ? Math.min(100, Math.round(Number(bc.spent * 100n) / Number(bc.allocatedAmount)))
                    : 0
                  const over = bc.spent > bc.allocatedAmount
                  const bucketMeta = BUCKET_META[bc.bucket]
                  return (
                    <div key={bc.id} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{bc.category.icon ?? '📌'}</span>
                          <span className="text-sm font-medium text-gray-700">{bc.category.name}</span>
                          <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', bucketMeta.color + ' text-white bg-opacity-80')}>
                            {bucketMeta.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn('text-sm font-medium', over ? 'text-red-600' : 'text-gray-700')}>
                            {formatINR(bc.spent)} <span className="text-gray-400 font-normal">/ {formatINR(bc.allocatedAmount)}</span>
                          </span>
                          <span className={cn('text-xs font-medium', over ? 'text-red-600' : 'text-gray-400')}>{pct}%</span>
                          <button
                            onClick={() => removeCategory.mutate({ budgetId: budget.id, categoryId: bc.categoryId })}
                            className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >✕</button>
                        </div>
                      </div>
                      <ProgressBar spent={bc.spent} allocated={bc.allocatedAmount} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {showCreate   && <CreateBudgetModal month={month} year={year} onClose={() => setShowCreate(false)} />}
      {showAllocate && budget && <AllocateCategoryModal budgetId={budget.id} month={month} year={year} onClose={() => setShowAllocate(false)} />}
    </div>
  )
}
