'use client'

import { ErrorState } from '@/components/layout/shell/ContentStates'

export default function ManagerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // error.digest can be forwarded to an error reporting service here
  void error
  return <ErrorState onRetry={reset} />
}
