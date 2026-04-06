'use client'

import { useState } from 'react'
import { api } from '@/lib/trpc'
import { formatINR } from '@/lib/currency'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const EMPLOYMENT_LABELS: Record<string, string> = {
  salaried: 'Salaried',
  self_employed: 'Self Employed',
  freelancer: 'Freelancer',
  business_owner: 'Business Owner',
  retired: 'Retired',
  student: 'Student',
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-5">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 items-start py-3 border-b border-gray-50 last:border-0">
      <label className="text-sm font-medium text-gray-600 pt-2">{label}</label>
      <div className="col-span-2">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const utils = api.useUtils()
  const { data: profile, isLoading } = api.user.getProfile.useQuery()

  // Profile form state
  const [name, setName] = useState('')
  const [annualIncome, setAnnualIncome] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [taxRegime, setTaxRegime] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)

  // Password form state
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSaved, setPwdSaved] = useState(false)

  // Pre-fill once profile loads
  const [prefilled, setPrefilled] = useState(false)
  if (profile && !prefilled) {
    setName(profile.name ?? '')
    setAnnualIncome(profile.annualIncome ? String(Number(profile.annualIncome) / 100) : '')
    setEmploymentType(profile.employmentType ?? '')
    setTaxRegime(profile.taxRegime ?? '')
    setPrefilled(true)
  }

  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: () => {
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
      utils.user.getProfile.invalidate()
    },
  })

  const changePassword = api.user.changePassword.useMutation({
    onSuccess: () => {
      setPwdSaved(true)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      setTimeout(() => setPwdSaved(false), 3000)
    },
    onError: (err) => setPwdError(err.message),
  })

  function saveProfile() {
    updateProfile.mutate({
      name: name || undefined,
      annualIncome: annualIncome ? parseFloat(annualIncome) : undefined,
      employmentType: (employmentType as never) || undefined,
      taxRegime: (taxRegime as 'old' | 'new') || undefined,
    })
  }

  function savePassword() {
    setPwdError('')
    if (newPwd !== confirmPwd) { setPwdError('New passwords do not match'); return }
    if (newPwd.length < 8) { setPwdError('Password must be at least 8 characters'); return }
    changePassword.mutate({ currentPassword: currentPwd, newPassword: newPwd })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  const initials = (profile?.name ?? profile?.email ?? 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <div id="profile-section">
      <Section title="Profile" description="Your personal information and financial profile">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold">
            {initials}
          </div>
          <div>
            <p className="font-medium text-gray-900">{profile?.name ?? 'User'}</p>
            <p className="text-sm text-gray-500">{profile?.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>

        <Field label="Full Name">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Your full name"
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={profile?.email ?? ''}
            disabled
            className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
        </Field>

        <Field label="Annual Income">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
            <input
              type="number"
              value={annualIncome}
              onChange={e => setAnnualIncome(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 1200000"
            />
          </div>
          {profile?.annualIncome && (
            <p className="text-xs text-gray-400 mt-1">Current: {formatINR(profile.annualIncome)} / year</p>
          )}
        </Field>

        <Field label="Employment Type">
          <select
            value={employmentType}
            onChange={e => setEmploymentType(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select type</option>
            {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>

        <Field label="Tax Regime">
          <div className="flex gap-3">
            {(['old', 'new'] as const).map(r => (
              <button
                key={r}
                onClick={() => setTaxRegime(r)}
                className={cn(
                  'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                  taxRegime === r
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                )}
              >
                {r === 'old' ? 'Old Regime' : 'New Regime'}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {taxRegime === 'old' ? 'Allows deductions: 80C, 80D, HRA, LTA etc.' : taxRegime === 'new' ? 'Lower slab rates, no deductions.' : 'Choose based on your deduction eligibility'}
          </p>
        </Field>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveProfile}
            disabled={updateProfile.isPending}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {updateProfile.isPending ? 'Saving...' : 'Save Profile'}
          </button>
          {profileSaved && <span className="text-sm text-green-600 font-medium">Saved successfully</span>}
          {updateProfile.error && <span className="text-sm text-red-500">{updateProfile.error.message}</span>}
        </div>
      </Section>
      </div>

      {/* Password Section */}
      <Section title="Change Password" description="Update your account password">
        <Field label="Current Password">
          <input
            type="password"
            value={currentPwd}
            onChange={e => setCurrentPwd(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter current password"
          />
        </Field>
        <Field label="New Password">
          <input
            type="password"
            value={newPwd}
            onChange={e => setNewPwd(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="At least 8 characters"
          />
        </Field>
        <Field label="Confirm Password">
          <input
            type="password"
            value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Repeat new password"
          />
        </Field>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={savePassword}
            disabled={changePassword.isPending || !currentPwd || !newPwd || !confirmPwd}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {changePassword.isPending ? 'Updating...' : 'Update Password'}
          </button>
          {pwdSaved && <span className="text-sm text-green-600 font-medium">Password updated</span>}
          {pwdError && <span className="text-sm text-red-500">{pwdError}</span>}
        </div>
      </Section>

      {/* Account Info */}
      <Section title="Account Information">
        <div className="space-y-3 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-gray-500">Account Status</span>
            <span className="inline-flex items-center gap-1.5 text-green-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Active
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Member Since</span>
            <span className="text-gray-700">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </span>
          </div>
        </div>

        {/* Onboarding completion banner */}
        {profile?.onboardingCompleted ? (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">Profile complete</p>
              <p className="text-xs text-green-600">All your financial details are set up.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">Profile setup incomplete</p>
              <p className="text-xs text-amber-700 mt-0.5">Add your annual income, employment type and tax regime to get better insights and accurate health scores.</p>
              <button
                onClick={() => document.getElementById('profile-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Complete your profile
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}
