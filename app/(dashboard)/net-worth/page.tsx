'use client'

import { useState } from 'react'
import { api } from '@/lib/trpc'
import { formatINR, formatINRCompact } from '@/lib/currency'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const ASSET_META: Record<string, { label: string; icon: string; color: string }> = {
  savings_account: { label: 'Savings Account', icon: '🏦', color: '#22c55e' },
  fd:              { label: 'Fixed Deposit',    icon: '🔒', color: '#f97316' },
  rd:              { label: 'Recurring Deposit',icon: '📅', color: '#ec4899' },
  mutual_fund:     { label: 'Mutual Fund',      icon: '📊', color: '#6366f1' },
  stocks:          { label: 'Stocks / Demat',   icon: '📈', color: '#84cc16' },
  ppf:             { label: 'PPF',              icon: '🏛️', color: '#10b981' },
  epf:             { label: 'EPF',              icon: '🏗️', color: '#059669' },
  nps:             { label: 'NPS',              icon: '🎯', color: '#0ea5e9' },
  real_estate:     { label: 'Real Estate',      icon: '🏠', color: '#8b5cf6' },
  gold_physical:   { label: 'Gold (Physical)',  icon: '🪙', color: '#eab308' },
  gold_etf:        { label: 'Gold ETF',         icon: '🥇', color: '#ca8a04' },
  sgb:             { label: 'Sovereign Gold Bond', icon: '🏅', color: '#b45309' },
  crypto:          { label: 'Crypto',           icon: '₿',  color: '#f59e0b' },
  other:           { label: 'Other',            icon: '💼', color: '#94a3b8' },
}

const LIABILITY_META: Record<string, { label: string; icon: string }> = {
  home_loan:      { label: 'Home Loan',      icon: '🏠' },
  car_loan:       { label: 'Car Loan',       icon: '🚗' },
  personal_loan:  { label: 'Personal Loan',  icon: '💳' },
  education_loan: { label: 'Education Loan', icon: '🎓' },
  credit_card:    { label: 'Credit Card',    icon: '💳' },
  gold_loan:      { label: 'Gold Loan',      icon: '🪙' },
  business_loan:  { label: 'Business Loan',  icon: '🏢' },
  other:          { label: 'Other Loan',     icon: '📄' },
}

