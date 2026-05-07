'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role, force_password_reset_at')
        .eq('id', data.user.id)
        .single()

      if (profile?.force_password_reset_at) {
        const resetDue = new Date(profile.force_password_reset_at) < new Date()
        if (resetDue) {
          router.push('/reset-password?forced=true')
          return
        }
      }

      const routes: Record<string, string> = {
        manager: '/manager',
        board: '/board',
        driver: '/driver',
      }
      router.push(routes[profile?.role ?? 'driver'] ?? '/login')
      router.refresh()
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg)' }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <EVEcosysLogo />
        <ThemeToggle />
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm fade-in">

          {/* Header */}
          <div className="mb-8 text-center">
            <h1
              className="text-2xl font-bold tracking-tight mb-1"
              style={{ color: 'var(--text)' }}
            >
              Welcome back
            </h1>
            <p className="text-sm" style={{ color: 'var(--text3)' }}>
              Sign in to your EVEcosys account
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}
          >
            <form onSubmit={handleLogin} className="space-y-5">

              {/* Error */}
              {error && (
                <div
                  className="rounded-lg px-4 py-3 text-sm font-medium"
                  style={{ background: '#fdeaea', color: '#8a1010', border: '1px solid #f5c0c0' }}
                >
                  {error}
                </div>
              )}

              {/* Email */}
              <div>
                <label
                  className="block text-xs font-700 uppercase tracking-wide mb-2"
                  style={{ color: 'var(--text3)', letterSpacing: '0.5px', fontWeight: 700 }}
                >
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@evecosys.com"
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all duration-150"
                  style={{
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#7cc242')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className="block text-xs uppercase tracking-wide"
                    style={{ color: 'var(--text3)', letterSpacing: '0.5px', fontWeight: 700 }}
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-600 transition-colors"
                    style={{ color: '#1a7080', fontWeight: 600 }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-lg px-4 py-3 pr-11 text-sm outline-none transition-all duration-150"
                    style={{
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                    onFocus={e => (e.target.style.borderColor = '#7cc242')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text3)' }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg py-3 text-sm font-700 text-white transition-all duration-150 flex items-center justify-center gap-2"
                style={{
                  background: loading ? '#5a9e2f' : '#7cc242',
                  fontWeight: 700,
                  opacity: loading ? 0.8 : 1,
                }}
                onMouseEnter={e => !loading && ((e.target as HTMLElement).style.background = '#5a9e2f')}
                onMouseLeave={e => !loading && ((e.target as HTMLElement).style.background = '#7cc242')}
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>

            </form>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs mt-6" style={{ color: 'var(--text3)' }}>
            Don&apos;t have an account?{' '}
            <span style={{ color: 'var(--text2)' }}>
              Contact your fleet manager.
            </span>
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div
        className="text-center py-4 text-xs"
        style={{ color: 'var(--text3)', borderTop: '1px solid var(--border)' }}
      >
        © 2026 <span style={{ color: '#7cc242', fontWeight: 600 }}>EVEcosys</span> — Fleet Management System
      </div>
    </div>
  )
}

function EVEcosysLogo() {
  return (
    <svg viewBox="0 0 230 54" width="120" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="1" width="74" height="52" rx="9" fill="#7cc242"/>
      <text x="5" y="42" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="37" fill="white">E</text>
      <text x="26" y="42" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="37" fill="white">V</text>
      <text x="50" y="42" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="37" fill="#1a7080">E</text>
      <text x="82" y="42" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="37" fill="var(--text)">cosys</text>
    </svg>
  )
}
