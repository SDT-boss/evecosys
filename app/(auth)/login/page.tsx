"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/* ── Material Symbols icon ── */
function Sym({ n, s = 18, c = 'currentColor' }: { n: string; s?: number; c?: string }) {
  return (
    <span className="msym" style={{ fontSize: s, color: c, width: s, height: s }}>
      {n}
    </span>
  )
}

/* ── Primary / secondary buttons ── */
function Btn({
  kind = 'primary', icon, children, onClick, disabled, style, type = 'button',
}: {
  kind?: 'primary' | 'teal' | 'secondary' | 'ghost'
  icon?: string; children: React.ReactNode; onClick?: () => void
  disabled?: boolean; style?: React.CSSProperties; type?: 'button' | 'submit'
}) {
  const s = {
    primary:   { background: '#7cc242', color: '#fff',    border: 'none' },
    teal:      { background: '#1a7080', color: '#fff',    border: 'none' },
    secondary: { background: '#f4f8f5', color: '#5a6a5a', border: '1px solid #e7efe9' },
    ghost:     { background: 'transparent', color: '#1a7080', border: 'none' },
  }[kind]
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: 7, padding: '9px 16px', borderRadius: 9999, fontSize: 13, fontWeight: 700,
        transition: 'filter .15s, opacity .15s', opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer', ...s, ...style,
      }}
    >
      {icon && <Sym n={icon} s={16} c={s.color} />}
      {children}
    </button>
  )
}

type AuthMode = 'signin' | 'routing' | 'forgot' | 'sent'

const DASHBOARD_BY_ROLE: Record<string, { label: string; icon: string }> = {
  platform_admin: { label: 'Platform Admin',  icon: 'shield_person' },
  super_admin:    { label: 'Platform Admin',  icon: 'shield_person' },
  board:          { label: 'Board Dashboard', icon: 'insights' },
  manager:        { label: 'Fleet Manager',   icon: 'manage_accounts' },
  driver:         { label: 'Driver App',      icon: 'directions_car' },
}

