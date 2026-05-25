'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, CheckCircle, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Logo } from '@/components/ui/Logo'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isForced = searchParams.get('forced') === 'true'

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    setError('')

    const supabase = createClient()

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError('Failed to update password. Please try again.'); setLoading(false); return }

    // Clear forced reset flag — set next reset date 30 days from now
    const getUserRes = await supabase.auth.getUser()
    const currentUser = getUserRes?.data?.user
    if (currentUser) {
      const nextReset = new Date()
      nextReset.setDate(nextReset.getDate() + 30)
      await supabase.from('users').update({ force_password_reset_at: nextReset.toISOString() }).eq('id', currentUser.id)
    }

    setLoading(false)
    setDone(true)

    setTimeout(async () => {
      if (!currentUser) return
      const { data: profile } = await supabase.from('users').select('role').eq('id', currentUser.id).single()
      const routes: Record<string, string> = { manager: '/dashboard/manager', board: '/dashboard/board', driver: '/dashboard/driver' }
      router.push(routes[profile?.role ?? 'driver'])
    }, 2000)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
  <Logo src="/evecosys-light.png" />
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm fade-in">

          {isForced && !done && (
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6 text-sm"
              style={{ background: '#fef3dc', border: '1px solid #f0d080', color: '#8a5500' }}
            >
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              Your password has expired. Please set a new password to continue.
            </div>
          )}

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text)' }}>
              {isForced ? 'Update your password' : 'Set new password'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text3)' }}>
              Choose a strong password — minimum 8 characters.
            </p>
          </div>

          <div
            className="rounded-2xl p-8"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
          >
            {done ? (
              <div className="text-center py-4">
                <div className="flex justify-center mb-4">
                  <CheckCircle size={40} style={{ color: '#7cc242' }} />
                </div>
                <p className="font-600 mb-2" style={{ color: 'var(--text)', fontWeight: 600 }}>Password updated</p>
                <p className="text-sm" style={{ color: 'var(--text3)' }}>Redirecting you to your dashboard…</p>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-5">
                {error && (
                  <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ background: '#fdeaea', color: '#8a1010', border: '1px solid #f5c0c0' }}>
                    {error}
                  </div>
                )}

                {['New password', 'Confirm password'].map((label, idx) => {
                  const val = idx === 0 ? password : confirm
                  const setter = idx === 0 ? setPassword : setConfirm
                  return (
                    <div key={label}>
                      <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text3)', letterSpacing: '0.5px', fontWeight: 700 }}>
                        {label}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={val}
                          onChange={e => setter(e.target.value)}
                          required
                          placeholder="••••••••"
                          className="w-full rounded-lg px-4 py-3 pr-11 text-sm outline-none transition-all duration-150"
                          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                          onFocus={e => (e.target.style.borderColor = '#7cc242')}
                          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                        />
                        {idx === 0 && (
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} tabIndex={-1}>
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg py-3 text-sm font-700 text-white transition-all duration-150 flex items-center justify-center gap-2"
                  style={{ background: '#7cc242', fontWeight: 700, opacity: loading ? 0.8 : 1 }}
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="text-center py-4 text-xs" style={{ color: 'var(--text3)', borderTop: '1px solid var(--border)' }}>
        © 2026 <span style={{ color: '#7cc242', fontWeight: 600 }}>EVEcosys</span> — Fleet Management System
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
