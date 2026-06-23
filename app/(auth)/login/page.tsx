"use client"

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import {
  Bolt, Mail, Lock, Eye, EyeOff, ArrowLeft, ChevronRight,
  Shield, LayoutDashboard, Briefcase, Car, CheckCircle,
  MailOpen, Send, LogIn, Network, Layers, CalendarClock,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type AuthMode = 'signin' | 'superadmin' | 'invite' | 'blocked' | 'forgot' | 'sent' | 'reset' | 'resetdone'

const INVITE_CHAIN = [
  { role: 'super_admin', label: 'Super Admin',  Icon: Shield,          byLine: 'Self sign-up · platform setup',                       self: true },
  { role: 'board',       label: 'Board Member', Icon: LayoutDashboard, byLine: 'Invited by Super Admin' },
  { role: 'manager',     label: 'Manager',      Icon: Briefcase,       byLine: 'Invited by the Board · assigned projects' },
  { role: 'driver',      label: 'Driver',       Icon: Car,             byLine: 'Invited by Board or Manager · joins a fleet' },
]

const PANEL_GRADIENT = 'linear-gradient(150deg, #0e3d2a 0%, #1a7080 100%)'
const FOCUS_RING = '0 0 0 3px rgba(124,194,66,.20)'
const BG = '#eef3f0'
const GREEN = '#7cc242'
const TEAL = '#1a7080'
const TEXT = '#16201b'
const TEXT2 = '#46524a'
const TEXT3 = '#8a978c'
const BORDER = '#dde6df'

/* ── Brand panel (left column) ── */
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
        <h1 style={{ fontSize: 27, fontWeight: 800, lineHeight: 1.18, letterSpacing: '-.6px', margin: 0 }}>
          The control plane for your<br />electric fleet.
        </h1>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, opacity: .9, marginTop: 12, maxWidth: 330 }}>
          Multi-tenant fleet electrification &amp; operations. Access is invitation-based — every account is provisioned through the chain below.
        </p>

        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {INVITE_CHAIN.map(({ role, label, Icon, byLine, self }) => (
            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 13, background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(2px)' }}>
              <span style={{ width: 28, height: 28, borderRadius: 9999, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} color="#fff" />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: 10.5, opacity: .85 }}>{byLine}</div>
              </div>
              {self
                ? <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.4px', background: 'rgba(255,255,255,.22)', padding: '3px 8px', borderRadius: 9999 }}>Self sign-up</span>
                : <Mail size={14} color="rgba(255,255,255,.8)" />}
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', marginTop: 28, fontSize: 11, opacity: .7 }}>© 2026 EVEcosys · Jakarta, Indonesia</div>
    </div>
  )
}

/* ── Labeled field ── */
function Field({ label, type = 'text', value, onChange, placeholder, iconEl, locked, hint }: {
  label: string; type?: string; value: string; onChange?: (v: string) => void
  placeholder?: string; iconEl?: React.ReactNode; locked?: boolean; hint?: string
}) {
  const [on, setOn] = useState(false)
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: TEXT2, marginBottom: 6, display: 'flex', gap: 6 }}>
        {label}{hint && <span style={{ fontWeight: 500, color: TEXT3, fontSize: 11 }}>· {hint}</span>}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, height: 46, padding: '0 13px',
        borderRadius: 12, background: locked ? '#f2f5f2' : '#fff',
        border: `1.5px solid ${on ? GREEN : BORDER}`,
        boxShadow: on ? FOCUS_RING : 'none', transition: 'border-color .15s, box-shadow .15s',
      }}>
        {iconEl && <span style={{ color: on ? '#5a9e2f' : TEXT3, display: 'flex' }}>{iconEl}</span>}
        <input
          type={type} value={value} placeholder={placeholder} disabled={locked}
          onFocus={() => setOn(true)} onBlur={() => setOn(false)}
          onChange={e => onChange?.(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: locked ? '#7a8a7e' : TEXT, minWidth: 0 }}
        />
        {locked && <Lock size={14} color="#b8c2ba" />}
      </div>
    </label>
  )
}

