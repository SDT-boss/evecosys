'use client'

import { ErrorState } from '@/components/layout/shell/ContentStates'

export default function ManagerError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState onRetry={reset} />
}
