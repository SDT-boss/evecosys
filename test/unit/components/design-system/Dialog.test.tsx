import { render, screen } from '@testing-library/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/design-system/components/Dialog'

function renderDialog(open = true) {
  return render(
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign vehicle</DialogTitle>
          <DialogDescription>Select a vehicle to assign to this driver.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button>Confirm</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

describe('Dialog', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders title and description when open', () => {
    renderDialog()
    expect(screen.getByText('Assign vehicle')).toBeInTheDocument()
    expect(screen.getByText(/Select a vehicle/)).toBeInTheDocument()
  })

  it('renders footer action when provided', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })

  it('renders a close button', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  // ─── Token usage ──────────────────────────────────────────────────────────

  it('panel carries --ds-radius-xl token (modal radius, 12px)', () => {
    const { baseElement } = renderDialog()
    const panel = baseElement.querySelector('[role="dialog"]') as HTMLElement
    expect(panel.className).toContain('--ds-radius-xl')
  })

  it('panel carries --ds-shadow-lg token', () => {
    const { baseElement } = renderDialog()
    const panel = baseElement.querySelector('[role="dialog"]') as HTMLElement
    expect(panel.className).toContain('--ds-shadow-lg')
  })

  it('panel carries grey-20 border token', () => {
    const { baseElement } = renderDialog()
    const panel = baseElement.querySelector('[role="dialog"]') as HTMLElement
    expect(panel.className).toContain('--ds-color-neutral-grey-20')
  })

  it('does NOT use --ds-radius-lg (card radius) on the modal panel', () => {
    const { baseElement } = renderDialog()
    const panel = baseElement.querySelector('[role="dialog"]') as HTMLElement
    expect(panel.className).not.toContain('--ds-radius-lg')
  })

  // ─── Closed state ─────────────────────────────────────────────────────────

  it('does not render content when closed', () => {
    renderDialog(false)
    expect(screen.queryByText('Assign vehicle')).not.toBeInTheDocument()
  })
})
