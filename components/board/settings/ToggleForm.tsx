'use client'

import { useState } from 'react'
import {
  Alert, AlertTitle, AlertDescription,
  Button,
  Card, CardContent,
  Spinner,
  Switch,
} from '@evecosys/design-system'

const KNOWN_FLAGS = [
  'member_invitations',
  'fleet',
  'carbon',
  'trips',
  'driver_behaviour_score',
  'alerts',
  'charging_stations',
  'auth_troubleshooting',
] as const

type FeatureFlagKey = typeof KNOWN_FLAGS[number]

const FLAG_LABELS: Record<FeatureFlagKey, { label: string; description: string }> = {
  fleet: {
    label: 'Fleet management',
    description: 'Vehicle tracking, assignments, and fleet health monitoring',
  },
  carbon: {
    label: 'Carbon reporting',
    description: 'CO₂ emissions tracking and environmental impact reports',
  },
  trips: {
    label: 'Trip management',
    description: 'Trip logs, route history, and driver trip assignment',
  },
  driver_behaviour_score: {
    label: 'Driver behaviour scoring',
    description: 'Safety and efficiency scores based on trip telemetry',
  },
  alerts: {
    label: 'Alerts',
    description: 'Real-time notifications for fleet events and anomalies',
  },
  charging_stations: {
    label: 'Charging stations',
    description: 'Charging point management and session monitoring',
  },
  member_invitations: {
    label: 'Member invitations',
    description: 'Allow board members to invite new managers and drivers',
  },
  auth_troubleshooting: {
    label: 'Auth troubleshooting',
    description: 'Enables force password reset actions on the Users tab',
  },
}

const GROUP_1_FLAGS: FeatureFlagKey[] = [
  'fleet',
  'carbon',
  'trips',
  'driver_behaviour_score',
  'alerts',
  'charging_stations',
  'member_invitations',
]

const GROUP_2_FLAGS: FeatureFlagKey[] = ['auth_troubleshooting']

interface ActionResult {
  ok: boolean
  error?: string
}

interface ToggleFormProps {
  tenantId: string
  initialFlags: Record<string, boolean>
}

const DEFAULT_FLAGS: Record<FeatureFlagKey, boolean> = {
  member_invitations: true,
  fleet: true,
  carbon: true,
  trips: true,
  driver_behaviour_score: true,
  alerts: true,
  charging_stations: true,
  auth_troubleshooting: true,
}

export function ToggleForm({ initialFlags }: ToggleFormProps) {
  const [flags, setFlags] = useState<Record<FeatureFlagKey, boolean>>({
    ...DEFAULT_FLAGS,
    ...initialFlags,
  } as Record<FeatureFlagKey, boolean>)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSave() {
    setPending(true)
    setResult(null)
    try {
      const res = await fetch('/api/board/settings/toggles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flags }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setResult({ ok: true })
      } else {
        setResult({ ok: false, error: data.error ?? 'Unknown error' })
      }
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Network error' })
    } finally {
      setPending(false)
    }
  }

  function renderFlagRow(key: FeatureFlagKey, isLast: boolean) {
    return (
      <div
        key={key}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--ds-space-md) 0',
          borderBottom: isLast ? undefined : '1px solid var(--ds-color-neutral-grey-10)',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 'var(--ds-font-size-sm)',
              fontWeight: 'var(--ds-font-weight-medium)',
              color: 'var(--ds-color-neutral-ink)',
            }}
          >
            {FLAG_LABELS[key].label}
          </div>
          <div
            style={{
              fontSize: 'var(--ds-font-size-sm)',
              color: 'var(--ds-color-neutral-grey-60)',
              marginTop: 'var(--ds-space-xs)',
            }}
          >
            {FLAG_LABELS[key].description}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-xs)' }}>
          <label htmlFor={key} className="sr-only">
            {FLAG_LABELS[key].label}
          </label>
          <Switch
            id={key}
            checked={flags[key] ?? true}
            onCheckedChange={(checked) =>
              setFlags((prev) => ({ ...prev, [key]: checked }))
            }
          />
        </div>
      </div>
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
          Platform features
        </h2>

        {GROUP_1_FLAGS.map((key, idx) =>
          renderFlagRow(key, idx === GROUP_1_FLAGS.length - 1)
        )}

        <h2
          style={{
            fontSize: 'var(--ds-font-size-lg)',
            fontWeight: 'var(--ds-font-weight-semibold)',
            color: 'var(--ds-color-neutral-ink)',
            marginTop: 'var(--ds-space-xl)',
            marginBottom: 'var(--ds-space-md)',
          }}
        >
          Administrative tools
        </h2>

        {GROUP_2_FLAGS.map((key, idx) =>
          renderFlagRow(key, idx === GROUP_2_FLAGS.length - 1)
        )}

        {result && result.ok && (
          <Alert variant="success" style={{ marginTop: 'var(--ds-space-md)' }}>
            <AlertTitle>Feature flags saved</AlertTitle>
            <AlertDescription>Your feature settings have been updated.</AlertDescription>
          </Alert>
        )}

        {result && !result.ok && (
          <Alert variant="destructive" style={{ marginTop: 'var(--ds-space-md)' }}>
            <AlertTitle>Save failed</AlertTitle>
            <AlertDescription>
              {`We couldn't save your feature settings. ${result.error}`}
            </AlertDescription>
          </Alert>
        )}

        <div style={{ marginTop: 'var(--ds-space-lg)' }}>
          <Button variant="secondary" disabled={pending} onClick={handleSave}>
            {pending ? <Spinner size="sm" /> : 'Save changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
