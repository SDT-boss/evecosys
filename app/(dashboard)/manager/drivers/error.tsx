'use client'

import { ErrorCard } from '@/components/ui/ErrorCard'

export default function DriversError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorCard title="Failed to load drivers" message={error.message} onReset={reset} />
}
