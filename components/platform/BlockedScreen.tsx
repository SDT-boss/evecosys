'use client'

import { EmptyState, Button } from '@evecosys/design-system'
import Link from 'next/link'

export function BlockedScreen() {
  return (
    <EmptyState
      title="Select a workspace to continue"
      description="This area requires an active workspace. Choose one from the tenant list to get started."
      action={
        <Button variant="secondary" asChild>
          <Link href="/platform">Go to tenant list</Link>
        </Button>
      }
    />
  )
}
