'use client'

import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'
import {
  Alert, AlertTitle, AlertDescription,
  Button,
  Input,
  FormField,
  Card, CardContent,
  Spinner,
} from '@evecosys/design-system'

interface InitialData {
  id: string
  name: string | null
  logo_url: string | null
  primary_color: string | null
}

interface BrandingFormProps {
  initialData: InitialData | null
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

export function BrandingForm({ initialData }: BrandingFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [primaryColor, setPrimaryColor] = useState(initialData?.primary_color ?? '')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [hexError, setHexError] = useState<string | undefined>(undefined)
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [pending, setPending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleColorBlur() {
    if (!primaryColor || primaryColor === '') {
      setHexError(undefined)
      return
    }
    if (!HEX_RE.test(primaryColor)) {
      setHexError('Enter a valid 6-digit hex colour, e.g. #1A2B3C.')
    } else {
      setHexError(undefined)
      setPrimaryColor(primaryColor.toUpperCase())
    }
  }

  async function handleSave() {
    // Client-side hex validation before submit
    if (primaryColor && !HEX_RE.test(primaryColor)) {
      setHexError('Enter a valid 6-digit hex colour, e.g. #1A2B3C.')
      return
    }

    setPending(true)
    setResult(null)
    try {
      const formData = new FormData()
      if (name) formData.append('name', name)
      if (primaryColor) formData.append('primary_color', primaryColor.toUpperCase())
      if (logoFile) formData.append('logo', logoFile)

      const res = await fetch('/api/board/settings/branding', { method: 'POST', body: formData })
      const data = await res.json()
      setResult({ ok: res.ok, error: data.error })
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Network error' })
    } finally {
      setPending(false)
    }
  }

  const swatchIsValid = HEX_RE.test(primaryColor)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-lg)' }}>

      {/* Tenant name section */}
      <Card>
        <CardContent style={{ paddingTop: 'var(--ds-space-lg)' }}>
          <h2 style={{
            fontSize: 'var(--ds-font-size-lg)',
            fontWeight: 'var(--ds-font-weight-semibold)',
            color: 'var(--ds-color-neutral-ink)',
            marginBottom: 'var(--ds-space-md)',
          }}>
            Tenant name
          </h2>
          <FormField
            label="Display name"
            htmlFor="tenant-name"
            helper="This name is shown to your users in the dashboard header."
          >
            <Input
              id="tenant-name"
              type="text"
              maxLength={80}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Organisation"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Logo section */}
      <Card>
        <CardContent style={{ paddingTop: 'var(--ds-space-lg)' }}>
          <h2 style={{
            fontSize: 'var(--ds-font-size-lg)',
            fontWeight: 'var(--ds-font-weight-semibold)',
            color: 'var(--ds-color-neutral-ink)',
            marginBottom: 'var(--ds-space-md)',
          }}>
            Logo
          </h2>

          {initialData?.logo_url && (
            <div style={{ marginBottom: 'var(--ds-space-md)' }}>
              <img
                src={initialData.logo_url}
                alt="Current tenant logo"
                width={48}
                height={48}
                style={{
                  width: 48,
                  height: 48,
                  objectFit: 'contain',
                  borderRadius: 'var(--ds-radius-sm)',
                  border: '1px solid var(--ds-color-neutral-grey-20)',
                }}
              />
            </div>
          )}

          <div
            style={{
              border: '1.5px dashed var(--ds-color-neutral-grey-20)',
              borderRadius: 'var(--ds-radius-md)',
              padding: 'var(--ds-space-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--ds-space-sm)',
              cursor: 'pointer',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} color="var(--ds-color-neutral-grey-40)" aria-hidden="true" />
            <p style={{
              fontSize: 'var(--ds-font-size-sm)',
              color: 'var(--ds-color-neutral-grey-60)',
              margin: 0,
            }}>
              PNG, JPEG, or SVG — max 2 MB
            </p>
            {logoFile && (
              <p style={{
                fontSize: 'var(--ds-font-size-sm)',
                color: 'var(--ds-color-neutral-grey-60)',
                margin: 0,
              }}>
                Selected: {logoFile.name}
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0] ?? null
                setLogoFile(file)
              }}
            />
          </div>
          <p style={{
            fontSize: 'var(--ds-font-size-sm)',
            color: 'var(--ds-color-neutral-grey-60)',
            marginTop: 'var(--ds-space-sm)',
          }}>
            Uploaded logos are stored securely and accessible to your tenant users.
          </p>
        </CardContent>
      </Card>

      {/* Primary colour section */}
      <Card>
        <CardContent style={{ paddingTop: 'var(--ds-space-lg)' }}>
          <h2 style={{
            fontSize: 'var(--ds-font-size-lg)',
            fontWeight: 'var(--ds-font-weight-semibold)',
            color: 'var(--ds-color-neutral-ink)',
            marginBottom: 'var(--ds-space-md)',
          }}>
            Primary colour
          </h2>
          <FormField
            label="Primary colour"
            htmlFor="primary-color"
            helper="Used to tint interactive elements for your tenant's branding. Only stored — not applied in v1 (preview deferred)."
            error={hexError}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-sm)' }}>
              <Input
                id="primary-color"
                type="text"
                placeholder="#008684"
                maxLength={7}
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                onBlur={handleColorBlur}
                aria-invalid={hexError ? true : undefined}
                style={{ fontFamily: 'var(--ds-font-family-mono)' }}
              />
              {swatchIsValid && (
                <div
                  aria-hidden="true"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 'var(--ds-radius-sm)',
                    border: '1px solid var(--ds-color-neutral-grey-20)',
                    background: primaryColor,
                    flexShrink: 0,
                  }}
                />
              )}
            </div>
          </FormField>
        </CardContent>
      </Card>

      {/* Feedback alerts */}
      {result?.ok === true && (
        <Alert variant="success">
          <AlertTitle>Branding saved</AlertTitle>
          <AlertDescription>Your tenant&apos;s branding settings have been updated.</AlertDescription>
        </Alert>
      )}
      {result?.ok === false && (
        <Alert variant="destructive">
          <AlertTitle>Save failed</AlertTitle>
          <AlertDescription>We couldn&apos;t save your branding settings. {result.error}</AlertDescription>
        </Alert>
      )}

      {/* Save button */}
      <div>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={handleSave}
        >
          {pending ? <Spinner size="sm" /> : 'Save branding'}
        </Button>
      </div>

    </div>
  )
}
