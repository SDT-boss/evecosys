import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TenantProvider, useTenantContext } from '@/components/platform/TenantContext'

function TestConsumer() {
  const { activeTenantName, setActiveTenantName } = useTenantContext()
  return (
    <div>
      <span data-testid="name">{activeTenantName ?? 'none'}</span>
      <button onClick={() => setActiveTenantName('New Corp')}>Switch</button>
    </div>
  )
}

describe('TenantContext', () => {
  it('provides activeTenantName from initialName prop', () => {
    render(
      <TenantProvider initialName="Acme Fleet">
        <TestConsumer />
      </TenantProvider>,
    )
    expect(screen.getByTestId('name')).toHaveTextContent('Acme Fleet')
  })

  it('updates activeTenantName when setActiveTenantName is called', () => {
    render(
      <TenantProvider initialName="Acme Fleet">
        <TestConsumer />
      </TenantProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Switch' }))
    expect(screen.getByTestId('name')).toHaveTextContent('New Corp')
  })

  it('throws when useTenantContext is called outside TenantProvider', () => {
    expect(() => {
      render(<TestConsumer />)
    }).toThrow('useTenantContext must be used within TenantProvider')
  })
})
