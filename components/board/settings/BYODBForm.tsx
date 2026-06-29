'use client'

import { useState } from 'react'
import {
  Alert, AlertTitle, AlertDescription,
  Badge,
  Button,
  Card, CardContent,
  FormField,
  Input,
  Label,
  RadioGroup, RadioGroupItem,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Spinner,
} from '@evecosys/design-system'

interface BYODBFormProps {
  tenantId: string
  currentState: string
}

type Mode = 'structured' | 'connectionString'
type Engine = 'postgres' | 'mysql'
type ActionResult = { ok: boolean; error?: string }

const ENGINE_OPTIONS: { label: string; value: Engine }[] = [
  { label: 'PostgreSQL', value: 'postgres' },
  { label: 'MySQL', value: 'mysql' },
]

const DEFAULT_PORTS: Record<Engine, number> = {
  postgres: 5432,
  mysql: 3306,
}

export function BYODBForm({ tenantId: _tenantId, currentState }: BYODBFormProps) {
  const isAlreadyActive = currentState === 'Active'

  const [showForm, setShowForm] = useState(!isAlreadyActive)
  const [registered, setRegistered] = useState(false)
  const [mode, setMode] = useState<Mode>('structured')
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pending, setPending] = useState(false)

  // Structured fields
  const [engine, setEngine] = useState<Engine>('postgres')
  const [host, setHost] = useState('')
  const [port, setPort] = useState<string>(String(DEFAULT_PORTS['postgres']))
  const [database, setDatabase] = useState('')
  const [dbUser, setDbUser] = useState('')
  const [password, setPassword] = useState('')

  // Connection string fields
  const [csEngine, setCsEngine] = useState<Engine>('postgres')
  const [connectionString, setConnectionString] = useState('')

  function handleModeChange(newMode: string) {
    setMode(newMode as Mode)
    // Clear all field values on mode switch
    setEngine('postgres')
    setHost('')
    setPort(String(DEFAULT_PORTS['postgres']))
    setDatabase('')
    setDbUser('')
    setPassword('')
    setCsEngine('postgres')
    setConnectionString('')
    setResult(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setResult(null)

    try {
      const input =
        mode === 'structured'
          ? {
              kind: 'structured' as const,
              params: {
                engine,
                host,
                port: Number(port),
                database,
                user: dbUser,
                password,
              },
            }
          : {
              kind: 'connectionString' as const,
              engine: csEngine,
              connectionString,
            }

      const res = await fetch('/api/board/settings/byodb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()

      if (!res.ok) {
        setResult({ ok: false, error: data.error ?? 'Registration failed' })
        return
      }

      setResult({ ok: true })
      setRegistered(true)
      setShowForm(false)
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Network error' })
    } finally {
      setPending(false)
    }
  }

  // Active summary view
  if (!showForm && (registered || isAlreadyActive)) {
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
            Database connection
          </h2>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ds-space-sm)',
              marginBottom: 'var(--ds-space-lg)',
            }}
          >
            <Badge variant="outline">{engine === 'mysql' ? 'MySQL' : 'PostgreSQL'}</Badge>
            {host && (
              <span
                style={{
                  fontSize: 'var(--ds-font-size-sm)',
                  color: 'var(--ds-color-neutral-grey-60)',
                  fontFamily: 'var(--ds-font-family-mono)',
                }}
              >
                {host.split('.')[0]}.exa••••
              </span>
            )}
            <Badge variant="default">Active</Badge>
          </div>

          {result?.ok === true && (
            <Alert variant="success" style={{ marginBottom: 'var(--ds-space-md)' }}>
              <AlertTitle>Connection registered</AlertTitle>
              <AlertDescription>
                Your database connection was verified and saved successfully.
              </AlertDescription>
            </Alert>
          )}

          <Button variant="outline" onClick={() => setShowForm(true)}>
            Update connection
          </Button>
        </CardContent>
      </Card>
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
          Register database connection
        </h2>

        {/* Mode toggle */}
        <RadioGroup
          value={mode}
          onValueChange={handleModeChange}
          style={{ marginBottom: 'var(--ds-space-lg)' }}
        >
          {(
            [
              { value: 'structured', label: 'Structured fields' },
              { value: 'connectionString', label: 'Connection string' },
            ] as { value: Mode; label: string }[]
          ).map((opt) => (
            <div
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--ds-space-md)',
                border: `1px solid ${mode === opt.value ? 'var(--ds-color-brand-primary)' : 'var(--ds-color-neutral-grey-20)'}`,
                borderRadius: 'var(--ds-radius-md)',
                padding: 'var(--ds-space-md)',
                cursor: 'pointer',
              }}
              onClick={() => handleModeChange(opt.value)}
            >
              <RadioGroupItem value={opt.value} id={`mode-${opt.value}`} />
              <Label htmlFor={`mode-${opt.value}`} style={{ cursor: 'pointer' }}>
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ds-space-md)',
              marginBottom: 'var(--ds-space-lg)',
            }}
          >
            {mode === 'structured' ? (
              <>
                <FormField label="Engine" htmlFor="engine">
                  <Select
                    value={engine}
                    onValueChange={(v) => {
                      setEngine(v as Engine)
                      setPort(String(DEFAULT_PORTS[v as Engine]))
                    }}
                  >
                    <SelectTrigger id="engine">
                      <SelectValue placeholder="Select engine" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENGINE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Host" htmlFor="host">
                  <Input
                    id="host"
                    type="text"
                    placeholder="db.example.com"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    required
                  />
                </FormField>

                <FormField label="Port" htmlFor="port">
                  <Input
                    id="port"
                    type="number"
                    placeholder={String(DEFAULT_PORTS[engine])}
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    min={1}
                    max={65535}
                    required
                  />
                </FormField>

                <FormField label="Database" htmlFor="database">
                  <Input
                    id="database"
                    type="text"
                    placeholder="mydb"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    required
                  />
                </FormField>

                <FormField label="Username" htmlFor="db-user">
                  <Input
                    id="db-user"
                    type="text"
                    placeholder="dbuser"
                    value={dbUser}
                    onChange={(e) => setDbUser(e.target.value)}
                    required
                  />
                </FormField>

                <FormField label="Password" htmlFor="db-password">
                  <Input
                    id="db-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </FormField>
              </>
            ) : (
              <>
                <FormField label="Engine" htmlFor="cs-engine">
                  <Select
                    value={csEngine}
                    onValueChange={(v) => setCsEngine(v as Engine)}
                  >
                    <SelectTrigger id="cs-engine">
                      <SelectValue placeholder="Select engine" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENGINE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Connection string" htmlFor="connection-string">
                  <Input
                    id="connection-string"
                    type="text"
                    placeholder="postgresql://user:pass@host:5432/dbname"
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    style={{ fontFamily: 'var(--ds-font-family-mono)' }}
                    required
                  />
                </FormField>
              </>
            )}
          </div>

          {/* Error feedback */}
          {result?.ok === false && (
            <Alert variant="destructive" style={{ marginBottom: 'var(--ds-space-md)' }}>
              <AlertTitle>Registration failed</AlertTitle>
              <AlertDescription>
                We couldn&apos;t register your database connection. {result.error}
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? <Spinner size="sm" /> : 'Register connection'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
