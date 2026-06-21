'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AccountBlockUser {
  name: string
  email: string
  avatarUrl?: string
}

interface AccountBlockProps {
  user: AccountBlockUser
}

export function AccountBlock({ user }: AccountBlockProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--ds-space-sm)',
        padding: 'var(--ds-space-sm) var(--ds-space-md)',
        borderTop: '1px solid var(--ds-color-neutral-grey-20)',
        marginTop: 'auto',
      }}
    >
      {/* Avatar */}
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt={user.name}
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--ds-radius-full)',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--ds-radius-full)',
            background: 'var(--ds-color-brand-primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--ds-font-size-xs)',
            fontWeight: 'var(--ds-font-weight-bold)',
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
      )}

      {/* Name + email */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 'var(--ds-font-size-xs)',
            fontWeight: 'var(--ds-font-weight-semibold)',
            color: 'var(--ds-color-neutral-ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {user.name}
        </div>
        <div
          style={{
            fontSize: '10px',
            color: 'var(--ds-color-neutral-grey-40)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {user.email}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        aria-label="Sign out"
        style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--ds-radius-sm)',
          border: '1px solid var(--ds-color-neutral-grey-20)',
          background: 'transparent',
          color: 'var(--ds-color-neutral-grey-40)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'color var(--ds-motion-duration-fast) var(--ds-motion-easing-standard)',
        }}
      >
        <LogOut size={13} />
      </button>
    </div>
  )
}
