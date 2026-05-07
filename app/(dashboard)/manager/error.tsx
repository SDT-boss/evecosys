'use client'

import { ErrorCard } from '@/components/ui/ErrorCard'

export default function ManagerError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorCard title="Failed to load fleet overview" message={error.message} onReset={reset} />
}
