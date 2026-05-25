'use client'

import { ErrorCard } from '@/components/ui/ErrorCard'

export default function TripsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorCard title="Failed to load trip history" message={error.message} onReset={reset} />
}
