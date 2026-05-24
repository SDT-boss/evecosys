'use client'

import { ErrorCard } from '@/components/ui/ErrorCard'

export default function UsersError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorCard title="Failed to load users" message={error.message} onReset={reset} />
}
