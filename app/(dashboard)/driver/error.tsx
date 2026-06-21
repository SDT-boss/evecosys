'use client'

import { ErrorState } from '@/components/layout/shell/ContentStates'

export default function DriverError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState onRetry={reset} />
}
