'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Rendered in place of the children when a render/commit-phase error is caught. */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Minimal client-side error boundary. Use it to isolate a fragile subtree (e.g.
 * a third-party widget) so a crash there degrades to a fallback instead of
 * bubbling up to the route-level error.tsx and blanking the whole page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    // The fallback is shown instead; log for diagnostics.
    console.error('ErrorBoundary caught:', error)
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null
    return this.props.children
  }
}
