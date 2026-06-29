'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AccountBlockUser {
  name: string
  email: string
  avatarUrl?: string
}

interface AccountBlockProps {
  user: AccountBlockUser
  collapsed?: boolean
}

export function AccountBlock({ user, collapsed = false }: AccountBlockProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = (user.name ?? '')
    .split(' ')
    .map((n) => n[0] ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  const avatar = user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatarUrl}
      alt={user.name}
      data-testid="user-avatar"
      style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  ) : (
    <div
      data-testid="user-avatar"
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: '#1a7080',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )

  if (collapsed) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '12px 0 16px',
          borderTop: '1px solid #e7ece8',
        }}
      >
        {avatar}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px 16px',
        borderTop: '1px solid #e7ece8',
      }}
    >
      {avatar}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#16201b',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {user.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#8a978c',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {user.email}
        </div>
      </div>
      <button
        onClick={handleLogout}
        aria-label="Sign out"
        title="Sign out"
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          border: '1px solid #e7ece8',
          background: 'transparent',
          color: '#9aa79e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'color 100ms ease, border-color 100ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#d62f2f'
          e.currentTarget.style.borderColor = '#f8d0d0'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#9aa79e'
          e.currentTarget.style.borderColor = '#e7ece8'
        }}
      >
        <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>
          logout
        </span>
      </button>
    </div>
  )
}
