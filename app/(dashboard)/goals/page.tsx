'use client'

import { useState } from 'react'
import { api, type RouterOutputs } from '@/lib/trpc'
import { formatINR, formatINRCompact } from '@/lib/currency'
import { cn } from '@/lib/utils'

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  emergency_fund:     { label: 'Emergency Fund',   icon: '🛡️' },
  home_purchase:      { label: 'Home Purchase',    icon: '🏠' },
  vehicle:            { label: 'Vehicle',          icon: '🚗' },
  vacation:           { label: 'Vacation',         icon: '✈️' },
  education:          { label: 'Education',        icon: '🎓' },
  wedding:            { label: 'Wedding',          icon: '💍' },
  retirement:         { label: 'Retirement',       icon: '🌴' },
  children_education: { label: 'Child Education', icon: '📚' },
  custom:             { label: 'Custom',           icon: '⭐' },
}

const PRIORITY_META = {
  high:   { label: 'High',   color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200' },
  medium: { label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  low:    { label: 'Low',    color: 'text-gray-500',  bg: 'bg-gray-50',  border: 'border-gray-200' },
}

const STATUS_META = {
  active:    { label: 'Active',    color: 'text-green-700', bg: 'bg-green-100' },
  paused:    { label: 'Paused',    color: 'text-amber-700', bg: 'bg-amber-100' },
  completed: { label: 'Completed', color: 'text-blue-700',  bg: 'bg-blue-100'  },
  abandoned: { label: 'Abandoned', color: 'text-gray-500',  bg: 'bg-gray-100'  },
}

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

type GoalType = RouterOutputs['goals']['list'][0]

function GoalModal({ onClose, editGoal }: { onClose: () => void; editGoal?: GoalType }) {
  const utils = api.useUtils()
  const { data: recurringRules } = api.recurring.list.useQuery()

  const [form, setForm] = useState({
    name:               editGoal?.name ?? '',
    description:        editGoal?.description ?? '',
    category:           editGoal?.category ?? 'custom',
    targetAmount:       editGoal ? (Number(editGoal.targetAmount) / 100).toString() : '',
    targetDate:         editGoal?.targetDate ? new Date(editGoal.targetDate).toISOString().split('T')[0] : '',
    priority:           editGoal?.priority ?? 'medium',
    linkedSipRuleId:    editGoal?.linkedSipRuleId ?? '',
    expectedReturnRate: editGoal?.expectedReturnRate ? String(editGoal.expectedReturnRate) : '',
  })

  const create = api.goals.create.useMutation({ onSuccess: () => { utils.goals.list.invalidate(); onClose() } })
  const update = api.goals.update.useMutation({ onSuccess: () => { utils.goals.list.invalidate(); onClose() } })
  const isPending = create.isPending || update.isPending
  const error = create.error || update.error

  const sipRules = (recurringRules ?? []).filter(r => r.instrumentType === 'sip')

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name:               form.name,
      description:        form.description || undefined,
      category:           form.category as GoalType['category'],
      targetAmount:       parseFloat(form.targetAmount),
      targetDate:         form.targetDate || undefined,
      priority:           form.priority as GoalType['priority'],
      linkedSipRuleId:    form.linkedSipRuleId || undefined,
      expectedReturnRate: form.expectedReturnRate ? parseFloat(form.expectedReturnRate) : undefined,
    }
    if (editGoal) update.mutate({ id: editGoal.id, ...payload })
    else create.mutate(payload)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{editGoal ? 'Edit Goal' : 'New Goal'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal Name</label>
            <input required value={form.name} onChange={set('name')} placeholder="e.g. Emergency Fund" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={set('category')} className={inputClass}>
                {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority} onChange={set('priority')} className={inputClass}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount (₹)</label>
              <input required type="number" min={1} step="1" value={form.targetAmount} onChange={set('targetAmount')} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Date <span className="text-gray-400 font-normal">(opt.)</span></label>
              <input type="date" value={form.targetDate} onChange={set('targetDate')} className={inputClass} />
            </div>
          </div>

          {sipRules.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Linked SIP <span className="text-gray-400 font-normal">(optional)</span></label>
              <select value={form.linkedSipRuleId} onChange={set('linkedSipRuleId')} className={inputClass}>
                <option value="">— None —</option>
                {sipRules.map(r => <option key={r.id} value={r.id}>{r.name} · {formatINR(r.amount)}/mo</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Return (%) <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="number" min={0} max={100} step="0.1" value={form.expectedReturnRate} onChange={set('expectedReturnRate')} placeholder="e.g. 12" className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <input value={form.description} onChange={set('description')} placeholder="Any notes" className={inputClass} />
          </div>

          {error && <p className="text-sm text-red-600">{error.message}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isPending} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {isPending ? 'Saving…' : editGoal ? 'Update' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ContributeModal({ goal, onClose }: { goal: GoalType; onClose: () => void }) {
  const utils = api.useUtils()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const remaining = goal.targetAmount - goal.currentAmount

  const contribute = api.goals.addContribution.useMutation({
    onSuccess: () => { utils.goals.list.invalidate(); onClose() },
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add Contribution</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <p className="text-sm text-gray-500">Goal: <span className="font-medium text-gray-800">{goal.name}</span></p>
        {remaining > 0n && <p className="text-sm text-gray-500">Remaining: <span className="font-medium text-indigo-600">{formatINR(remaining)}</span></p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
          <input type="number" min={1} step="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note <span className="text-gray-400 font-normal">(optional)</span></label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Bonus received" className={inputClass} />
        </div>

        {contribute.error && <p className="text-sm text-red-600">{contribute.error.message}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            disabled={!amount || contribute.isPending}
            onClick={() => contribute.mutate({ goalId: goal.id, amount: parseFloat(amount), note: note || undefined })}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {contribute.isPending ? 'Saving…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

function GoalCard({ goal, onEdit, onContribute, onDelete }: { goal: GoalType; onEdit: () => void; onContribute: () => void; onDelete: () => void }) {
  const pct = goal.targetAmount > 0n ? Math.min(100, Math.round(Number(goal.currentAmount * 100n) / Number(goal.targetAmount))) : 0
  const catMeta = CATEGORY_META[goal.category] ?? CATEGORY_META.custom
  const priorityMeta = PRIORITY_META[goal.priority]
  const statusMeta = STATUS_META[goal.status]
  const isCompleted = goal.status === 'completed'

  const daysLeft = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className={cn('bg-white rounded-xl border p-5 space-y-4', isCompleted ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200')}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{goal.icon ?? catMeta.icon}</span>
          <div>
            <p className="font-semibold text-gray-900">{goal.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{catMeta.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium border', priorityMeta.bg, priorityMeta.color, priorityMeta.border)}>
            {priorityMeta.label}
          </span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusMeta.bg, statusMeta.color)}>
            {statusMeta.label}
          </span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-gray-800">{formatINRCompact(goal.currentAmount)}</span>
          <span className="text-sm text-gray-400">of {formatINRCompact(goal.targetAmount)}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div className={cn('h-full rounded-full', isCompleted ? 'bg-blue-500' : 'bg-indigo-500')} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-gray-400">{pct}% funded</span>
          {daysLeft !== null && (
            <span className={cn('text-xs font-medium', daysLeft < 0 ? 'text-red-500' : daysLeft < 30 ? 'text-amber-600' : 'text-gray-400')}>
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
            </span>
          )}
        </div>
      </div>

      {goal.linkedSipRule && (
        <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-1.5">
          <span>📈</span>
          <span>SIP: {goal.linkedSipRule.name} · {formatINR(goal.linkedSipRule.amount)}/mo</span>
        </div>
      )}

      {!isCompleted && (
        <div className="flex gap-2">
          <button onClick={onContribute} className="flex-1 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700">
            + Contribute
          </button>
          <button onClick={onEdit} className="px-3 py-1.5 border border-gray-200 text-xs text-gray-600 rounded-lg hover:bg-gray-50">Edit</button>
          <button onClick={onDelete} className="px-3 py-1.5 border border-red-100 text-xs text-red-500 rounded-lg hover:bg-red-50">Delete</button>
        </div>
      )}
    </div>
  )
}

export default function GoalsPage() {
  const utils = api.useUtils()
  const [showCreate, setShowCreate] = useState(false)
  const [editGoal, setEditGoal] = useState<GoalType | undefined>()
  const [contributeGoal, setContributeGoal] = useState<GoalType | undefined>()
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'all'>('active')

  const { data: goals, isLoading } = api.goals.list.useQuery()
  const deleteGoal = api.goals.delete.useMutation({ onSuccess: () => utils.goals.list.invalidate() })

  const filtered = (goals ?? []).filter(g => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'active') return g.status === 'active' || g.status === 'paused'
    return g.status === 'completed'
  })

  const totalTarget = filtered.reduce((s, g) => s + g.targetAmount, 0n)
  const totalSaved  = filtered.reduce((s, g) => s + g.currentAmount, 0n)

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-white rounded-xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Goals</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track your savings targets</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">
          + New Goal
        </button>
      </div>

      {(goals?.length ?? 0) > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Target</p>
            <p className="text-xl font-bold text-gray-900">{formatINRCompact(totalTarget)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Saved</p>
            <p className="text-xl font-bold text-indigo-600">{formatINRCompact(totalSaved)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Remaining</p>
            <p className="text-xl font-bold text-gray-900">
              {formatINRCompact(totalTarget > totalSaved ? totalTarget - totalSaved : 0n)}
            </p>
          </div>
        </div>
      )}

      {(goals?.length ?? 0) > 0 && (
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {(['active', 'completed', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors', statusFilter === s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}
            >
              {s === 'active' ? 'Active' : s === 'completed' ? 'Completed' : 'All'}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-gray-600 font-medium">{goals?.length === 0 ? 'No goals yet' : 'No goals in this filter'}</p>
          <p className="text-gray-400 text-sm mt-1">Set a savings goal to stay motivated</p>
          {goals?.length === 0 && (
            <button onClick={() => setShowCreate(true)} className="mt-4 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">
              Create First Goal
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => setEditGoal(goal)}
              onContribute={() => setContributeGoal(goal)}
              onDelete={() => { if (confirm('Delete this goal and all contributions?')) deleteGoal.mutate({ id: goal.id }) }}
            />
          ))}
        </div>
      )}

      {(showCreate || editGoal) && (
        <GoalModal onClose={() => { setShowCreate(false); setEditGoal(undefined) }} editGoal={editGoal} />
      )}
      {contributeGoal && <ContributeModal goal={contributeGoal} onClose={() => setContributeGoal(undefined)} />}
    </div>
  )
}
