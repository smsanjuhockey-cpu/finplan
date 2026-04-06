'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/trpc'
import { formatINR, formatINRCompact } from '@/lib/currency'
import { cn } from '@/lib/utils'

const EMPLOYMENT_LABELS: Record<string, string> = {
  salaried: 'Salaried', self_employed: 'Self-employed', freelancer: 'Freelancer',
  business_owner: 'Business Owner', retired: 'Retired', student: 'Student',
}
const LIABILITY_LABELS: Record<string, string> = {
  home_loan: 'Home Loan', car_loan: 'Car Loan', personal_loan: 'Personal Loan',
  education_loan: 'Education Loan', credit_card: 'Credit Card', gold_loan: 'Gold Loan',
  business_loan: 'Business Loan', other: 'Other',
}
const ASSET_LABELS: Record<string, string> = {
  savings_account: 'Savings', fd: 'FD', rd: 'RD', mutual_fund: 'Mutual Fund',
  stocks: 'Stocks', ppf: 'PPF', epf: 'EPF', nps: 'NPS',
  real_estate: 'Real Estate', gold_physical: 'Gold', gold_etf: 'Gold ETF',
  sgb: 'SGB', crypto: 'Crypto', other: 'Other',
}

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()
  const utils = api.useUtils()

  const [confirmAction, setConfirmAction] = useState<'suspend' | 'unsuspend' | 'delete' | 'promote' | 'demote' | null>(null)

  const { data: user, isLoading } = api.admin.getUserDetail.useQuery({ userId })

  const suspendUser = api.admin.suspendUser.useMutation({
    onSuccess: () => { utils.admin.getUserDetail.invalidate({ userId }); setConfirmAction(null) },
  })
  const unsuspendUser = api.admin.unsuspendUser.useMutation({
    onSuccess: () => { utils.admin.getUserDetail.invalidate({ userId }); setConfirmAction(null) },
  })
  const setRole = api.admin.setRole.useMutation({
    onSuccess: () => { utils.admin.getUserDetail.invalidate({ userId }); setConfirmAction(null) },
  })
  const deleteUser = api.admin.deleteUser.useMutation({
    onSuccess: () => router.push('/admin/users'),
  })

  if (isLoading) return <div className="text-gray-400 text-sm p-8">Loading…</div>
  if (!user) return <div className="text-gray-400 text-sm p-8">User not found.</div>

  const isSuspended = !!user.suspendedAt
  const isAdmin = user.role === 'admin'

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <a href="/admin/users" className="hover:text-gray-600">Users</a>
        <span>/</span>
        <span className="text-gray-700">{user.name ?? user.email}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Profile */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                {user.name?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase()}
              </div>
              <div className="flex gap-1.5">
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                )}>{user.role}</span>
                {isSuspended
                  ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Suspended</span>
                  : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                }
              </div>
            </div>

            <h2 className="font-semibold text-gray-900">{user.name ?? '—'}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>

            <div className="mt-4 space-y-2 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Employment</span>
                <span className="font-medium text-gray-700">{EMPLOYMENT_LABELS[user.employmentType] ?? user.employmentType}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax Regime</span>
                <span className="font-medium text-gray-700">{user.taxRegime === 'new' ? 'New Regime' : 'Old Regime'}</span>
              </div>
              {user.annualIncome && (
                <div className="flex justify-between">
                  <span>Annual Income</span>
                  <span className="font-medium text-gray-700">{formatINRCompact(user.annualIncome)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Onboarded</span>
                <span className={cn('font-medium', user.onboardingCompleted ? 'text-green-600' : 'text-gray-400')}>
                  {user.onboardingCompleted ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Joined</span>
                <span className="font-medium text-gray-700">
                  {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              {isSuspended && (
                <div className="flex justify-between">
                  <span>Suspended</span>
                  <span className="font-medium text-red-600">
                    {new Date(user.suspendedAt!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Actions</p>

            {/* Suspend / Unsuspend */}
            {isSuspended ? (
              confirmAction === 'unsuspend' ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs">
                  <p className="text-green-800 mb-2">Restore this account?</p>
                  <div className="flex gap-2">
                    <button onClick={() => unsuspendUser.mutate({ userId })}
                      className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-medium">Confirm</button>
                    <button onClick={() => setConfirmAction(null)} className="text-gray-500">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmAction('unsuspend')}
                  className="w-full text-left text-sm text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg px-3 py-2">
                  ✓ Unsuspend Account
                </button>
              )
            ) : (
              confirmAction === 'suspend' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                  <p className="text-amber-800 mb-2">Suspend this user? They will be redirected to a suspension page.</p>
                  <div className="flex gap-2">
                    <button onClick={() => suspendUser.mutate({ userId })}
                      className="bg-amber-600 text-white px-3 py-1 rounded-lg text-xs font-medium">Suspend</button>
                    <button onClick={() => setConfirmAction(null)} className="text-gray-500">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmAction('suspend')}
                  className="w-full text-left text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠ Suspend Account
                </button>
              )
            )}

            {/* Role change */}
            {isAdmin ? (
              confirmAction === 'demote' ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
                  <p className="text-gray-800 mb-2">Remove admin role?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setRole.mutate({ userId, role: 'user' })}
                      className="bg-gray-700 text-white px-3 py-1 rounded-lg text-xs font-medium">Confirm</button>
                    <button onClick={() => setConfirmAction(null)} className="text-gray-500">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmAction('demote')}
                  className="w-full text-left text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
                  Remove Admin Role
                </button>
              )
            ) : (
              confirmAction === 'promote' ? (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs">
                  <p className="text-indigo-800 mb-2">Grant admin role to this user?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setRole.mutate({ userId, role: 'admin' })}
                      className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-medium">Confirm</button>
                    <button onClick={() => setConfirmAction(null)} className="text-gray-500">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmAction('promote')}
                  className="w-full text-left text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-2">
                  Make Admin
                </button>
              )
            )}

            {/* Delete */}
            {confirmAction === 'delete' ? (
              <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-xs">
                <p className="text-red-800 font-medium mb-1">Permanently delete this user?</p>
                <p className="text-red-600 mb-2">All their data (transactions, loans, assets, goals) will be deleted. This cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => deleteUser.mutate({ userId, confirm: true })}
                    disabled={deleteUser.isPending}
                    className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-medium disabled:opacity-50">
                    {deleteUser.isPending ? 'Deleting…' : 'Delete Permanently'}
                  </button>
                  <button onClick={() => setConfirmAction(null)} className="text-gray-500">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmAction('delete')}
                className="w-full text-left text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-3 py-2">
                🗑 Delete User
              </button>
            )}
          </div>
        </div>

        {/* Right: Activity */}
        <div className="lg:col-span-2 space-y-4">

          {/* Counts */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Transactions', value: user.counts.transactions },
              { label: 'Accounts', value: user.counts.accounts },
              { label: 'Goals', value: user.counts.goals },
              { label: 'Loans', value: user.counts.liabilities },
              { label: 'Assets', value: user.counts.assets },
              { label: 'AI Messages', value: user.counts.aiChatMessages },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Financial snapshot */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Financial Snapshot</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400">Total Account Balance</p>
                <p className="font-bold text-gray-900 mt-0.5">{formatINR(user.totalBalance)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Most Recent Transaction</p>
                <p className="font-medium text-gray-700 mt-0.5">
                  {user.mostRecentTxnDate
                    ? new Date(user.mostRecentTxnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </p>
              </div>
            </div>

            {/* Transaction type breakdown */}
            {Object.keys(user.txnTypeCounts).length > 0 && (
              <div className="mt-3 flex gap-3 flex-wrap">
                {Object.entries(user.txnTypeCounts).map(([type, count]) => (
                  <span key={type} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full capitalize">
                    {type}: {count}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Liability breakdown */}
          {Object.keys(user.liabilityBreakdown).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Loans</h3>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-400">
                  <tr>
                    <th className="text-left pb-1">Type</th>
                    <th className="text-right pb-1">Count</th>
                    <th className="text-right pb-1">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(user.liabilityBreakdown).map(([type, data]) => (
                    <tr key={type}>
                      <td className="py-1.5 text-gray-700">{LIABILITY_LABELS[type] ?? type}</td>
                      <td className="py-1.5 text-right text-gray-500">{data.count}</td>
                      <td className="py-1.5 text-right font-medium text-red-600">{formatINRCompact(data.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Asset breakdown */}
          {Object.keys(user.assetBreakdown).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Assets</h3>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-400">
                  <tr>
                    <th className="text-left pb-1">Type</th>
                    <th className="text-right pb-1">Count</th>
                    <th className="text-right pb-1">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(user.assetBreakdown).map(([type, data]) => (
                    <tr key={type}>
                      <td className="py-1.5 text-gray-700">{ASSET_LABELS[type] ?? type}</td>
                      <td className="py-1.5 text-right text-gray-500">{data.count}</td>
                      <td className="py-1.5 text-right font-medium text-green-600">{formatINRCompact(data.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
