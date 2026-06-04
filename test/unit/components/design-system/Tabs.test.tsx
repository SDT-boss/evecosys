import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/design-system/components/Tabs'

function renderTabs(defaultValue = 'fleet') {
  return render(
    <Tabs defaultValue={defaultValue}>
      <TabsList>
        <TabsTrigger value="fleet">Fleet</TabsTrigger>
        <TabsTrigger value="drivers">Drivers</TabsTrigger>
        <TabsTrigger value="alerts">Alerts</TabsTrigger>
      </TabsList>
      <TabsContent value="fleet">Fleet panel</TabsContent>
      <TabsContent value="drivers">Drivers panel</TabsContent>
      <TabsContent value="alerts">Alerts panel</TabsContent>
    </Tabs>
  )
}

describe('Tabs', () => {
  // ─── Happy path ───────────────────────────────────────────────────────────

  it('renders all tab triggers', () => {
    renderTabs()
    expect(screen.getByRole('tab', { name: 'Fleet' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Drivers' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Alerts' })).toBeInTheDocument()
  })

  it('default tab content is visible', () => {
    renderTabs('fleet')
    expect(screen.getByText('Fleet panel')).toBeInTheDocument()
  })

  it('switches content panel when a different tab is clicked', async () => {
    renderTabs('fleet')
    await userEvent.click(screen.getByRole('tab', { name: 'Drivers' }))
    expect(screen.getByText('Drivers panel')).toBeVisible()
  })

  it('active tab trigger has data-state="active"', () => {
    renderTabs('fleet')
    expect(screen.getByRole('tab', { name: 'Fleet' })).toHaveAttribute('data-state', 'active')
  })

  it('active tab trigger carries white bg token', () => {
    renderTabs('fleet')
    const active = screen.getByRole('tab', { name: 'Fleet' })
    expect(active.className).toContain('data-[state=active]:bg-white')
  })

  it('TabsList carries grey-05 background token', () => {
    renderTabs()
    const list = screen.getByRole('tablist')
    expect(list.className).toContain('--ds-color-neutral-grey-05')
  })

  it('Jade focus-ring token is on triggers', () => {
    renderTabs()
    const trigger = screen.getByRole('tab', { name: 'Fleet' })
    expect(trigger.className).toContain('focus-visible:ring-[var(--ds-color-brand-primary)]')
  })

  // ─── Unhappy path ─────────────────────────────────────────────────────────

  it('inactive tab trigger has data-state="inactive"', () => {
    renderTabs('fleet')
    expect(screen.getByRole('tab', { name: 'Drivers' })).toHaveAttribute('data-state', 'inactive')
  })

  it('inactive tab content is not visible', () => {
    renderTabs('fleet')
    // Radix hides inactive content; it may be in the DOM but hidden
    const driversPanel = screen.queryByText('Drivers panel')
    if (driversPanel) {
      expect(driversPanel).not.toBeVisible()
    } else {
      // Not in DOM at all — also acceptable
      expect(driversPanel).not.toBeInTheDocument()
    }
  })
})
