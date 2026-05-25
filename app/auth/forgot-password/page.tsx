'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Logo } from '@/components/ui/Logo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    setLoading(false)
    if (resetError) {
      setError('Something went wrong. Please try again.')
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
  <Logo src="/evecosys-light.png" />
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm fade-in">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-xs font-600 mb-8 transition-colors"
            style={{ color: 'var(--text3)', fontWeight: 600 }}
          >
            <ArrowLeft size={14} /> Back to sign in
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text)' }}>
              Reset password
            </h1>
            <p className="text-sm" style={{ color: 'var(--text3)' }}>
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <div
            className="rounded-2xl p-8"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
          >
            {sent ? (
              <div className="text-center py-4">
                <div className="flex justify-center mb-4">
                  <CheckCircle size={40} style={{ color: '#7cc242' }} />
                </div>
                <p className="font-600 mb-2" style={{ color: 'var(--text)', fontWeight: 600 }}>Check your inbox</p>
                <p className="text-sm" style={{ color: 'var(--text3)' }}>
                  A reset link has been sent to <strong>{email}</strong>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ background: '#fdeaea', color: '#8a1010', border: '1px solid #f5c0c0' }}>
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text3)', letterSpacing: '0.5px', fontWeight: 700 }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@evecosys.com"
                    className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all duration-150"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    onFocus={e => (e.target.style.borderColor = '#7cc242')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg py-3 text-sm font-700 text-white transition-all duration-150 flex items-center justify-center gap-2"
                  style={{ background: '#7cc242', fontWeight: 700, opacity: loading ? 0.8 : 1 }}
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {loading ? 'Sending…' : 'Send reset link'}
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
