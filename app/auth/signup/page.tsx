"use client"

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Logo } from '@/components/ui/Logo'
import SignupForm from '@/components/auth/SignupForm'

export default function SignupPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <Logo src="/Evecosys_light.png" />
        <ThemeToggle />
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm fade-in">

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text)' }}>
              Create account
            </h1>
            <p className="text-sm" style={{ color: 'var(--text3)' }}>
              Sign up for an EVEcosys account
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <SignupForm />
          </div>

          {/* Footer note */}
          <p className="text-center text-xs mt-6" style={{ color: 'var(--text3)' }}>
            Already have an account?{' '}
            <Link href="/login" className="text-xs font-600 transition-colors" style={{ color: 'var(--text2)', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div className="text-center py-4 text-xs" style={{ color: 'var(--text3)', borderTop: '1px solid var(--border)' }}>
        © 2026 <span style={{ color: '#7cc242', fontWeight: 600 }}>EVEcosys</span> — Fleet Management System
      </div>
    </div>
  )
}
