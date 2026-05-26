"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export type SignupFormProps = {
  onSuccess?: () => void
}

export default function SignupForm({ onSuccess }: SignupFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    setLoading(false)
    if (signUpError) {
      setError('Unable to create account. ' + (signUpError.message ?? ''))
      return
    }

    if (onSuccess) return onSuccess()
    router.push('/login')
  }

  return (
    <>
      {error && (
        <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ background: '#fdeaea', color: '#8a1010', border: '1px solid #f5c0c0' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-5">
        <div>
          <label className="block text-xs font-700 uppercase tracking-wide mb-2" style={{ color: 'var(--text3)', letterSpacing: '0.5px', fontWeight: 700 }}>
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

        <div>
          <label className="block text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text3)', letterSpacing: '0.5px', fontWeight: 700 }}>
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-lg px-4 py-3 pr-11 text-sm outline-none transition-all duration-150"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              onFocus={e => (e.target.style.borderColor = '#7cc242')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text3)' }} tabIndex={-1}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-3 text-sm font-700 text-white transition-all duration-150 flex items-center justify-center gap-2"
          style={{ background: loading ? '#5a9e2f' : '#7cc242', fontWeight: 700, opacity: loading ? 0.8 : 1 }}
          onMouseEnter={e => !loading && ((e.target as HTMLElement).style.background = '#5a9e2f')}
          onMouseLeave={e => !loading && ((e.target as HTMLElement).style.background = '#7cc242')}
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {loading ? 'Creating…' : 'Create account'}
        </button>

      </form>
    </>
  )
}
