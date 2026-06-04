import { render, screen } from '@testing-library/react'
import { FormField } from '@/design-system/components/FormField'
import { Input } from '@/design-system/components/Input'

describe('FormField', () => {
  // ─── Happy path ───────────────────────────────────────────────────────────

  it('renders the label text', () => {
    render(
      <FormField label="Driver email" htmlFor="email">
        <Input id="email" />
      </FormField>
    )
    expect(screen.getByText('Driver email')).toBeInTheDocument()
  })

  it('label is associated with the control via htmlFor', () => {
    render(
      <FormField label="Driver email" htmlFor="email">
        <Input id="email" />
      </FormField>
    )
    const label = screen.getByText('Driver email')
    expect(label.tagName).toBe('LABEL')
    expect(label).toHaveAttribute('for', 'email')
  })

  it('renders helper text when no error is present', () => {
    render(
      <FormField label="Name" htmlFor="name" helper="First and last name">
        <Input id="name" />
      </FormField>
    )
    expect(screen.getByText('First and last name')).toBeInTheDocument()
  })

  it('required prop appends an asterisk to the label', () => {
    render(
      <FormField label="Email" htmlFor="email" required>
        <Input id="email" />
      </FormField>
    )
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('renders the child control', () => {
    render(
      <FormField label="Search" htmlFor="search">
        <Input id="search" placeholder="Find vehicle" />
      </FormField>
    )
    expect(screen.getByPlaceholderText('Find vehicle')).toBeInTheDocument()
  })

  // ─── Error state (unhappy path) ────────────────────────────────────────────

  it('error message replaces helper text when error is set', () => {
    render(
      <FormField label="Email" htmlFor="email" helper="Enter your email" error="Email is required">
        <Input id="email" />
      </FormField>
    )
    expect(screen.queryByText('Enter your email')).not.toBeInTheDocument()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
  })

  it('error message has role="alert"', () => {
    render(
      <FormField label="Email" htmlFor="email" error="Invalid format">
        <Input id="email" />
      </FormField>
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid format')
  })

  it('child receives aria-describedby pointing to error id when error is set', () => {
    render(
      <FormField label="Email" htmlFor="email" error="Required">
        <Input id="email" />
      </FormField>
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-describedby', 'email-error')
  })

  it('child receives aria-describedby pointing to helper id when only helper is set', () => {
    render(
      <FormField label="Email" htmlFor="email" helper="Enter email">
        <Input id="email" />
      </FormField>
    )
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'email-helper')
  })

  it('error text carries status-error colour token', () => {
    render(
      <FormField label="Email" htmlFor="email" error="Bad input">
        <Input id="email" />
      </FormField>
    )
    const errorEl = screen.getByRole('alert')
    expect(errorEl.className).toContain('--ds-color-status-error')
  })

  it('no aria-describedby when neither helper nor error is set', () => {
    render(
      <FormField label="Email" htmlFor="email">
        <Input id="email" />
      </FormField>
    )
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-describedby')
  })
})
