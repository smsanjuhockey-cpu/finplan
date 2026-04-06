'use client'

import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/trpc'
import { formatINR } from '@/lib/currency'
import { cn } from '@/lib/utils'

// Build personalized prompts based on actual financial data
function buildSuggestedPrompts(snapshot: {
  savingsRate: number
  emiToIncomeRatio: number
  monthsEmergencyFund: number
  totalDebt: bigint
  activeGoals: number
  healthScore: number | null
  taxRegime: string | null | undefined
  savings: bigint
}) {
  const prompts: string[] = []

  if (snapshot.emiToIncomeRatio > 35)
    prompts.push(`My EMI is ${snapshot.emiToIncomeRatio.toFixed(0)}% of my income — how do I reduce this?`)
  else if (snapshot.totalDebt > 0n)
    prompts.push('What is the fastest strategy to become debt-free?')

  if (snapshot.monthsEmergencyFund < 3)
    prompts.push('My emergency fund is critically low — what should I do first?')
  else if (snapshot.monthsEmergencyFund < 6)
    prompts.push('How do I build my emergency fund to 6 months quickly?')

  if (snapshot.savingsRate < 10)
    prompts.push('My savings rate is low — where am I leaking money and how do I fix it?')
  else if (snapshot.savings > 0n)
    prompts.push(`I have ${formatINR(snapshot.savings)} surplus this month — where should I invest it?`)

  if (snapshot.taxRegime === 'new')
    prompts.push('Am I on the right tax regime? Should I switch to old regime?')
  else if (snapshot.taxRegime === 'old')
    prompts.push('How can I maximise my 80C, 80D, and NPS deductions this year?')
  else
    prompts.push('Which tax regime — old or new — saves me more money?')

  if (snapshot.activeGoals === 0)
    prompts.push('Help me set up a realistic savings goal for my first home')
  else
    prompts.push(`I have ${snapshot.activeGoals} active goals — am I saving enough to hit them on time?`)

  if (snapshot.healthScore !== null && snapshot.healthScore < 60)
    prompts.push(`My financial health score is ${snapshot.healthScore}/100 — give me a 90-day plan to improve it`)
  else
    prompts.push('Build me a 12-month wealth-building roadmap based on my profile')

  return prompts.slice(0, 5)
}

const FALLBACK_PROMPTS = [
  'Review my finances and tell me what needs urgent attention',
  'How much should I be saving and investing each month?',
  'Which tax regime saves me more — old or new?',
  'Help me create a debt elimination plan',
  'Where should I invest my monthly surplus?',
]

function AdvisorAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center flex-shrink-0 shadow-sm">
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </div>
  )
}

function UserAvatar({ initial }: { initial: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-600 font-semibold text-xs">
      {initial}
    </div>
  )
}