function PwField({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string }) {
  const [show, setShow] = useState(false)
  const [on, setFoc] = useState(false)
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: TEXT2, marginBottom: 6, display: 'flex', gap: 6 }}>
        {label}{hint && <span style={{ fontWeight: 500, color: TEXT3, fontSize: 11 }}>· {hint}</span>}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, height: 46, padding: '0 13px',
        borderRadius: 12, background: '#fff', border: `1.5px solid ${on ? GREEN : BORDER}`,
        boxShadow: on ? FOCUS_RING : 'none', transition: 'all .15s',
      }}>
        <span style={{ color: on ? '#5a9e2f' : TEXT3, display: 'flex' }}><Lock size={17} /></span>
        <input
          type={show ? 'text' : 'password'} value={value} placeholder={placeholder ?? '••••••••'}
          onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
          onChange={e => onChange(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: TEXT, minWidth: 0 }}
        />
        <button type="button" onClick={() => setShow(s => !s)} style={{ color: TEXT3, display: 'flex' }}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  )
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: '#e7efe9' }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: TEXT3 }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: '#e7efe9' }} />
    </div>
  )
}

function GreenBtn({ children, onClick, disabled, type = 'button', icon }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit'; icon?: React.ReactNode
}) {
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      style={{
        width: '100%', padding: '13px', borderRadius: 12, border: 'none',
        background: disabled ? '#5a9e2f' : GREEN, color: '#fff', fontSize: 14, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: disabled ? 0.8 : 1, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background .15s',
      }}
    >
      {icon}{children}
    </button>
  )
}

/* ── Sample invite (real app would decode token from URL) ── */
const SAMPLE_INVITE = {
  role: 'manager', email: 'putri.handayani@evecosys.com', name: 'Putri Handayani',
  invitedBy: 'Sutanto Wijaya', invitedByRole: 'Board Member',
  project: 'Jakarta Metro Fleet', region: 'DKI Jakarta', expires: 'in 6 days',
}

