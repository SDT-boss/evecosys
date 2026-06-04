import { render, screen } from '@testing-library/react'
import {
  Table, TableHeader, TableBody, TableFooter,
  TableHead, TableRow, TableCell, TableCaption,
} from '@/design-system/components/Table'

function renderBasicTable() {
  return render(
    <Table>
      <TableCaption>Fleet vehicles</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Vehicle</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Battery</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>EV-001</TableCell>
          <TableCell>Active</TableCell>
          <TableCell>87%</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>EV-002</TableCell>
          <TableCell>Charging</TableCell>
          <TableCell>34%</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>2 vehicles</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )
}

describe('Table', () => {
  // ─── Semantic structure ───────────────────────────────────────────────────

  it('renders a <table> element', () => {
    renderBasicTable()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('renders column headers', () => {
    renderBasicTable()
    expect(screen.getByRole('columnheader', { name: 'Vehicle' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Battery' })).toBeInTheDocument()
  })

  it('renders data rows', () => {
    renderBasicTable()
    expect(screen.getByText('EV-001')).toBeInTheDocument()
    expect(screen.getByText('EV-002')).toBeInTheDocument()
  })

  it('renders caption text', () => {
    renderBasicTable()
    expect(screen.getByText('Fleet vehicles')).toBeInTheDocument()
  })

  // ─── DS token classes ─────────────────────────────────────────────────────

  it('TableHead carries grey-60 text token for column labels', () => {
    renderBasicTable()
    const header = screen.getByRole('columnheader', { name: 'Vehicle' })
    expect(header.className).toContain('--ds-color-neutral-grey-60')
  })

  it('TableCell carries ink text token', () => {
    renderBasicTable()
    const cell = screen.getByText('EV-001').closest('td')!
    expect(cell.className).toContain('--ds-color-neutral-ink')
  })

  it('TableRow carries grey-10 border token', () => {
    renderBasicTable()
    const rows = screen.getAllByRole('row')
    // Data rows (skip header row)
    expect(rows[1].className).toContain('--ds-color-neutral-grey-10')
  })

  it('TableFooter carries grey-05 background token', () => {
    renderBasicTable()
    const footer = document.querySelector('tfoot')!
    expect(footer.className).toContain('--ds-color-neutral-grey-05')
  })

  // ─── Selected state (unhappy / interaction path) ───────────────────────────

  it('data-state="selected" on TableRow applies selected classes', () => {
    render(
      <Table>
        <TableBody>
          <TableRow data-state="selected">
            <TableCell>Selected vehicle</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    const row = screen.getByText('Selected vehicle').closest('tr')!
    // The selected class targets data-[state=selected]:bg-[...grey-10...]
    expect(row.className).toContain('data-[state=selected]:bg-[var(--ds-color-neutral-grey-10)]')
  })

  // ─── Empty table (unhappy path) ────────────────────────────────────────────

  it('empty TableBody renders without error', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow><TableHead>Col</TableHead></TableRow>
        </TableHeader>
        <TableBody />
      </Table>
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
