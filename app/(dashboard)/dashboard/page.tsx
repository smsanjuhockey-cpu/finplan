'use client'

import { useState } from 'react'
import { api } from '@/lib/trpc'
import { formatINR, formatINRCompact } from '@/lib/currency'
import { formatIndianDate } from '@/lib/indianFinancialCalendar'
import { cn } from '@/lib/utils'
import Link from 'next/link'

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? 'bg-green-500' : value >= 50 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-700">{value}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false)
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const { data: summary } = api.transactions.monthlySummary.useQuery({ month, year })
  const { data: debtSummary } = api.liabilities.totalDebt.useQuery()
  const { data: debtPlan } = api.debt.plan.useQuery({ strategy: 'avalanche', monthlyExtra: 0 })
  const { data: accounts } = api.accounts.totalBalance.useQuery()
  const { data: assets } = api.assets.totalValue.useQuery()
  const { data: healthData, refetch: refetchScore } = api.healthScore.getLatest.useQuery()
  const computeScore = api.healthScore.compute.useMutation({ onSuccess: () => refetchScore() })

  const totalAssets = assets?.total ?? 0n
  const totalLiabilities = debtSummary?.total ?? 0n
  const netWorth = totalAssets - totalLiabilities
  const totalBalance = accounts?.total ?? 0n
  const savingsRate = summary?.savingsRate ?? 0

  const healthScore = healthData?.overallScore ?? null
  const scoreColor = healthScore == null ? 'text-gray-400' : healthScore >= 75 ? 'text-green-600' : healthScore >= 50 ? 'text-amber-500' : 'text-red-600'
  const scoreLabel = healthScore == null ? 'Not computed' : healthScore >= 75 ? 'Good' : healthScore >= 50 ? 'Fair' : 'Needs attention'

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div className="space-y-5">

      {/* Top 3 KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Health Score */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 relative">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">Financial Health Score</p>
            {healthScore != null && (
              <button
                onClick={() => setShowScoreBreakdown(v => !v)}
                className="text-xs text-indigo-600 hover:underline"
              >
                {showScoreBreakdown ? 'Hide' : 'Details'}
              </button>
            )}
          </div>
          <div className="flex items-end gap-2">
            <p className={cn('text-4xl font-bold', scoreColor)}>{healthScore ?? '--'}</p>
            <p className={cn('text-sm font-medium mb-1', scoreColor)}>{scoreLabel}</p>
          </div>
          {healthScore != null ? (
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', healthScore >= 75 ? 'bg-green-500' : healthScore >= 50 ? 'bg-amber-400' : 'bg-red-500')}
                style={{ width: `${healthScore}%` }}
              />
            </div>
          ) : (
            <button
              onClick={() => computeScore.mutate()}
              disabled={computeScore.isPending}
              className="mt-2 text-xs text-indigo-600 hover:underline disabled:opacity-50"
            >
              {computeScore.isPending ? 'Computing...' : 'Compute score →'}
            </button>
          )}
          {healthScore != null && (
            <button
              onClick={() => computeScore.mutate()}
              disabled={computeScore.isPending}
              className="mt-2 text-xs text-gray-400 hover:text-indigo-600 block"
            >
              {computeScore.isPending ? 'Refreshing...' : 'Refresh score'}
            </button>
          )}
          {/* Breakdown popover */}
          {showScoreBreakdown && healthData && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-10 space-y-2.5">
              <p className="text-xs font-semibold text-gray-700 mb-3">Score Breakdown</p>
              <ScoreBar label="Savings Rate (25%)" value={healthData.savingsRate} />
              <ScoreBar label="Debt-to-Income (20%)" value={healthData.debtToIncome} />
              <ScoreBar label="Emergency Fund (20%)" value={healthData.emergencyFund} />
              <ScoreBar label="Budget Adherence (15%)" value={healthData.budgetAdherence} />
              <ScoreBar label="Goal Progress (10%)" value={healthData.goalProgress} />
              <ScoreBar label="Net Worth Growth (10%)" value={healthData.netWorthGrowth} />
            </div>
          )}
        </div>

        {/* Debt Free Date */}
        <div className={cn('rounded-xl border p-6', debtPlan ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200')}>
          <p className="text-sm text-gray-500 mb-1">Debt Free Date</p>
          {debtPlan ? (
            <>
              <p className="text-2xl font-bold text-green-700">
                {formatIndianDate(new Date(debtPlan.debtFreeDate))}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {debtPlan.debtFreeMonths} months · saves {formatINRCompact(debtPlan.interestSavedVsMinimum)} interest
              </p>
            </>
          ) : totalLiabilities === 0n ? (
            <>
              <p className="text-3xl font-bold text-green-600">🎉 Debt Free!</p>
              <p className="text-xs text-gray-400 mt-1">No active loans</p>
            </>
          ) : (
            <>
              <p className="text-4xl font-bold text-gray-300">--</p>
              <p className="text-xs text-gray-400 mt-1">Add your loans to calculate</p>
            </>
          )}
        </div>

        {/* Net Worth */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Net Worth</p>
          {(totalAssets > 0n || totalLiabilities > 0n) ? (
            <>
              <p className={cn('text-3xl font-bold', netWorth >= 0n ? 'text-gray-900' : 'text-red-600')}>
                {formatINRCompact(netWorth)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Assets {formatINRCompact(totalAssets)} · Debt {formatINRCompact(totalLiabilities)}
              </p>
            </>
          ) : (
            <>
              <p className="text-4xl font-bold text-gray-300">₹--</p>
              <p className="text-xs text-gray-400 mt-1">Add assets and liabilities</p>
            </>
          )}
        </div>
      </div>

      {/* This Month Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">{MONTHS[month - 1]} {year} — Monthly Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">Income</p>
            <p className="text-xl font-bold text-green-600 mt-1">{formatINR(summary?.income ?? 0n)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Expenses</p>
            <p className="text-xl font-bold text-red-500 mt-1">{formatINR(summary?.expenses ?? 0n)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Invested</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{formatINR(summary?.investments ?? 0n)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Saved</p>
            <p className={cn('text-xl font-bold mt-1', (summary?.savings ?? 0n) >= 0n ? 'text-gray-800' : 'text-red-600')}>
              {formatINR(summary?.savings ?? 0n)}
            </p>
            {summary && (
              <p className="text-xs text-gray-400">{summary.savingsRate.toFixed(1)}% savings rate</p>
            )}
          </div>
        </div>

        {/* Savings rate bar */}
        {summary && summary.income > 0n && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Spending breakdown</span>
              <span>{savingsRate.toFixed(1)}% saved</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full flex overflow-hidden gap-0.5">
              <div className="bg-red-400 rounded-l-full" style={{ width: `${Math.min(100, Number(summary.expenses * 100n / summary.income))}%` }} />
              <div className="bg-blue-400" style={{ width: `${Math.min(100, Number(summary.investments * 100n / summary.income))}%` }} />
              <div className="bg-green-400 rounded-r-full" style={{ width: `${Math.max(0, savingsRate)}%` }} />
            </div>
            <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Spent</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Invested</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Saved</span>
            </div>
          </div>
        )}
      </div>

      {/* Accounts + Debt at a glance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Total Balance</h3>
            <Link href="/accounts" className="text-xs text-indigo-600 hover:underline">Manage →</Link>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatINR(totalBalance)}</p>
          <p className="text-xs text-gray-400 mt-1">Across {accounts?.accounts?.length ?? 0} accounts</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Outstanding Debt</h3>
            <Link href="/debt" className="text-xs text-indigo-600 hover:underline">Optimize →</Link>
          </div>
          <p className="text-3xl font-bold text-red-600">{formatINR(totalLiabilities)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {debtSummary?.count ?? 0} active loans · {formatINR(debtSummary?.monthlyEmi ?? 0n)}/mo EMI
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/transactions', label: 'Add Transaction', icon: '💸' },
            { href: '/debt',         label: 'Debt Planner',    icon: '🎯' },
            { href: '/accounts',     label: 'Accounts',        icon: '🏦' },
            { href: '/goals',        label: 'Set a Goal',      icon: '🏆' },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors text-center"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-xs font-medium text-gray-700">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
