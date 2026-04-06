'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Dashboard',    icon: '📊' },
  { href: '/transactions',  label: 'Transactions', icon: '💸' },
  { href: '/budget',        label: 'Budget',       icon: '📅' },
  { href: '/debt',          label: 'Debt Plan',    icon: '🎯' },
  { href: '/forecast',      label: 'Forecast',     icon: '🔮' },
  { href: '/goals',         label: 'Goals',        icon: '🏆' },
  { href: '/net-worth',     label: 'Net Worth',    icon: '📈' },
  { href: '/ai-chat',       label: 'Ask AI',       icon: '🤖' },
  { href: '/accounts',      label: 'Accounts',     icon: '🏦' },
  { href: '/settings',      label: 'Settings',     icon: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-200 min-h-screen">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-indigo-600">FinPlan</h1>
        <p className="text-xs text-gray-400 mt-0.5">Financial Operating System</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">FinPlan v1.0</p>
      </div>
    </aside>
  )
}
