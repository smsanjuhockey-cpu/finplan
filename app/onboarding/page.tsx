'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/trpc'

const STEPS = [
  {
    id: 'income',
    title: 'What is your monthly income?',
    desc: 'This helps us set accurate budget targets for you.',
  },
  {
    id: 'employment',
    title: 'What best describes you?',
    desc: 'We tailor the experience to your financial situation.',
  },
  {
    id: 'regime',
    title: 'Which tax regime do you file under?',
    desc: 'For FY 2025-26. You can change this later in Settings.',
  },
]

const EMPLOYMENT_TYPES = [
  { value: 'salaried',   label: '💼 Salaried',         desc: 'Fixed monthly salary from an employer' },
  { value: 'self_employed', label: '🏢 Self-employed',  desc: 'Business owner or consultant' },
  { value: 'freelancer', label: '💻 Freelancer',        desc: 'Variable income from multiple clients' },
  { value: 'student',    label: '🎓 Student',           desc: 'Learning and building my future' },
  { value: 'retired',    label: '🏖️ Retired',           desc: 'Living on savings or pension' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [income, setIncome] = useState('')
  const [employment, setEmployment] = useState('')
  const [regime, setRegime] = useState<'old' | 'new'>('new')

  const complete = api.user.completeOnboarding.useMutation({
    onSuccess: () => router.push('/dashboard'),
  })

  const handleFinish = () => {
    complete.mutate({
      annualIncome: parseFloat(income || '0') * 12,
      employmentType: (employment || 'salaried') as 'salaried' | 'self_employed' | 'freelancer' | 'student' | 'retired',
      taxRegime: regime,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-indigo-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        <p className="text-xs text-indigo-600 font-medium mb-1">Step {step + 1} of {STEPS.length}</p>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{STEPS[step].title}</h2>
        <p className="text-sm text-gray-500 mb-6">{STEPS[step].desc}</p>

        {/* Step 0 — Income */}
        {step === 0 && (
          <div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
              <input
                type="number"
                min={0}
                value={income}
                onChange={e => setIncome(e.target.value)}
                placeholder="50000"
                className="w-full border border-gray-300 rounded-xl pl-8 pr-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">Enter your monthly take-home (in rupees). Skip if you prefer.</p>
          </div>
        )}

        {/* Step 1 — Employment */}
        {step === 1 && (
          <div className="space-y-2">
            {EMPLOYMENT_TYPES.map(e => (
              <button
                key={e.value}
                type="button"
                onClick={() => setEmployment(e.value)}
                className={`w-full text-left border rounded-xl px-4 py-3 transition-colors ${
                  employment === e.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-medium text-sm text-gray-800">{e.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{e.desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 2 — Tax Regime */}
        {step === 2 && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setRegime('new')}
              className={`w-full text-left border rounded-xl px-4 py-4 transition-colors ${
                regime === 'new' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-gray-800">New Regime</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Recommended</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Lower tax rates, no deductions. Best for most taxpayers in FY 2025-26.</p>
            </button>
            <button
              type="button"
              onClick={() => setRegime('old')}
              className={`w-full text-left border rounded-xl px-4 py-4 transition-colors ${
                regime === 'old' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="font-medium text-sm text-gray-800">Old Regime</span>
              <p className="text-xs text-gray-500 mt-1">Higher rates but with deductions — 80C, 80D, HRA, 24B. Useful if you have large investments.</p>
            </button>
            <p className="text-xs text-gray-400 text-center">You can switch this anytime in Settings → Tax.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={complete.isPending}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {complete.isPending ? 'Setting up…' : 'Go to Dashboard →'}
            </button>
          )}
        </div>

        {step === 0 && (
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}
