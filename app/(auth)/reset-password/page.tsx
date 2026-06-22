'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, CheckCircle, ShieldAlert, Bolt, LockKeyhole } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const PANEL_GRADIENT = 'linear-gradient(150deg, #0e3d2a 0%, #1a7080 100%)'
const BG = '#eef3f0'
const GREEN = '#7cc242'
const FOCUS_RING = '0 0 0 3px rgba(124,194,66,.20)'
const BORDER = '#dde6df'
const TEXT = '#16201b'
const TEXT2 = '#46524a'
const TEXT3 = '#8a978c'

function BrandPanel() {
  return (
    <div style={{
      position: 'relative', flex: '0 0 42%', maxWidth: 460, minWidth: 340,
      padding: '40px 40px 32px', display: 'flex', flexDirection: 'column',
      color: '#fff', overflow: 'hidden', background: PANEL_GRADIENT,
    }}>
      <div style={{ position: 'absolute', top: -90, right: -70, width: 300, height: 300, borderRadius: 9999, background: 'rgba(255,255,255,.08)' }} />
      <div style={{ position: 'absolute', bottom: -120, left: -80, width: 320, height: 320, borderRadius: 9999, background: 'rgba(255,255,255,.06)' }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bolt size={20} color="#fff" />
        </span>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.4px' }}>EVEcosys</div>
      </div>

      <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 36 }}>
        <div style={{ width: 56, height: 56, borderRadius: 9999, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <LockKeyhole size={26} color="#fff" />
        </div>
        <h1 style={{ fontSize: 27, fontWeight: 800, lineHeight: 1.18, letterSpacing: '-.6px', margin: 0 }}>
          Secure your account.
        </h1>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, opacity: .9, marginTop: 12, maxWidth: 310 }}>
          Your new password is encrypted end-to-end and never stored in plaintext. Choose something strong — you won&apos;t need to share it with anyone.
        </p>
        <div style={{ marginTop: 24, padding: '13px 15px', borderRadius: 14, background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(2px)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.2px', marginBottom: 7 }}>Password tips</div>
          {['At least 12 characters', 'Mix uppercase, numbers & symbols', 'Don\'t reuse a previous password'].map(tip => (
            <div key={tip} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 5, opacity: .92 }}>
              <div style={{ width: 5, height: 5, borderRadius: 9999, background: GREEN, flexShrink: 0 }} />
              {tip}
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', marginTop: 28, fontSize: 11, opacity: .7 }}>© 2026 EVEcosys · Jakarta, Indonesia</div>
    </div>
  )
}

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

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError('Failed to update password. Please try again.'); setLoading(false); return }

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
      const routes: Record<string, string> = { manager: '/manager', board: '/board', driver: '/driver' }
      router.push(routes[profile?.role ?? 'driver'])
    }, 2000)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 24px', background: BG, overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <h2 style={{ fontSize: 23, fontWeight: 800, color: TEXT, letterSpacing: '-.4px', margin: 0 }}>
          {isForced ? 'Update your password' : 'Set new password'}
        </h2>
        <p style={{ fontSize: 13, color: TEXT3, marginTop: 5, lineHeight: 1.5 }}>
          Choose a strong password — minimum 8 characters.
        </p>

        {isForced && !done && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderRadius: 12, background: '#fef3dc', border: '1px solid #f0d080', color: '#8a5500', fontSize: 13, marginTop: 16 }}>
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            Your password has expired. Please set a new password to continue.
          </div>
        )}

        <div style={{ marginTop: 22 }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ width: 60, height: 60, borderRadius: 9999, background: '#d7f0c4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={30} color={GREEN} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>Password updated</div>
              <div style={{ fontSize: 13, color: TEXT3, marginTop: 6 }}>Redirecting you to your dashboard…</div>
            </div>
          ) : (
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && (
                <div data-testid="auth-error" style={{ borderRadius: 10, padding: '10px 13px', fontSize: 13, background: '#fdeaea', color: '#8a1010', border: '1px solid #f5c0c0' }}>
                  {error}
                </div>
              )}

              {(['New password', 'Confirm password'] as const).map((label, idx) => {
                const val = idx === 0 ? password : confirm
                const setter = idx === 0 ? setPassword : setConfirm
                return (
                  <PwField key={label} label={label} value={val} onChange={setter} showToggle={idx === 0} showPassword={showPassword} onToggle={() => setShowPassword(p => !p)} />
                )
              })}

              <button
                type="submit" disabled={loading}
                style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: loading ? '#5a9e2f' : GREEN, color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.8 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function PwField({ label, value, onChange, showToggle, showPassword, onToggle }: {
  label: string; value: string; onChange: (v: string) => void
  showToggle: boolean; showPassword: boolean; onToggle: () => void
}) {
  const [on, setFoc] = useState(false)
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: TEXT2, marginBottom: 6 }}>{label}</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, height: 46, padding: '0 13px',
        borderRadius: 12, background: '#fff', border: `1.5px solid ${on ? GREEN : BORDER}`,
        boxShadow: on ? FOCUS_RING : 'none', transition: 'all .15s',
      }}>
        <input
          type={showPassword ? 'text' : 'password'} value={value} placeholder="••••••••"
          onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
          onChange={e => onChange(e.target.value)} required
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: TEXT, minWidth: 0 }}
        />
        {showToggle && (
          <button type="button" onClick={onToggle} style={{ color: TEXT3, display: 'flex' }}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </label>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: BG }} />}>
      <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
        <BrandPanel />
        <ResetPasswordForm />
      </div>
    </Suspense>
  )
}
