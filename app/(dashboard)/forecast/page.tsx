'use client'

import { useState } from 'react'
import { api } from '@/lib/trpc'
import { formatINR, formatINRCompact } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const EVENT_META: Record<string, { label: string; icon: string }> = {
  baby_arriving:      { label: 'Baby Arriving',      icon: '👶' },
  maternity_leave:    { label: 'Maternity Leave',     icon: '🤱' },
  job_change:         { label: 'Job Change',          icon: '💼' },
  salary_increment:   { label: 'Salary Increment',    icon: '📈' },
  bonus_received:     { label: 'Bonus Received',      icon: '🎉' },
  marriage:           { label: 'Marriage',            icon: '💍' },
  home_purchase:      { label: 'Home Purchase',       icon: '🏠' },
  parent_support:     { label: 'Parent Support',      icon: '👴' },
  medical_emergency:  { label: 'Medical Emergency',   icon: '🏥' },
  other:              { label: 'Other',               icon: '📌' },
}

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

type LifeEvent = NonNullable<ReturnType<typeof api.lifeEvents.list.useQuery>['data']>[0]

function LifeEventModal({ onClose, edit }: { onClose: () => void; edit?: LifeEvent }) {
  const utils = api.useUtils()
  const [form, setForm] = useState({
    type:            edit?.type ?? 'other',
    name:            edit?.name ?? '',
    estimatedDate:   edit ? new Date(edit.estimatedDate).toISOString().split('T')[0] : '',
    financialImpact: edit?.financialImpact ? (Number(edit.financialImpact) / 100).toString() : '',
    oneTimeCost:     edit?.oneTimeCost ? (Number(edit.oneTimeCost) / 100).toString() : '',
    notes:           edit?.notes ?? '',
  })

  const create = api.lifeEvents.create.useMutation({ onSuccess: () => { utils.lifeEvents.list.invalidate(); utils.forecast.generate.invalidate(); onClose() } })
  const update = api.lifeEvents.update.useMutation({ onSuccess: () => { utils.lifeEvents.list.invalidate(); utils.forecast.generate.invalidate(); onClose() } })
  const isPending = create.isPending || update.isPending

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      type:            form.type as LifeEvent['type'],
      name:            form.name,
      estimatedDate:   form.estimatedDate,
      financialImpact: form.financialImpact ? parseFloat(form.financialImpact) : undefined,
      oneTimeCost:     form.oneTimeCost ? parseFloat(form.oneTimeCost) : undefined,
      notes:           form.notes || undefined,
    }
    if (edit) update.mutate({ id: edit.id, ...payload })
    else create.mutate(payload)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{edit ? 'Edit Life Event' : 'Add Life Event'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
              <select value={form.type} onChange={set('type')} className={inputClass}>
                {Object.entries(EVENT_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Date</label>
              <input required type="date" value={form.estimatedDate} onChange={set('estimatedDate')} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <input required value={form.name} onChange={set('name')} placeholder="e.g. Switch to new job" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Impact (₹)</label>
              <input type="number" step="1" value={form.financialImpact} onChange={set('financialImpact')} placeholder="+20000 or -5000" className={inputClass} />
              <p className="text-xs text-gray-400 mt-0.5">Positive = income boost, negative = extra cost</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">One-time Cost (₹)</label>
              <input type="number" min={0} step="1" value={form.oneTimeCost} onChange={set('oneTimeCost')} placeholder="e.g. 200000" className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
              <input value={form.notes} onChange={set('notes')} placeholder="Any details" className={inputClass} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isPending} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {isPending ? 'Saving…' : edit ? 'Update' : 'Add Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function toINRNum(paise: bigint) { return Number(paise) / 100 }

export default function ForecastPage() {
  const [months, setMonths] = useState(12)
  const [showModal, setShowModal] = useState(false)
  const [editEvent, setEditEvent] = useState<LifeEvent | undefined>()
  const utils = api.useUtils()

  const { data: forecast, isLoading: forecastLoading } = api.forecast.generate.useQuery({ months })
  const { data: lifeEvents, isLoading: eventsLoading }  = api.lifeEvents.list.useQuery()

  const deleteEvent = api.lifeEvents.delete.useMutation({
    onSuccess: () => { utils.lifeEvents.list.invalidate(); utils.forecast.generate.invalidate() },
  })

  const chartData = (forecast ?? []).map(f => ({
    name: `${MONTHS_SHORT[f.month - 1]} ${String(f.year).slice(2)}`,
    Income:   toINRNum(f.income),
    Expenses: toINRNum(f.expenses),
    Savings:  toINRNum(f.savings),
    NetWorth: toINRNum(f.netWorth),
  }))

  const totalProjectedSavings = (forecast ?? []).reduce((s, f) => s + f.savings, 0n)
  const lastNetWorth = forecast?.at(-1)?.netWorth ?? 0n

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Financial Forecast</h1>
          <p className="text-sm text-gray-400 mt-0.5">Projection based on your recurring rules and life events</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={months} onChange={e => setMonths(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
            <option value={24}>24 months</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      {forecast && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Projected Savings</p>
            <p className={cn('text-2xl font-bold', totalProjectedSavings >= 0n ? 'text-green-600' : 'text-red-600')}>
              {formatINRCompact(totalProjectedSavings < 0n ? -totalProjectedSavings : totalProjectedSavings)}
            </p>
            <p className="text-xs text-gray-400 mt-1">over {months} months</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Avg Monthly Savings</p>
            <p className={cn('text-2xl font-bold', totalProjectedSavings >= 0n ? 'text-gray-900' : 'text-red-600')}>
              {formatINRCompact(totalProjectedSavings / BigInt(months))}
            </p>
            <p className="text-xs text-gray-400 mt-1">per month</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Projected Net Worth</p>
            <p className={cn('text-2xl font-bold', lastNetWorth >= 0n ? 'text-indigo-600' : 'text-red-600')}>
              {formatINRCompact(lastNetWorth)}
            </p>
            <p className="text-xs text-gray-400 mt-1">in {months} months</p>
          </div>
        </div>
      )}

      {/* Income vs Expenses chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Income vs Expenses Projection</h3>
        {forecastLoading ? (
          <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
            Add transactions or recurring rules to generate a forecast
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} />
              <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
              <Area type="monotone" dataKey="Income" stroke="#22c55e" fill="url(#income)" strokeWidth={2} />
              <Area type="monotone" dataKey="Expenses" stroke="#ef4444" fill="url(#expenses)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Net Worth trajectory */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Net Worth Trajectory</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} />
              <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
              <Area type="monotone" dataKey="NetWorth" stroke="#6366f1" fill="url(#nw)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Life Events */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800">Life Events</h3>
            <p className="text-xs text-gray-400 mt-0.5">Events that affect your forecast</p>
          </div>
          <button onClick={() => { setEditEvent(undefined); setShowModal(true) }} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">
            + Add Event
          </button>
        </div>

        {eventsLoading ? (
          <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : !lifeEvents?.length ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">🗓️</p>
            <p className="text-gray-500 text-sm">No life events yet</p>
            <p className="text-gray-400 text-xs mt-1">Add upcoming events like job change, marriage, or baby to see their impact on your forecast</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lifeEvents.map(event => {
              const meta = EVENT_META[event.type] ?? EVENT_META.other
              const isPast = new Date(event.estimatedDate) < new Date()
              return (
                <div key={event.id} className={cn('flex items-center justify-between px-4 py-3 rounded-xl border group', isPast ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200')}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{meta.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{event.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span>{new Date(event.estimatedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {event.financialImpact && (
                          <>
                            <span>·</span>
                            <span className={event.financialImpact > 0n ? 'text-green-600' : 'text-red-500'}>
                              {event.financialImpact > 0n ? '+' : ''}{formatINR(event.financialImpact)}/mo
                            </span>
                          </>
                        )}
                        {event.oneTimeCost && event.oneTimeCost > 0n && (
                          <><span>·</span><span className="text-red-500">One-time: {formatINR(event.oneTimeCost)}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditEvent(event); setShowModal(true) }} className="text-xs text-indigo-500 hover:text-indigo-700">Edit</button>
                    <button onClick={() => { if (confirm('Delete this event?')) deleteEvent.mutate({ id: event.id }) }} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && <LifeEventModal onClose={() => { setShowModal(false); setEditEvent(undefined) }} edit={editEvent} />}
    </div>
  )
}
