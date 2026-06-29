'use client'

import { useState } from 'react'
import {
  Alert,
  AlertTitle,
  AlertDescription,
  Button,
  Input,
  FormField,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Spinner,
  Card,
  CardContent,
} from '@evecosys/design-system'

type ActionResult = { ok: boolean; error?: string }

interface InviteFormProps {
  tenantId: string
}

export function InviteForm({ tenantId }: InviteFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'manager' | 'driver'>('manager')
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    // Defense-in-depth: validate role before API call
    if (!['manager', 'driver'].includes(role)) return

    setPending(true)
    setResult(null)
    try {
      const res = await fetch('/api/board/settings/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      const data = await res.json()
      setResult({ ok: res.ok, error: data.error })
      if (res.ok) {
        setEmail('')
        setRole('manager')
      }
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Network error' })
    } finally {
      setPending(false)
    }
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
          Invite a member
        </h2>

        {result?.ok === true && (
          <Alert variant="success" style={{ marginBottom: 'var(--ds-space-md)' }}>
            <AlertTitle>Invitation sent</AlertTitle>
            <AlertDescription>
              {email || 'Your colleague'} will receive an invitation shortly.
            </AlertDescription>
          </Alert>
        )}

        {result?.ok === false && (
          <Alert variant="destructive" style={{ marginBottom: 'var(--ds-space-md)' }}>
            <AlertTitle>Invitation failed</AlertTitle>
            <AlertDescription>
              We couldn&apos;t send the invitation. {result.error}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ds-space-md)',
            }}
          >
            <FormField label="Email address" htmlFor="invite-email" required>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={pending}
              />
            </FormField>

            <FormField label="Role" htmlFor="invite-role">
              <Select
                value={role}
                onValueChange={(val) => setRole(val as 'manager' | 'driver')}
                disabled={pending}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <div>
              <Button
                type="submit"
                variant="default"
                disabled={pending}
                style={{ minWidth: 140 }}
              >
                {pending ? (
                  <>
                    <Spinner size="sm" aria-hidden="true" />
                    <span style={{ marginLeft: 'var(--ds-space-xs)' }}>Sending…</span>
                  </>
                ) : (
                  'Send invitation'
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