function MessageBubble({ role, content, initial }: { role: 'user' | 'assistant'; content: string; initial: string }) {
  const isUser = role === 'user'
  return (
    <div className={cn('flex gap-3 items-start', isUser && 'flex-row-reverse')}>
      {isUser ? <UserAvatar initial={initial} /> : <AdvisorAvatar />}
      <div className={cn(
        'max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'bg-indigo-600 text-white rounded-tr-sm'
          : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
      )}>
        {/* Render line breaks and bold markers */}
        {content.split('\n').map((line, i) => {
          // Bold text between **
          const parts = line.split(/\*\*(.*?)\*\*/g)
          return (
            <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
              {parts.map((part, j) =>
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
              )}
            </p>
          )
        })}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      <AdvisorAvatar />
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function SnapshotBadge({ label, value, status, tooltip }: { label: string; value: string; status: 'good' | 'warn' | 'bad' | 'neutral'; tooltip: string }) {
  const colors = {
    good: 'bg-green-50 text-green-700 border-green-200',
    warn: 'bg-amber-50 text-amber-700 border-amber-200',
    bad: 'bg-red-50 text-red-700 border-red-200',
    neutral: 'bg-gray-50 text-gray-600 border-gray-200',
  }
  const dot = { good: 'bg-green-500', warn: 'bg-amber-400', bad: 'bg-red-500', neutral: 'bg-gray-400' }
  return (
    <div className={cn('rounded-lg border px-3 py-2 relative group cursor-default', colors[status])}>
      <div className="flex items-center justify-center gap-1.5 mb-0.5">
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dot[status])} />
        <p className="text-sm font-bold">{value}</p>
      </div>
      <p className="text-xs opacity-70 text-center">{label}</p>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-52 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg text-center leading-relaxed">
        {tooltip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  )
}

export default function AiChatPage() {
  const [sessionId, setSessionId] = useState(() => generateSessionId())
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: sessions, refetch: refetchSessions } = api.ai.listSessions.useQuery()
  const { data: snapshot } = api.ai.getSnapshot.useQuery()
  const { data: history } = api.ai.getHistory.useQuery({ sessionId }, { enabled: !!sessionId })

  const suggestedPrompts = snapshot
    ? buildSuggestedPrompts(snapshot)
    : FALLBACK_PROMPTS

  const chatMutation = api.ai.chat.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
      setIsTyping(false)
      refetchSessions()
    },
    onError: (err) => {
      setIsTyping(false)
      setMessages(prev => [...prev, { role: 'assistant', content: `I encountered an error: ${err.message}` }])
    },
  })

  const clearMutation = api.ai.clearSession.useMutation({
    onSuccess: () => { setMessages([]); refetchSessions() },
  })

  useEffect(() => {
    if (history) setMessages(history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })))
  }, [history])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function sendMessage(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || isTyping) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setIsTyping(true)
    chatMutation.mutate({ message: msg, sessionId })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function startNewSession() { setSessionId(generateSessionId()); setMessages([]) }
  function loadSession(sid: string) { setSessionId(sid) }

  const userInitial = snapshot?.name?.[0]?.toUpperCase() ?? 'U'
  const isEmpty = messages.length === 0 && !isTyping

  // Snapshot status helpers
  const savingsStatus = !snapshot ? 'neutral' : snapshot.savingsRate >= 20 ? 'good' : snapshot.savingsRate >= 10 ? 'warn' : 'bad'
  const emiStatus = !snapshot ? 'neutral' : snapshot.emiToIncomeRatio === 0 ? 'good' : snapshot.emiToIncomeRatio < 30 ? 'good' : snapshot.emiToIncomeRatio < 40 ? 'warn' : 'bad'
  const efStatus = !snapshot ? 'neutral' : snapshot.monthsEmergencyFund >= 6 ? 'good' : snapshot.monthsEmergencyFund >= 3 ? 'warn' : 'bad'
  const scoreStatus = !snapshot?.healthScore ? 'neutral' : snapshot.healthScore >= 75 ? 'good' : snapshot.healthScore >= 50 ? 'warn' : 'bad'

  return (
    <div className="h-[calc(100vh-5rem)] flex gap-4">

      {/* Sessions Sidebar */}
      <div className="w-60 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex-col hidden md:flex">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Conversations</h3>
            <p className="text-xs text-gray-400">with your advisor</p>
          </div>
          <button onClick={startNewSession} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition-colors" title="New chat">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {!sessions || sessions.length === 0 ? (
            <p className="text-xs text-gray-400 text-center mt-6 px-2">Start your first conversation below</p>
          ) : (
            sessions.map(s => (
              <button
                key={s.sessionId}
                onClick={() => loadSession(s.sessionId)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors',
                  s.sessionId === sessionId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <div className="truncate font-medium">{s.preview ?? 'Chat'}</div>
                <div className="text-gray-400 mt-0.5">
                  {s.lastAt ? new Date(s.lastAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''} · {s.messageCount} msgs
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">FinPlan Advisor</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                <p className="text-xs text-gray-500">Personalised to your finances · Powered by Claude AI</p>
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => clearMutation.mutate({ sessionId })}
              disabled={clearMutation.isPending}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear chat
            </button>
          )}
        </div>

        {/* Financial Snapshot bar (only when no messages) */}
        {isEmpty && snapshot && (snapshot.income > 0n || snapshot.totalDebt > 0n) && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-4 gap-2">
            <SnapshotBadge
              label="Savings Rate"
              value={`${snapshot.savingsRate.toFixed(0)}%`}
              status={savingsStatus}
              tooltip={`You save ${snapshot.savingsRate.toFixed(0)}% of your monthly income. Target: ≥20%. Good = green, 10–19% = amber, <10% = red.`}
            />
            <SnapshotBadge
              label="EMI / Income"
              value={snapshot.emiToIncomeRatio > 0 ? `${snapshot.emiToIncomeRatio.toFixed(0)}%` : 'No loans'}
              status={emiStatus}
              tooltip={`Your total loan EMIs are ${snapshot.emiToIncomeRatio.toFixed(0)}% of monthly income. Safe limit: <30%. Above 40% = financial stress.`}
            />
            <SnapshotBadge
              label="Emergency Fund"
              value={snapshot.monthsEmergencyFund > 0 ? `${snapshot.monthsEmergencyFund.toFixed(1)} months` : 'Not set up'}
              status={efStatus}
              tooltip={`Your bank balance covers ${snapshot.monthsEmergencyFund.toFixed(1)} months of expenses. Target: 6 months of expenses kept liquid for emergencies.`}
            />
            <SnapshotBadge
              label="Health Score"
              value={snapshot.healthScore ? `${snapshot.healthScore}/100` : 'Not computed'}
              status={scoreStatus}
              tooltip="Overall financial health: savings rate, debt burden, emergency fund, budget adherence, goal progress, and net worth — weighted into one score."
            />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 bg-gray-50">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center mb-4 shadow-md">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {snapshot?.name ? `Hello, ${snapshot.name.split(' ')[0]}` : 'Your Financial Advisor'}
              </h3>
              <p className="text-sm text-gray-500 mb-1">
                I have full visibility into your income, expenses, debts, goals, and health score.
              </p>
              <p className="text-sm text-gray-400 mb-7">
                Ask me anything — I'll give you specific, actionable advice based on your real numbers.
              </p>

              <div className="w-full space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Suggested for you</p>
                {suggestedPrompts.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all shadow-sm flex items-center justify-between group"
                  >
                    <span>{prompt}</span>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} role={msg.role} content={msg.content} initial={userInitial} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your advisor anything about your finances..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400 max-h-32 overflow-y-auto bg-gray-50"
              style={{ minHeight: '48px' }}
              onInput={e => {
                const t = e.currentTarget
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 128) + 'px'
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Advice is based on your real financial data · Always verify major decisions with a SEBI-registered advisor
          </p>
        </div>
      </div>
    </div>
  )
}
