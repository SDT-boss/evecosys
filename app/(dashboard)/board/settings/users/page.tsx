import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteForm } from '@/components/board/settings/InviteForm'
import { MemberTable } from '@/components/board/settings/MemberTable'
import { InviteStateRow } from '@/components/board/settings/InviteStateRow'

// Static mock invites demonstrating all 5 invite lifecycle states + isLimitedAccess.
// TODO: replace mock data with DB query when invitations table is added.
const MOCK_INVITES = [
  {
    state: 'sent' as const,
    email: 'alice@example.com',
    name: 'Alice Nguyen',
    expiresAt: new Date('2026-06-26T12:00:00Z'),
  },
  {
    state: 'expiring' as const,
    email: 'bob@example.com',
    name: 'Bob Martins',
    expiresAt: new Date('2026-06-21T15:00:00Z'),
  },
  {
    state: 'accepted' as const,
    email: 'carol@example.com',
    name: 'Carol Singh',
    joinedAt: new Date('2026-06-19T10:00:00Z'),
  },
  {
    state: 'expired' as const,
    email: 'dave@example.com',
    name: 'Dave Okafor',
    expiresAt: new Date('2026-06-14T10:00:00Z'),
  },
  {
    state: 'revoked' as const,
    email: 'eve@example.com',
    name: 'Eve Tanaka',
    revokedAt: new Date('2026-06-18T10:00:00Z'),
  },
  {
    state: 'sent' as const,
    email: 'frank@example.com',
    name: 'Frank Dube',
    expiresAt: new Date('2026-06-25T12:00:00Z'),
    isLimitedAccess: true,
  },
]

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, feature_flags')
    .eq('owner_id', user.id)
    .single()

  if (!tenant) redirect('/board/settings')

  const { data: members } = await supabase
    .from('users')
    .select('id, full_name, email, role, created_at')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-lg)' }}>
      <InviteForm tenantId={tenant.id} />
      <MemberTable
        members={members ?? []}
        authTroubleshootingEnabled={tenant?.feature_flags?.auth_troubleshooting ?? false}
      />
      {/* Invite lifecycle showcase — all 5 states + isLimitedAccess example */}
      {/* TODO: replace mock data with DB query when invitations table is added */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          border: '1px solid var(--ds-color-neutral-grey-10)',
          borderRadius: 'var(--ds-radius-lg)',
          padding: 'var(--ds-space-md)',
          fontFamily: 'var(--ds-font-family-sans)',
        }}
      >
        <p
          style={{
            fontSize: 'var(--ds-font-size-sm)',
            fontWeight: 'var(--ds-font-weight-semibold)',
            color: 'var(--ds-color-neutral-ink)',
            margin: '0 0 var(--ds-space-sm)',
          }}
        >
          Pending Invitations
        </p>
        {MOCK_INVITES.map((invite) => (
          <InviteStateRow
            key={invite.email}
            state={invite.state}
            email={invite.email}
            name={invite.name}
            expiresAt={invite.expiresAt}
            joinedAt={invite.joinedAt}
            revokedAt={invite.revokedAt}
            isLimitedAccess={invite.isLimitedAccess}
          />
        ))}
      </section>
    </div>
  )
}