function AuthForms() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode = (searchParams.get('mode') as AuthMode) ?? 'signin'

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [name, setName] = useState('')
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function go(m: AuthMode) { setMode(m); setError('') }

  /* ── Sign in ── */
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password: pw })
    console.log('[login] signIn result:', { user: data?.user?.email, error: authError?.message })
    if (authError) { setError('Invalid email or password.'); setLoading(false); return }
    if (data.user) {
      const { data: profile, error: profileError } = await supabase.from('users').select('role, force_password_reset_at').eq('id', data.user.id).single()
      console.log('[login] profile result:', { role: profile?.role, error: profileError?.message })
      if (profile?.force_password_reset_at && new Date(profile.force_password_reset_at) < new Date()) {
        router.push('/reset-password?forced=true'); return
      }
      const routes: Record<string, string> = { platform_admin: '/platform', manager: '/manager', board: '/board', driver: '/driver' }
      const dest = routes[profile?.role ?? 'driver'] ?? '/login'
      console.log('[login] navigating to:', dest)
      window.location.href = dest
    } else {
      console.log('[login] no user in response')
      setLoading(false)
    }
  }

  /* ── Super admin sign-up ── */
  async function handleSuperAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (pw !== pw2) { setError('Passwords do not match.'); return }
    if (pw.length < 12) { setError('Password must be at least 12 characters.'); return }
    if (!agree) { setError('You must agree to the platform terms.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({ email, password: pw, options: { data: { full_name: name } } })
    setLoading(false)
    if (signUpError) { setError('Unable to create account. ' + (signUpError.message ?? '')); return }
    go('signin')
  }

  /* ── Forgot password ── */
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (resetError) { setError('Something went wrong. Please try again.'); return }
    go('sent')
  }

  const inv = SAMPLE_INVITE

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 24px', background: BG, overflowY: 'auto' }}>
      <div key={mode} style={{ width: '100%', maxWidth: 380 }}>

        {/* ════ SIGN IN ════ */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn}>
            <h2 style={{ fontSize: 23, fontWeight: 800, color: TEXT, letterSpacing: '-.4px', margin: 0 }}>Welcome back</h2>
            <p style={{ fontSize: 13.5, color: TEXT3, marginTop: 5 }}>Sign in to your EVEcosys account.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>
              {error && <div data-testid="auth-error" style={{ borderRadius: 10, padding: '10px 13px', fontSize: 13, background: '#fdeaea', color: '#8a1010', border: '1px solid #f5c0c0' }}>{error}</div>}
              <Field label="Work email" type="email" iconEl={<Mail size={17} />} value={email} onChange={setEmail} placeholder="you@company.com" />
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: TEXT2 }}>Password</span>
                  <button type="button" onClick={() => go('forgot')} style={{ fontSize: 11.5, fontWeight: 700, color: TEAL, background: 'none', border: 'none', cursor: 'pointer' }}>Forgot?</button>
                </div>
                <PwField label="" value={pw} onChange={setPw} />
              </div>
              <GreenBtn type="submit" disabled={loading} icon={loading ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={16} />}>
                {loading ? 'Signing in…' : 'Sign in'}
              </GreenBtn>
            </div>
            <div style={{ margin: '20px 0' }}><Divider>access is invitation-based</Divider></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                { icon: <Mail size={17} color={TEAL} />, title: 'I have an invitation', sub: 'Board, Manager & Driver join here', m: 'invite' as AuthMode },
                { icon: <Shield size={17} color="#5b21b6" />, title: 'Set up the platform', sub: 'Super Admin · the only self-serve sign-up', m: 'superadmin' as AuthMode },
              ].map(({ icon, title, sub, m }) => (
                <button key={m} type="button" onClick={() => go(m)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 13, background: '#fff', border: '1px solid #e7efe9', textAlign: 'left', cursor: 'pointer' }}>
                  {icon}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: TEXT }}>{title}</div>
                    <div style={{ fontSize: 11, color: TEXT3 }}>{sub}</div>
                  </div>
                  <ChevronRight size={17} color="#bcc8c0" />
                </button>
              ))}
            </div>
          </form>
        )}

        {/* ════ SUPER ADMIN SIGN-UP ════ */}
        {mode === 'superadmin' && (
          <form onSubmit={handleSuperAdmin}>
            <button type="button" onClick={() => go('signin')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: TEXT3, marginBottom: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
              <ArrowLeft size={15} color={TEXT3} />Back to sign in
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: '-.4px', margin: 0 }}>Platform setup</h2>
              <span style={{ fontSize: 11, fontWeight: 800, background: '#ede9fe', color: '#5b21b6', padding: '3px 10px', borderRadius: 9999 }}>Super Admin</span>
            </div>
            <p style={{ fontSize: 13, color: TEXT3, marginTop: 5, lineHeight: 1.5 }}>
              This is the <strong>only</strong> account you can create directly. Every other role joins by invitation.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 20 }}>
              {error && <div data-testid="auth-error" style={{ borderRadius: 10, padding: '10px 13px', fontSize: 13, background: '#fdeaea', color: '#8a1010', border: '1px solid #f5c0c0' }}>{error}</div>}
              <Field label="Full name" iconEl={<Mail size={17} />} value={name} onChange={setName} placeholder="Your name" />
              <Field label="Work email" type="email" iconEl={<Mail size={17} />} value={email} onChange={setEmail} placeholder="admin@evecosys.com" />
              <PwField label="Create password" value={pw} onChange={setPw} placeholder="At least 12 characters" hint="min 12 chars" />
              <PwField label="Confirm password" value={pw2} onChange={setPw2} placeholder="Re-enter password" />
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12, color: TEXT2, lineHeight: 1.45, cursor: 'pointer' }}>
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 2, accentColor: GREEN }} />
                I agree to the EVEcosys platform terms &amp; data-processing agreement.
              </label>
              <GreenBtn type="submit" disabled={loading} icon={loading ? <Loader2 size={15} className="animate-spin" /> : <Shield size={16} />}>
                {loading ? 'Creating…' : 'Create Super Admin account'}
              </GreenBtn>
            </div>
          </form>
        )}

        {/* ════ ACCEPT INVITATION ════ */}
        {mode === 'invite' && (
          <>
            <button type="button" onClick={() => go('signin')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: TEXT3, marginBottom: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
              <ArrowLeft size={15} color={TEXT3} />Back to sign in
            </button>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: '-.4px', margin: 0 }}>You&apos;re invited</h2>
            <p style={{ fontSize: 13, color: TEXT3, marginTop: 5 }}>Accept to create your account and join the team.</p>
            <div style={{ borderRadius: 16, border: '1px solid #d9ecdf', padding: 14, marginTop: 18, background: '#f2f9f3' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{ width: 40, height: 40, borderRadius: 9999, background: '#d0e8d6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: TEAL, fontSize: 15 }}>
                  {inv.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{inv.name}</div>
                  <div style={{ fontSize: 11.5, color: TEXT2 }}>{inv.email}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: 9999 }}>{inv.role}</span>
              </div>
              <div style={{ height: 1, background: 'rgba(20,60,40,.10)', margin: '12px 0' }} />
              {[
                [<Network key="network" size={14} color={TEAL} />, 'Invited by', `${inv.invitedBy} · ${inv.invitedByRole}`],
                [<Layers key="layers" size={14} color={TEAL} />, 'Project', `${inv.project} · ${inv.region}`],
                [<CalendarClock key="cal" size={14} color={TEAL} />, 'Expires', inv.expires],
              ].map(([icon, k, v], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 7 }}>
                  {icon}<span style={{ color: TEXT3 }}>{k}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 700, color: TEXT }}>{v as string}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 16 }}>
              <Field label="Email" type="email" iconEl={<Mail size={17} />} value={inv.email} locked hint="from invitation" />
              <PwField label="Create password" value={pw} onChange={setPw} placeholder="At least 12 characters" hint="min 12 chars" />
              <GreenBtn icon={<CheckCircle size={16} />}>Accept &amp; create account</GreenBtn>
              <button type="button" onClick={() => go('blocked')} style={{ fontSize: 11.5, color: TEXT3, fontWeight: 600, textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>No invitation link? See how to get access</button>
            </div>
          </>
        )}

        {/* ════ INVITATION REQUIRED ════ */}
        {mode === 'blocked' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: 9999, background: '#fcefd6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <MailOpen size={28} color="#8a5300" />
            </div>
            <h2 style={{ fontSize: 21, fontWeight: 800, color: TEXT, letterSpacing: '-.3px', margin: 0 }}>Invitation required</h2>
            <p style={{ fontSize: 13, color: TEXT2, marginTop: 8, lineHeight: 1.55 }}>
              Board, Manager and Driver accounts can&apos;t self-register. You join from an invitation email:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '16px 0', textAlign: 'left' }}>
              {[
                [<LayoutDashboard key="bd" size={17} color={TEAL} />, 'Board members', 'are invited by the Super Admin'],
                [<Briefcase key="mg" size={17} color={TEAL} />, 'Managers', 'are invited by the Board & assigned projects'],
                [<Car key="dr" size={17} color={TEAL} />, 'Drivers', 'are invited by a Board member or Manager to join a fleet'],
              ].map(([icon, who, how], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #eaf0ec' }}>
                  {icon}<span style={{ fontSize: 12.5, color: TEXT2 }}><strong style={{ color: TEXT }}>{who as string}</strong> {how as string}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => go('signin')} style={{ fontSize: 12.5, fontWeight: 700, color: TEAL, marginTop: 14, background: 'none', border: 'none', cursor: 'pointer' }}>Back to sign in</button>
          </div>
        )}

        {/* ════ FORGOT PASSWORD ════ */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot}>
            <button type="button" onClick={() => go('signin')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: TEXT3, marginBottom: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
              <ArrowLeft size={15} color={TEXT3} />Back to sign in
            </button>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: '-.4px', margin: 0 }}>Reset your password</h2>
            <p style={{ fontSize: 13, color: TEXT3, marginTop: 5, lineHeight: 1.5 }}>Enter your work email and we&apos;ll send a secure reset link. It expires in 30 minutes.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
              {error && <div style={{ borderRadius: 10, padding: '10px 13px', fontSize: 13, background: '#fdeaea', color: '#8a1010', border: '1px solid #f5c0c0' }}>{error}</div>}
              <Field label="Work email" type="email" iconEl={<Mail size={17} />} value={email} onChange={setEmail} placeholder="you@company.com" />
              <GreenBtn type="submit" disabled={loading} icon={loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={16} />}>
                {loading ? 'Sending…' : 'Send reset link'}
              </GreenBtn>
            </div>
          </form>
        )}

        {/* ════ RESET LINK SENT ════ */}
        {mode === 'sent' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: 9999, background: '#d9edf1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <MailOpen size={28} color="#0d5563" />
            </div>
            <h2 style={{ fontSize: 21, fontWeight: 800, color: TEXT, letterSpacing: '-.3px', margin: 0 }}>Check your inbox</h2>
            <p style={{ fontSize: 13, color: TEXT2, marginTop: 8, lineHeight: 1.55 }}>
              If an account exists for <strong style={{ color: TEXT }}>{email || 'your email'}</strong>, a reset link is on its way. It expires in 30 minutes.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', margin: '16px 0', padding: '9px 13px', borderRadius: 12, background: '#fff', border: '1px solid #eaf0ec', fontSize: 12, color: TEXT2 }}>
              Didn&apos;t get it? Check spam, or{' '}
              <button type="button" onClick={() => go('forgot')} style={{ fontWeight: 700, color: TEAL, background: 'none', border: 'none', cursor: 'pointer' }}>try again</button>.
            </div>
            <button type="button" onClick={() => go('signin')} style={{ fontSize: 12.5, fontWeight: 700, color: TEAL, marginTop: 8, background: 'none', border: 'none', cursor: 'pointer' }}>Back to sign in</button>
          </div>
        )}
      </div>
    </div>
  )
}

function LoginPageInner() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
      <BrandPanel />
      <AuthForms />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: BG }} />}>
      <LoginPageInner />
    </Suspense>
  )
}
