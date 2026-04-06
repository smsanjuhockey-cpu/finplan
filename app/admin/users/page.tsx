'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/trpc'
import { formatINRCompact } from '@/lib/currency'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'user' | 'admin' | undefined>()
  const [suspendedFilter, setSuspendedFilter] = useState<boolean | undefined>()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    api.admin.listUsers.useInfiniteQuery(
      { limit: 50, search: debouncedSearch || undefined, role: roleFilter, suspended: suspendedFilter },
      { getNextPageParam: (last) => last.nextCursor }
    )

  const users = data?.pages.flatMap(p => p.items) ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-400 mt-0.5">{users.length} users shown</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={roleFilter ?? ''}
          onChange={e => setRoleFilter(e.target.value === '' ? undefined : e.target.value as 'user' | 'admin')}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={suspendedFilter === undefined ? '' : suspendedFilter ? 'suspended' : 'active'}
          onChange={e => setSuspendedFilter(e.target.value === '' ? undefined : e.target.value === 'suspended')}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No users found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">User</th>
                    <th className="text-left px-4 py-3 font-medium">Role</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Joined</th>
                    <th className="text-left px-4 py-3 font-medium">Onboarded</th>
                    <th className="text-right px-4 py-3 font-medium">Transactions</th>
                    <th className="text-right px-4 py-3 font-medium">Loans</th>
                    <th className="text-right px-4 py-3 font-medium">Total Debt</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{u.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                        )}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.suspendedAt
                          ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Suspended</span>
                          : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.onboardingCompleted ? '✓' : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{u._count.transactions}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{u._count.liabilities}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">
                        {u.totalDebt > 0n ? formatINRCompact(u.totalDebt) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${u.id}`} className="text-xs text-indigo-500 hover:underline whitespace-nowrap">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasNextPage && (
              <div className="p-4 border-t border-gray-100 text-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="text-sm text-indigo-600 hover:underline disabled:opacity-50"
                >
                  {isFetchingNextPage ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
