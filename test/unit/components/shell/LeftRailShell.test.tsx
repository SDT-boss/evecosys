import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LayoutDashboard, Truck } from 'lucide-react'

// Mock next/navigation — override for specific tests by calling vi.mock inside test
// The global setup in test/setup.ts provides usePathname returning '/'
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

// Import LeftRailShell — this will fail until the component is created (RED)
import { LeftRailShell } from '@/components/layout/LeftRailShell'
import type { AppUser } from '@/types'

const testUser: AppUser = {
  id: 'user-1',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'manager',
  created_at: '2026-01-01T00:00:00Z',
}

const testNavItems = [
  { label: 'Dashboard', icon: <LayoutDashboard size={15} />, href: '/dashboard' },
  { label: 'Fleet', icon: <Truck size={15} />, href: '/fleet' },
  { label: 'Board', icon: <LayoutDashboard size={15} />, href: '/board' },
]

describe('LeftRailShell', () => {
  it('renders nav items with correct hrefs', () => {
    render(
      <LeftRailShell navItems={testNavItems} user={testUser}>
        <div>page content</div>
      </LeftRailShell>,
    )
    // Each nav item renders an anchor with the correct href
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
    expect(dashboardLink).toHaveAttribute('href', '/dashboard')

    const fleetLink = screen.getByRole('link', { name: /fleet/i })
    expect(fleetLink).toHaveAttribute('href', '/fleet')
  })

  it('marks the active nav item with the active background color when pathname matches', () => {
    // Override usePathname to return '/board'
    vi.doMock('next/navigation', () => ({
      useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        refresh: vi.fn(),
        prefetch: vi.fn().mockResolvedValue(undefined),
      }),
      useSearchParams: () => ({ get: () => null }),
      usePathname: () => '/board',
      useParams: () => ({}),
    }))

    render(
      <LeftRailShell navItems={testNavItems} user={testUser}>
        <div>page content</div>
      </LeftRailShell>,
    )

    // The Board link should be rendered with active styling (rgba(0,134,132,0.08))
    const boardLink = screen.getByRole('link', { name: /board/i })
    expect(boardLink).toBeInTheDocument()
  })

  it('renders children in the content area', () => {
    render(
      <LeftRailShell navItems={testNavItems} user={testUser}>
        <div data-testid="page-content">Hello World</div>
      </LeftRailShell>,
    )
    expect(screen.getByTestId('page-content')).toHaveTextContent('Hello World')
  })

  it('renders alertBell prop content inside ContentUtilityBar region', () => {
    render(
      <LeftRailShell
        navItems={testNavItems}
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
