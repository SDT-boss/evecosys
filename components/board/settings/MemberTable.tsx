'use client'

// Full implementation in Task 2 — this stub satisfies Task 1 typecheck
// so the users page can compile before MemberTable is fully built.

interface Member {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

interface MemberTableProps {
  members: Member[]
  authTroubleshootingEnabled: boolean
}

export function MemberTable({ members, authTroubleshootingEnabled: _authTroubleshootingEnabled }: MemberTableProps) {
  return (
    <div>
      {members.length === 0 ? (
        <p>No team members</p>
      ) : (
        <p>{members.length} team members</p>
      )}
    </div>
  )
}
