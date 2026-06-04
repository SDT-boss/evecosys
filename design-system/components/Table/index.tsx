/**
 * Design System primitive: Table
 *
 * Structured data table for fleet lists, driver rosters, trip logs, alerts,
 * and charging station registers. The primary display pattern in EVEcosys —
 * most manager views centre on a table with a toolbar above and pagination below.
 *
 * Layout conventions:
 *   TableHead   — 48px height, grey-60 label text, sm tracking-wide uppercase
 *   TableRow    — 56px height, ink text; hover: grey-05; selected: grey-10
 *   TableCell   — 16px horizontal padding; align-middle
 *   TableFooter — grey-05 bg, semibold text (totals / summaries)
 *
 * Borders: rows separated by grey-10 horizontal rules. No vertical column
 * borders — keep it clean. Outer table has no border; wrap in a Card for
 * the standard bordered-surface treatment.
 *
 * Accessibility: TableHead cells render as <th> with scope="col" by default.
 * For row headers, add scope="row" to the first TableCell in each row.
 *
 * Sub-components: Table, TableHeader, TableBody, TableFooter,
 *   TableHead, TableRow, TableCell, TableCaption
 */

import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  )
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn("[&_tr]:border-b [&_tr]:border-[var(--ds-color-neutral-grey-20)]", className)}
      {...props}
    />
  )
)
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
)
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn(
        "border-t border-[var(--ds-color-neutral-grey-20)]",
        "bg-[var(--ds-color-neutral-grey-05)]",
        "font-[var(--ds-font-weight-semibold)]",
        "[&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
)
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-[var(--ds-color-neutral-grey-10)]",
        "transition-colors duration-[var(--ds-motion-duration-fast)]",
        "hover:bg-[var(--ds-color-neutral-grey-05)]",
        "data-[state=selected]:bg-[var(--ds-color-neutral-grey-10)]",
        className
      )}
      {...props}
    />
  )
)
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-[var(--ds-space-md)] text-left align-middle",
        "text-xs font-[var(--ds-font-weight-semibold)] tracking-wide uppercase",
        "text-[var(--ds-color-neutral-grey-60)]",
        "[&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
)
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "px-[var(--ds-space-md)] py-[var(--ds-space-sm)] align-middle",
        "text-[var(--ds-color-neutral-ink)]",
        "[&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
)
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption
      ref={ref}
      className={cn(
        "mt-[var(--ds-space-md)] text-[var(--ds-font-size-sm)]",
        "text-[var(--ds-color-neutral-grey-60)]",
        className
      )}
      {...props}
    />
  )
)
TableCaption.displayName = "TableCaption"

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
