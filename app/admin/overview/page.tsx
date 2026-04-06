'use client'

import { api } from '@/lib/trpc'
import { formatINRCompact } from '@/lib/currency'
import Link from 'next/link'

function StatCard({ label, value, sub, color = 'text-gray-900' }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminOverviewPage() {
  const { data: stats, isLoading } = api.admin.platformStats.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-sm text-gray-400 mt-0.5">Real-time stats across all FinPlan users</p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats.totalUsers}
          sub={`${stats.onboardedUsers} completed onboarding`}
        />
        <StatCard
          label="Active Last 30 Days"
          value={stats.activeUsersLast30d}
          sub="Users with transactions"
          color="text-green-600"
        />
        <StatCard
          label="Total Transactions"
          value={stats.totalTransactions.toLocaleString('en-IN')}
          sub="Platform-wide"
        />
        <StatCard
          label="Total Debt Tracked"
          value={formatINRCompact(stats.totalDebtTracked)}
          sub={`${stats.totalLiabilityCount} active loans`}
          color="text-red-600"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Assets Tracked"
          value={formatINRCompact(stats.totalAssetsValue)}
          sub={`${stats.totalAssetCount} asset entries`}
          color="text-indigo-600"
        />
        <StatCard label="Goals Created" value={stats.totalGoals} />
        <StatCard
          label="New This Month"
          value={stats.newThisMonth}
          sub={`${stats.newThisWeek} this week`}
          color="text-blue-600"
        />
        <StatCard
          label="Suspended / Admins"
          value={`${stats.suspendedUsers} / ${stats.adminUsers}`}
          sub="Suspended · Admin accounts"
          color="text-amber-600"
        />
      </div>

      {/* Recent signups */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent Signups</h2>
          <Link href="/admin/users" className="text-xs text-indigo-600 hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2 font-medium">User</th>
                <th className="text-left pb-2 font-medium">Joined</th>
                <th className="text-left pb-2 font-medium">Onboarded</th>
                <th className="text-left pb-2 font-medium">Role</th>
                <th className="text-left pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.recentSignups.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="py-2.5">
                    <p className="font-medium text-gray-800">{u.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="py-2.5 text-gray-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-2.5">
                    {u.onboardingCompleted
                      ? <span className="text-green-600 text-xs font-medium">✓ Done</span>
                      : <span className="text-gray-400 text-xs">Pending</span>
                    }
                  </td>
                  <td className="py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <Link href={`/admin/users/${u.id}`} className="text-xs text-indigo-500 hover:underline">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
