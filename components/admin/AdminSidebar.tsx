'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const ADMIN_NAV = [
  { href: '/admin/overview', label: 'Overview', icon: '📊' },
  { href: '/admin/users',    label: 'Users',    icon: '👥' },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-56 bg-gray-900 min-h-screen flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">FinPlan</span>
          <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded uppercase tracking-widest">Admin</span>
        </div>
        <p className="text-gray-400 text-xs mt-1">Platform Console</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {ADMIN_NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-gray-700 space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <span>←</span> Back to App
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <span>⎋</span> Sign Out
        </button>
      </div>
    </aside>
  )
}
