'use client'

import { ErrorCard } from '@/components/ui/ErrorCard'

export default function ChargingError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorCard title="Failed to load charging stations" message={error.message} onReset={reset} />
}