function AddAssetModal({ onClose }: { onClose: () => void }) {
  const utils = api.useUtils()
  const [form, setForm] = useState({
    name: '',
    assetType: 'fixed_deposit',
    currentValue: '',
    notes: '',
  })

  const create = api.assets.create.useMutation({
    onSuccess: () => {
      utils.assets.list.invalidate()
      utils.assets.totalValue.invalidate()
      utils.netWorth.summary.invalidate()
      onClose()
    },
  })

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const meta = ASSET_META[form.assetType]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Add Asset</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form
          className="p-6 space-y-4"
          onSubmit={e => {
            e.preventDefault()
            create.mutate({
              name: form.name,
                      assetType: form.assetType as 'savings_account' | 'fd' | 'rd' | 'mutual_fund' | 'stocks' | 'ppf' | 'epf' | 'nps' | 'real_estate' | 'gold_physical' | 'gold_etf' | 'sgb' | 'crypto' | 'other',
              currentValue: parseFloat(form.currentValue),
              notes: form.notes || undefined,
            })
          }}
        >
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 text-xs text-blue-700">
            ℹ We only need the current value in ₹ — no account numbers or sensitive details.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
            <select
              value={form.assetType}
              onChange={e => setForm(f => ({ ...f, assetType: e.target.value }))}
              className={inputClass}
            >
              {Object.entries(ASSET_META).map(([v, m]) => (
                <option key={v} value={v}>{m.icon} {m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={`e.g. SBI ${meta.label}`}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Value (₹)</label>
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={form.currentValue}
              onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))}
              placeholder="0"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">Enter the current market value / balance today</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Matures in Mar 2027"
              className={inputClass}
            />
          </div>

          {create.error && <p className="text-sm text-red-600">{create.error.message}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={create.isPending}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {create.isPending ? 'Adding…' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NetWorthPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [snapshotMsg, setSnapshotMsg] = useState('')

  const { data: assets, isLoading } = api.assets.list.useQuery()
  const { data: summary } = api.netWorth.summary.useQuery()
  const { data: liabilities } = api.liabilities.list.useQuery()
  const { data: history } = api.netWorth.getHistory.useQuery({ limit: 12 })
  const utils = api.useUtils()

  const takeSnapshot = api.netWorth.takeSnapshot.useMutation({
    onSuccess: () => {
      utils.netWorth.getHistory.invalidate()
      setSnapshotMsg('Snapshot saved!')
      setTimeout(() => setSnapshotMsg(''), 3000)
    },
  })

  const updateAsset = api.assets.update.useMutation({
    onSuccess: () => {
      utils.assets.list.invalidate()
      utils.assets.totalValue.invalidate()
      utils.netWorth.summary.invalidate()
      setEditId(null)
    },
  })

  const deleteAsset = api.assets.delete.useMutation({
    onSuccess: () => {
      utils.assets.list.invalidate()
      utils.assets.totalValue.invalidate()
      utils.netWorth.summary.invalidate()
    },
  })

  const totalAssets = summary?.totalAssets ?? 0n
  const totalLiabilities = summary?.totalLiabilities ?? 0n
  const netWorth = summary?.netWorth ?? 0n

  // Group assets by type
  const grouped = (assets ?? []).reduce<Record<string, typeof assets>>((acc, a) => {
    if (!acc[a!.assetType]) acc[a!.assetType] = []
    acc[a!.assetType]!.push(a)
    return acc
  }, {})

  // Asset type breakdown for composition bar
  const breakdown = summary?.assetBreakdown ?? {}
  const breakdownEntries = Object.entries(breakdown)
    .map(([type, val]) => ({ type, value: val as bigint }))
    .filter(e => e.value > 0n)
    .sort((a, b) => Number(b.value - a.value))

  return (
    <div className="space-y-5">

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Assets</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{formatINR(totalAssets)}</p>
          <p className="text-xs text-gray-400 mt-1">{summary?.assetCount ?? 0} assets tracked</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Liabilities</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{formatINR(totalLiabilities)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {summary?.liabilityCount ?? 0} loans ·{' '}
            <Link href="/debt" className="text-indigo-500 hover:underline">Manage →</Link>
          </p>
        </div>

        <div className={cn(
          'rounded-xl border p-5',
          netWorth >= 0n ? 'bg-indigo-50 border-indigo-200' : 'bg-red-50 border-red-200'
        )}>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Net Worth</p>
          <p className={cn('text-3xl font-bold mt-1', netWorth >= 0n ? 'text-indigo-700' : 'text-red-700')}>
            {formatINR(netWorth)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Assets − Liabilities</p>
        </div>
      </div>

      {/* Composition bar */}
      {breakdownEntries.length > 0 && totalAssets > 0n && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Asset Composition</h3>
          <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
            {breakdownEntries.map(({ type, value }) => {
              const pct = Number(value * 10000n / totalAssets) / 100
              const meta = ASSET_META[type]
              return (
                <div
                  key={type}
                  style={{ width: `${pct}%`, backgroundColor: meta?.color ?? '#94a3b8' }}
                  title={`${meta?.label}: ${formatINRCompact(value)} (${pct.toFixed(1)}%)`}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
            {breakdownEntries.map(({ type, value }) => {
              const pct = Number(value * 10000n / totalAssets) / 100
              const meta = ASSET_META[type]
              return (
                <div key={type} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta?.color }} />
                  <span>{meta?.icon} {meta?.label}</span>
                  <span className="text-gray-400">{formatINRCompact(value)} · {pct.toFixed(1)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Assets list */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Your Assets</h3>
            <p className="text-xs text-gray-400 mt-0.5">Enter current market value — no account numbers needed</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Add Asset
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (assets?.length ?? 0) === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">📈</p>
            <p className="text-gray-600 font-medium">No assets added yet</p>
            <p className="text-gray-400 text-sm mt-1">Add your FDs, mutual funds, gold, PPF, EPF to track your net worth</p>
            <button onClick={() => setShowAdd(true)}
              className="mt-4 bg-indigo-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-indigo-700">
              Add First Asset
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([type, items]) => {
              const meta = ASSET_META[type] ?? { label: type, icon: '💼', color: '#94a3b8' }
              const groupTotal = (items ?? []).reduce((s, a) => s + a!.currentValue, 0n)
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{meta.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{meta.label}</span>
                      <span className="text-xs text-gray-400">({(items ?? []).length})</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{formatINR(groupTotal)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {(items ?? []).map(asset => {
                      if (!asset) return null
                      const isEditing = editId === asset.id
                      return (
                        <div key={asset.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{asset.name}</p>
                            {asset.notes && <p className="text-xs text-gray-400 mt-0.5">{asset.notes}</p>}
                          </div>
                          <div className="flex items-center gap-3">
                            {isEditing ? (
                              <>
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  className="w-32 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                                  autoFocus
                                />
                                <button
                                  onClick={() => updateAsset.mutate({ id: asset.id, currentValue: parseFloat(editValue) || 0 })}
                                  className="text-xs text-green-600 hover:text-green-800 font-medium"
                                >Save</button>
                                <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                              </>
                            ) : (
                              <>
                                <span className="text-sm font-semibold text-gray-900">{formatINR(asset.currentValue)}</span>
                                <button
                                  onClick={() => { setEditId(asset.id); setEditValue((Number(asset.currentValue) / 100).toString()) }}
                                  className="text-xs text-indigo-500 hover:text-indigo-700"
                                >Edit</button>
                                <button
                                  onClick={() => { if (confirm('Remove this asset?')) deleteAsset.mutate({ id: asset.id }) }}
                                  className="text-xs text-red-400 hover:text-red-600"
                                >Delete</button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Liabilities — read-only from debt module */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Liabilities</h3>
            <p className="text-xs text-gray-400 mt-0.5">Pulled from your Debt Plan — manage them there</p>
          </div>
          <Link href="/debt" className="text-sm text-indigo-600 hover:underline">Manage Loans →</Link>
        </div>

        {(liabilities?.length ?? 0) === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-400 text-sm">No loans added yet.</p>
            <Link href="/debt" className="text-indigo-500 text-sm hover:underline mt-1 inline-block">Add loans in Debt Planner →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {liabilities?.map(loan => {
              const meta = LIABILITY_META[loan.liabilityType] ?? { label: loan.liabilityType, icon: '📄' }
              return (
                <div key={loan.id} className="flex items-center justify-between bg-red-50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{meta.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{loan.name}</p>
                      <p className="text-xs text-gray-400">{meta.label} · {Number(loan.interestRate)}% p.a.</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-red-600">{formatINR(loan.outstandingAmount)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Snapshot history */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Snapshot History</h3>
            <p className="text-xs text-gray-400 mt-0.5">Save a snapshot today to track your net worth over time</p>
          </div>
          <div className="flex items-center gap-3">
            {snapshotMsg && <span className="text-xs text-green-600 font-medium">{snapshotMsg}</span>}
            <button
              onClick={() => takeSnapshot.mutate()}
              disabled={takeSnapshot.isPending}
              className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {takeSnapshot.isPending ? 'Saving…' : '📸 Take Snapshot'}
            </button>
          </div>
        </div>

        {!history?.length ? (
          <p className="text-center text-sm text-gray-400 py-6">No snapshots yet. Take your first one!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="text-left pb-2 font-medium">Date</th>
                  <th className="text-right pb-2 font-medium">Assets</th>
                  <th className="text-right pb-2 font-medium">Liabilities</th>
                  <th className="text-right pb-2 font-medium">Net Worth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map(snap => (
                  <tr key={snap.id} className="hover:bg-gray-50">
                    <td className="py-2.5 text-gray-600">
                      {new Date(snap.snapshotDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-2.5 text-right text-green-600 font-medium">{formatINRCompact(snap.totalAssets)}</td>
                    <td className="py-2.5 text-right text-red-500">{formatINRCompact(snap.totalLiabilities)}</td>
                    <td className={cn('py-2.5 text-right font-bold', snap.netWorth >= 0n ? 'text-indigo-600' : 'text-red-600')}>
                      {formatINRCompact(snap.netWorth)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddAssetModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
