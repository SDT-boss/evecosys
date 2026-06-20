'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
  EmptyState,
  Alert,
  AlertTitle,
  AlertDescription,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  Spinner,
  Button,
  Card,
  CardContent,
} from '@evecosys/design-system'

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

export function MemberTable({ members, authTroubleshootingEnabled }: MemberTableProps) {
  const [localMembers, setLocalMembers] = useState<Member[]>(members)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [removePending, setRemovePending] = useState<string | null>(null)
  const [resetPending, setResetPending] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)

  async function handleRemove(userId: string) {
    setRemovePending(userId)
    setRemoveError(null)
    try {
      const res = await fetch('/api/board/settings/users/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (res.ok) {
        setLocalMembers((prev) => prev.filter((m) => m.id !== userId))
      } else {
        setRemoveError(data.error ?? 'Failed to remove member')
      }
    } catch {
      setRemoveError('Failed to remove member')
    } finally {
      setRemovePending(null)
    }
  }

  async function handleForceReset(userId: string) {
    setResetPending(userId)
    setResetError(null)
    try {
      const res = await fetch('/api/board/settings/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        setResetSuccess(userId)
        setTimeout(() => setResetSuccess(null), 3000)
      } else {
        const data = await res.json().catch(() => ({}))
        setResetError(data.error ?? 'Password reset failed')
        setTimeout(() => setResetError(null), 5000)
      }
    } catch {
      setResetError('Password reset failed')
      setTimeout(() => setResetError(null), 5000)
    } finally {
      setResetPending(null)
    }
  }

  if (localMembers.length === 0) {
    return (
      <EmptyState
        icon={<Users size={24} />}
        title="No team members"
        description="Invite your first manager or driver using the form above."
      />
    )
  }

  return (
    <Card>
      <CardContent style={{ paddingTop: 'var(--ds-space-lg)' }}>
        <h2
          style={{
            fontSize: 'var(--ds-font-size-lg)',
            fontWeight: 'var(--ds-font-weight-semibold)',
            color: 'var(--ds-color-neutral-ink)',
            marginBottom: 'var(--ds-space-md)',
          }}
        >
          Team members
        </h2>

        {removeError && (
          <Alert variant="destructive" style={{ marginBottom: 'var(--ds-space-md)' }}>
            <AlertTitle>Remove failed</AlertTitle>
            <AlertDescription>{removeError}</AlertDescription>
          </Alert>
        )}

        {resetError && (
          <Alert variant="destructive" style={{ marginBottom: 'var(--ds-space-md)' }}>
            <AlertTitle>Reset failed</AlertTitle>
            <AlertDescription>{resetError}</AlertDescription>
          </Alert>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell
                  style={{
                    fontWeight: 'var(--ds-font-weight-medium)',
                    color: 'var(--ds-color-neutral-ink)',
                  }}
                >
                  {member.full_name}
                </TableCell>
                <TableCell
                  style={{
                    fontSize: 'var(--ds-font-size-sm)',
                    color: 'var(--ds-color-neutral-grey-60)',
                  }}
                >
                  {member.email}
                </TableCell>
                <TableCell>
                  <Badge variant={member.role === 'manager' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell
                  style={{
                    fontSize: 'var(--ds-font-size-sm)',
                    color: 'var(--ds-color-neutral-grey-60)',
                  }}
                >
                  {new Date(member.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell>
                  <div style={{ display: 'flex', gap: 'var(--ds-space-sm)', alignItems: 'center' }}>
                    {authTroubleshootingEnabled && (
                      resetSuccess === member.id ? (
                        <span
                          style={{
                            fontSize: 'var(--ds-font-size-sm)',
                            color: 'var(--ds-color-status-success)',
                          }}
                        >
                          Reset email sent
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={resetPending === member.id}
                          title={`Send a password reset email to ${member.full_name}`}
                          aria-label={`Reset password for ${member.full_name}`}
                          onClick={() => handleForceReset(member.id)}
                        >
                          {resetPending === member.id ? (
                            <Spinner size="sm" aria-hidden="true" />
                          ) : (
                            'Reset password'
                          )}
                        </Button>
                      )
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={removePending === member.id}
                        >
                          {removePending === member.id ? (
                            <Spinner size="sm" aria-hidden="true" />
                          ) : (
                            'Remove'
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove {member.full_name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove {member.full_name} ({member.email}) from
                            your tenant and revoke their access. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemove(member.id)}>
                            Remove member
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
