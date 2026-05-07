'use client'

import { ErrorCard } from '@/components/ui/ErrorCard'

export default function AlertsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorCard title="Failed to load alerts" message={error.message} onReset={reset} />
}
