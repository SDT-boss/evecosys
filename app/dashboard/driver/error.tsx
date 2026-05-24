'use client'

import { ErrorCard } from '@/components/ui/ErrorCard'

export default function DriverError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorCard title="Failed to load vehicle data" message={error.message} onReset={reset} />
}
