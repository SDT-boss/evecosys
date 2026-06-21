'use client'

import { ErrorState } from '@/components/layout/shell/ContentStates'

export default function BoardError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState onRetry={reset} />
}
