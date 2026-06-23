import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/components/platform/TenantContext', () => ({
  TenantProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTenantContext: () => ({
    activeTenantName: 'Test Tenant',
    setActiveTenantName: vi.fn(),
  }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  }),
}))

import { LeftRailShell } from '@/components/layout/LeftRailShell'
import type { AppUser } from '@/types'

const testUser: AppUser = {
  id: 'user-1',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'manager',
  created_at: '2026-01-01T00:00:00Z',
}

const testNavGroups = [
  {
    items: [
      { label: 'Dashboard', iconName: 'space_dashboard', href: '/dashboard' },
      { label: 'Fleet',     iconName: 'local_shipping',  href: '/fleet' },
      { label: 'Board',     iconName: 'insights',        href: '/board' },
    ],
  },
]

describe('LeftRailShell', () => {
  it('renders nav items with correct hrefs', () => {
    render(
      <LeftRailShell navGroups={testNavGroups} user={testUser}>
        <div>page content</div>
      </LeftRailShell>,
    )
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
    expect(dashboardLink).toHaveAttribute('href', '/dashboard')

    const fleetLink = screen.getByRole('link', { name: /fleet/i })
    expect(fleetLink).toHaveAttribute('href', '/fleet')
  })

  it('marks the active nav item with the active background color when pathname matches', () => {
    render(
      <LeftRailShell navGroups={testNavGroups} user={testUser}>
        <div>page content</div>
      </LeftRailShell>,
    )

    const allLinks = screen.getAllByRole('link')
    const boardLink = allLinks.find((link) => link.getAttribute('href') === '/board')
    expect(boardLink).toBeInTheDocument()
    expect(boardLink).toHaveAttribute('href', '/board')
  })

  it('renders children in the content area', () => {
    render(
      <LeftRailShell navGroups={testNavGroups} user={testUser}>
        <div data-testid="page-content">Hello World</div>
      </LeftRailShell>,
    )
    expect(screen.getByTestId('page-content')).toHaveTextContent('Hello World')
  })

  it('renders alertBell prop content inside ContentUtilityBar region', () => {
    render(
      <LeftRailShell
        navGroups={testNavGroups}
        user={testUser}
        alertBell={<button data-testid="alert-bell">Alerts</button>}
      >
        <div>content</div>
      </LeftRailShell>,
    )
    expect(screen.getByTestId('alert-bell')).toBeInTheDocument()
    expect(screen.getByTestId('alert-bell')).toHaveTextContent('Alerts')
  })
})
