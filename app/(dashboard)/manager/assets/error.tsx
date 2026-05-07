'use client'

import { ErrorCard } from '@/components/ui/ErrorCard'

export default function AssetsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorCard title="Failed to load asset management" message={error.message} onReset={reset} />
}
