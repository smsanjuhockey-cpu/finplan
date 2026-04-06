'use client'

import { useState } from 'react'
import { api } from '@/lib/trpc'
import { formatINR } from '@/lib/currency'
import { cn } from '@/lib/utils'

const ACCOUNT_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  savings:     { label: 'Savings',     icon: '🏦', color: '#6366f1' },
  current:     { label: 'Current',     icon: '🏢', color: '#8b5cf6' },
  salary:      { label: 'Salary',      icon: '💼', color: '#06b6d4' },
  wallet:      { label: 'Wallet',      icon: '👛', color: '#f59e0b' },
  credit_card: { label: 'Credit Card', icon: '💳', color: '#ef4444' },
  ppf:         { label: 'PPF',         icon: '🏛️', color: '#10b981' },
  epf:         { label: 'EPF',         icon: '🏗️', color: '#059669' },
  nps:         { label: 'NPS',         icon: '📊', color: '#0ea5e9' },
  fd:          { label: 'Fixed Deposit', icon: '🔒', color: '#f97316' },
  rd:          { label: 'Recurring Deposit', icon: '📅', color: '#ec4899' },
  demat:       { label: 'Demat / Stocks', icon: '📈', color: '#84cc16' },
}

interface AddAccountFormProps {
  onClose: () => void
}

function AddAccountForm({ onClose }: AddAccountFormProps) {
  const utils = api.useUtils()
  const [form, setForm] = useState({
    name: '',
    accountType: 'savings',
    institutionName: '',
    currentBalance: '',
    icon: '',
    color: '',
  })

  const create = api.accounts.create.useMutation({
    onSuccess: () => {
      utils.accounts.list.invalidate()
      utils.accounts.totalBalance.invalidate()
      onClose()
    },
  })

  const meta = ACCOUNT_TYPE_META[form.accountType]

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Add Account</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form
          className="p-6 space-y-4"
          onSubmit={e => {
            e.preventDefault()
            create.mutate({
              name: form.name,
              accountType: form.accountType as Parameters<typeof create.mutate>[0]['accountType'],
              institutionName: form.institutionName || undefined,
              currentBalance: parseFloat(form.currentBalance) || 0,
              icon: form.icon || meta.icon,
              color: form.color || meta.color,
            })
          }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
            <select
              value={form.accountType}
              onChange={e => setForm(f => ({ ...f, accountType: e.target.value }))}
              className={inputClass}
            >
              {Object.entries(ACCOUNT_TYPE_META).map(([v, m]) => (
                <option key={v} value={v}>{m.icon} {m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={`e.g. HDFC ${meta.label}`}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Institution (optional)</label>
            <input
              value={form.institutionName}
              onChange={e => setForm(f => ({ ...f, institutionName: e.target.value }))}
              placeholder="e.g. HDFC Bank, SBI"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Balance (₹)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.currentBalance}
              onChange={e => setForm(f => ({ ...f, currentBalance: e.target.value }))}
              placeholder="0"
              className={inputClass}
            />
          </div>
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
              {create.isPending ? 'Adding…' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AccountsPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editBalance, setEditBalance] = useState('')

  const { data: accounts, isLoading } = api.accounts.list.useQuery()
  const { data: totals } = api.accounts.totalBalance.useQuery()
  const utils = api.useUtils()

  const updateBalance = api.accounts.updateBalance.useMutation({
    onSuccess: () => {
      utils.accounts.list.invalidate()
      utils.accounts.totalBalance.invalidate()
      setEditId(null)
    },
  })

  const deleteAccount = api.accounts.delete.useMutation({
    onSuccess: () => {
      utils.accounts.list.invalidate()
      utils.accounts.totalBalance.invalidate()
    },
  })

  const totalBalance = totals?.total ?? 0n

  // Group accounts by type
  const grouped = (accounts ?? []).reduce<Record<string, typeof accounts>>((acc, a) => {
    const key = a!.accountType
    if (!acc[key]) acc[key] = []
    acc[key]!.push(a)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Total balance card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl p-6 text-white">
          <p className="text-indigo-200 text-sm">Total Balance Across All Accounts</p>
          <p className="text-4xl font-bold mt-1">{formatINR(totalBalance)}</p>
          <p className="text-indigo-200 text-sm mt-2">{accounts?.length ?? 0} account{accounts?.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between">
          <p className="text-sm text-gray-500">Quick Actions</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 w-full bg-indigo-600 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            + Add Account
          </button>
        </div>
      </div>

      {/* Account groups */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (accounts?.length ?? 0) === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-4xl mb-3">🏦</p>
          <p className="text-gray-700 font-medium">No accounts yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your bank accounts, FDs, wallets to track your finances</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 bg-indigo-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-indigo-700"
          >
            Add First Account
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([type, accs]) => {
            const meta = ACCOUNT_TYPE_META[type] ?? { label: type, icon: '💰', color: '#6366f1' }
            const groupTotal = (accs ?? []).reduce((s, a) => s + a!.currentBalance, 0n)
            return (
              <div key={type} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meta.icon}</span>
                    <span className="font-medium text-gray-800">{meta.label}</span>
                    <span className="text-xs text-gray-400">({(accs ?? []).length})</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{formatINR(groupTotal)}</span>
                </div>
                <div className="space-y-2">
                  {(accs ?? []).map((account) => {
                    if (!account) return null
                    const isEditing = editId === account.id
                    return (
                      <div
                        key={account.id}
                        className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                            style={{ backgroundColor: `${account.color ?? '#6366f1'}20`, color: account.color ?? '#6366f1' }}
                          >
                            {account.icon}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{account.name}</p>
                            {account.institutionName && (
                              <p className="text-xs text-gray-400">{account.institutionName}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={editBalance}
                                onChange={e => setEditBalance(e.target.value)}
                                className="w-32 border border-gray-300 rounded px-2 py-1 text-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => updateBalance.mutate({ id: account.id, currentBalance: parseFloat(editBalance) || 0 })}
                                className="text-xs text-green-600 hover:text-green-800 font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditId(null)}
                                className="text-xs text-gray-400 hover:text-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className={cn(
                                'text-sm font-semibold',
                                account.accountType === 'credit_card' ? 'text-red-600' : 'text-gray-900'
                              )}>
                                {formatINR(account.currentBalance)}
                              </span>
                              <button
                                onClick={() => {
                                  setEditId(account.id)
                                  setEditBalance((Number(account.currentBalance) / 100).toString())
                                }}
                                className="text-xs text-indigo-500 hover:text-indigo-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Remove this account?')) {
                                    deleteAccount.mutate({ id: account.id })
                                  }
                                }}
                                className="text-xs text-red-400 hover:text-red-600"
                              >
                                Delete
                              </button>
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

      {showAdd && <AddAccountForm onClose={() => setShowAdd(false)} />}
    </div>
  )
}
