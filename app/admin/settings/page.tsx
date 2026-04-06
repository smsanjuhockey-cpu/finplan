'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { api } from '@/lib/trpc'

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

export default function AdminSettingsPage() {
  const { data: session } = useSession()
  const { data: profile } = api.user.getProfile.useQuery()
  const utils = api.useUtils()

  const [name, setName] = useState('')
  const [prefilled, setPrefilled] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSaved, setPwdSaved] = useState(false)

  if (profile && !prefilled) {
    setName(profile.name ?? '')
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

  function savePassword() {
    setPwdError('')
    if (newPwd !== confirmPwd) { setPwdError('New passwords do not match'); return }
    if (newPwd.length < 8) { setPwdError('Minimum 8 characters'); return }
    changePassword.mutate({ currentPassword: currentPwd, newPassword: newPwd })
  }

  const initials = (profile?.name ?? profile?.email ?? 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your admin account</p>
      </div>

      {/* Admin Profile Card */}
      <Section title="Admin Profile" description="Your administrator account details">
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">{profile?.name ?? 'Admin'}</p>
              <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase tracking-wide">Admin</span>
            </div>
            <p className="text-sm text-gray-500">{profile?.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>

        <Field label="Display Name">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Admin display name"
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

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => updateProfile.mutate({ name: name || undefined })}
            disabled={updateProfile.isPending}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          {profileSaved && <span className="text-sm text-green-600 font-medium">Saved</span>}
        </div>
      </Section>

      {/* Change Password */}
      <Section title="Change Password" description="Update your admin account password">
        <Field label="Current Password">
          <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter current password" />
        </Field>
        <Field label="New Password">
          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="At least 8 characters" />
        </Field>
        <Field label="Confirm Password">
          <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Repeat new password" />
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
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Role</span>
            <span className="font-bold text-red-600 uppercase text-xs tracking-wide">Administrator</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Account Status</span>
            <span className="flex items-center gap-1.5 text-green-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Active
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Member Since</span>
            <span className="text-gray-700">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </span>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out of Admin Console
          </button>
        </div>
      </Section>
    </div>
  )
}