/* ── Left brand panel ── */
function BrandPanel() {
  const highlights: [string, string, string][] = [
    ['bolt',          'Live fleet telemetry',       'Every vehicle, charge state & trip in real time'],
    ['verified_user', 'Predictive maintenance',     'Mission-readiness scoring before dispatch'],
    ['shield_lock',   'Secure by role',             'You only ever see what your account is cleared for'],
  ]
  return (
    <div
      className="eve-grad brand-panel"
      style={{
        position: 'relative', flex: '0 0 42%', maxWidth: 460, minWidth: 340,
        padding: '40px 40px 32px', display: 'flex', flexDirection: 'column',
        color: '#fff', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: -90, right: -70, width: 300, height: 300, borderRadius: 9999, background: 'rgba(255,255,255,.10)' }} />
      <div style={{ position: 'absolute', bottom: -120, left: -80, width: 320, height: 320, borderRadius: 9999, background: 'rgba(255,255,255,.07)' }} />

      <div style={{ position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/evecosys-dark.png" alt="EVEcosys" style={{ height: 26, display: 'block' }} />
      </div>

      <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 36 }}>
        <h1 style={{ fontSize: 27, fontWeight: 800, lineHeight: 1.18, letterSpacing: '-.6px', margin: 0 }}>
          The control plane for your<br />electric fleet.
        </h1>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, opacity: .9, marginTop: 12, maxWidth: 330 }}>
          Multi-tenant fleet electrification &amp; operations — charging, trip planning, driver safety and predictive maintenance in one place.
        </p>

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 11 }}>
          {highlights.map(([ic, title, desc]) => (
            <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 32, height: 32, borderRadius: 9999, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sym n={ic} s={17} c="#fff" />
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
                <div style={{ fontSize: 11, opacity: .82 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', marginTop: 28, fontSize: 11, opacity: .75 }}>
        © 2026 EVEcosys · Jakarta, Indonesia
      </div>
    </div>
  )
}

/* ── Labeled input with focus ring ── */
function Field({
  label, type = 'text', value, onChange, placeholder, icon, hint, focusKey, focus, setFocus, trailing,
}: {
  label: string; type?: string; value: string; onChange?: (v: string) => void
  placeholder?: string; icon?: string; hint?: string; focusKey: string
  focus: string; setFocus: (k: string) => void; trailing?: React.ReactNode
}) {
  const on = focus === focusKey
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#46524a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}{hint && <span style={{ fontWeight: 500, color: '#9aa79e', fontSize: 11 }}>· {hint}</span>}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, height: 46, padding: '0 13px',
        borderRadius: 12, background: '#fff',
        border: `1.5px solid ${on ? '#7cc242' : '#dde6df'}`,
        boxShadow: on ? '0 0 0 3px rgba(124,194,66,.18)' : 'none',
        transition: 'border-color .15s, box-shadow .15s',
      }}>
        {icon && <Sym n={icon} s={18} c={on ? '#5a9e2f' : '#9aa79e'} />}
        <input
          type={type} value={value} placeholder={placeholder}
          onFocus={() => setFocus(focusKey)} onBlur={() => setFocus('')}
          onChange={e => onChange?.(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#16201b', minWidth: 0 }}
        />
        {trailing}
      </div>
    </label>
  )
}

const DEMO_ACCTS = [
  { email: 'platform-admin@evecosys.local', label: 'platform-admin', pw: 'DevPassword123!' },
  { email: 'board@evecosys.local',          label: 'board',          pw: 'DevPassword123!' },
  { email: 'manager@evecosys.local',        label: 'manager',        pw: 'DevPassword123!' },
  { email: 'driver@evecosys.local',         label: 'driver',         pw: 'DevPassword123!' },
]

function AuthForms() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<AuthMode>((searchParams.get('mode') as AuthMode) ?? 'signin')
  const [focus, setFocus] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [acct, setAcct] = useState<{ name: string; role: string } | null>(null)

  function go(m: AuthMode) { setMode(m); setError('') }

  useEffect(() => {
    if (mode === 'routing' && acct) {
      const id = setTimeout(() => { window.location.href = '/' }, 1800)
      return () => clearTimeout(id)
    }
  }, [mode, acct])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setFocus('e'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (authError) { setError('Invalid email or password.'); setLoading(false); return }
    if (data.user) {
      let role = data.user.user_metadata?.role as string | undefined
      if (!role) {
        const { data: profile } = await supabase.from('users').select('role').eq('id', data.user.id).single()
        role = profile?.role
      }
      const name = (data.user.user_metadata?.full_name as string | undefined)
        ?? data.user.email?.split('@')[0] ?? 'there'
      setAcct({ name, role: role ?? 'driver' })
      setMode('routing')
    } else {
      setLoading(false)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setFocus('fe'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` })
    setLoading(false)
    go('sent')
  }

  const dash = acct ? (DASHBOARD_BY_ROLE[acct.role] ?? DASHBOARD_BY_ROLE.driver) : null

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 24px', background: '#eef3f0', overflowY: 'auto' }}>
      <div className="rb-fade" key={mode} style={{ width: '100%', maxWidth: 380 }}>

        {/* ════ SIGN IN ════ */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn}>
            <h2 style={{ fontSize: 23, fontWeight: 800, color: '#16201b', letterSpacing: '-.4px', margin: 0 }}>Welcome back</h2>
            <p style={{ fontSize: 13.5, color: '#8a978c', marginTop: 5 }}>Sign in and we&apos;ll take you to your dashboard.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>
              <Field label="Email" type="email" icon="mail" value={email} onChange={setEmail}
                placeholder="you@company.com" focusKey="e" focus={focus} setFocus={setFocus} />

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#46524a' }}>Password</span>
                  <button type="button" onClick={() => go('forgot')} style={{ fontSize: 11.5, fontWeight: 700, color: '#1a7080', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Forgot?
                  </button>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 9, height: 46, padding: '0 13px',
                  borderRadius: 12, background: '#fff',
                  border: `1.5px solid ${focus === 'p' ? '#7cc242' : '#dde6df'}`,
                  boxShadow: focus === 'p' ? '0 0 0 3px rgba(124,194,66,.18)' : 'none',
                  transition: 'all .15s',
                }}>
                  <Sym n="lock" s={18} c={focus === 'p' ? '#5a9e2f' : '#9aa79e'} />
                  <input
                    type={showPw ? 'text' : 'password'} value={pw} placeholder="••••••••"
                    onFocus={() => setFocus('p')} onBlur={() => setFocus('')}
                    onChange={e => setPw(e.target.value)}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#16201b', minWidth: 0 }}
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                    <Sym n={showPw ? 'visibility_off' : 'visibility'} s={17} c="#9aa79e" />
                  </button>
                </div>
              </div>

              {error && (
                <div data-testid="auth-error" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', borderRadius: 11, background: '#fce4e4', border: '1px solid #f5c0c0' }}>
                  <Sym n="error_outline" s={16} c="#9a1414" />
                  <span style={{ fontSize: 13, color: '#9a1414', fontWeight: 600 }}>{error}</span>
                </div>
              )}

              <Btn kind="primary" icon={loading ? undefined : 'login'} disabled={loading} type="submit"
                style={{ width: '100%', padding: '13px', fontSize: 14, marginTop: 2, borderRadius: 12 }}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Btn>
            </div>

            <p style={{ fontSize: 12, color: '#9aa79e', textAlign: 'center', lineHeight: 1.5, marginTop: 20 }}>
              EVEcosys is an invitation-based platform.<br />
              Need access?{' '}
              <button type="button" onClick={() => go('forgot')} style={{ fontWeight: 700, color: '#1a7080', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12 }}>
                Contact your administrator.
              </button>
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div style={{ marginTop: 18, padding: '10px 12px', borderRadius: 13, background: '#fff', border: '1px dashed #d4ddd6' }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.4px', color: '#9aa79e', textTransform: 'uppercase', marginBottom: 7 }}>
                  Dev accounts · click to fill
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {DEMO_ACCTS.map(a => (
                    <button key={a.email} type="button"
                      onClick={() => { setEmail(a.email); setPw(a.pw) }}
                      style={{ fontSize: 11, fontWeight: 600, color: '#46524a', background: '#f2f5f2', border: 'none', borderRadius: 9999, padding: '5px 10px', cursor: 'pointer' }}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}

        {/* ════ ROUTING ════ */}
        {mode === 'routing' && acct && dash && (
          <div style={{ textAlign: 'center' }}>
            <div className="eve-grad" style={{ width: 64, height: 64, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Sym n="check" s={32} c="#fff" />
            </div>
            <h2 style={{ fontSize: 21, fontWeight: 800, color: '#16201b', letterSpacing: '-.3px', margin: 0 }}>
              Welcome back, {acct.name.split(' ')[0]}
            </h2>
            <p style={{ fontSize: 13, color: '#5a6a5a', marginTop: 7, lineHeight: 1.5 }}>
              Signed in. Taking you to your workspace…
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0', padding: '13px 15px', borderRadius: 14, background: '#fff', border: '1px solid #eaf0ec', textAlign: 'left' }}>
              <span className="eve-grad" style={{ width: 40, height: 40, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sym n={dash.icon} s={20} c="#fff" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#16201b' }}>{dash.label}</div>
                <div style={{ fontSize: 11.5, color: '#8a978c' }}>Routing to your dashboard</div>
              </div>
              <span className="rb-pulse" style={{ width: 9, height: 9, borderRadius: 9999, background: '#4e9a1f', flexShrink: 0, display: 'block' }} />
            </div>

            <div style={{ height: 5, borderRadius: 9999, background: '#e2e8e2', overflow: 'hidden' }}>
              <div className="route-bar" style={{ height: '100%', background: '#4e9a1f', borderRadius: 9999 }} />
            </div>
            <p style={{ fontSize: 11, color: '#9aa79e', marginTop: 10 }}>
              Your dashboard is determined by your account — not chosen here.
            </p>
            <button onClick={() => window.location.href = '/'} style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: '#1a7080', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Go now →
            </button>
            <div style={{ marginTop: 6 }}>
              <button onClick={() => { setMode('signin'); setAcct(null) }} style={{ fontSize: 12, color: '#9aa79e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Not you? Sign in again
              </button>
            </div>
          </div>
        )}

        {/* ════ FORGOT PASSWORD ════ */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot}>
            <button type="button" onClick={() => go('signin')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: '#8a978c', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 14 }}>
              <Sym n="arrow_back" s={16} c="#8a978c" /> Back to sign in
            </button>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#16201b', letterSpacing: '-.4px', margin: 0 }}>Reset your password</h2>
            <p style={{ fontSize: 13, color: '#8a978c', marginTop: 5, lineHeight: 1.5 }}>
              Enter your email and we&apos;ll send a secure reset link. It expires in 30 minutes.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
              <Field label="Email" type="email" icon="mail" value={email} onChange={setEmail}
                placeholder="you@company.com" focusKey="fe" focus={focus} setFocus={setFocus} />
              {error && (
                <div data-testid="auth-error" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', borderRadius: 11, background: '#fce4e4', border: '1px solid #f5c0c0' }}>
                  <Sym n="error_outline" s={16} c="#9a1414" />
                  <span style={{ fontSize: 13, color: '#9a1414', fontWeight: 600 }}>{error}</span>
                </div>
              )}
              <Btn kind="teal" icon={loading ? undefined : 'send'} disabled={loading} type="submit"
                style={{ width: '100%', padding: '13px', fontSize: 14, borderRadius: 12 }}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Btn>
            </div>
          </form>
        )}

        {/* ════ RESET LINK SENT ════ */}
        {mode === 'sent' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: 9999, background: '#d9edf1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Sym n="mark_email_read" s={30} c="#0d5563" />
            </div>
            <h2 style={{ fontSize: 21, fontWeight: 800, color: '#16201b', letterSpacing: '-.3px', margin: 0 }}>Check your inbox</h2>
            <p style={{ fontSize: 13, color: '#5a6a5a', marginTop: 8, lineHeight: 1.55 }}>
              If an account exists for{' '}
              <b style={{ color: '#16201b' }}>{email || 'your email'}</b>, a reset link is on its way. The link expires in 30 minutes.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', margin: '16px 0', padding: '9px 13px', borderRadius: 12, background: '#fff', border: '1px solid #eaf0ec' }}>
              <Sym n="info" s={16} c="#8a978c" />
              <span style={{ fontSize: 12, color: '#5a6a5a' }}>
                Didn&apos;t get it? Check spam, or{' '}
                <button onClick={() => go('forgot')} style={{ fontWeight: 700, color: '#1a7080', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12 }}>
                  try again
                </button>.
              </span>
            </div>
            <div style={{ marginTop: 14 }}>
              <button onClick={() => go('signin')} style={{ fontSize: 12.5, fontWeight: 700, color: '#1a7080', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Back to sign in
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="auth-layout" style={{ display: 'flex', minHeight: '100vh', background: '#eef3f0' }}>
      <BrandPanel />
      <Suspense fallback={<div style={{ flex: 1 }} />}>
        <AuthForms />
      </Suspense>
    </div>
  )
}
