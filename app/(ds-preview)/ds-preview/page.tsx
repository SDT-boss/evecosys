"use client"

/**
 * Design system component preview — dev only.
 * Provides stable, data-testid-anchored markup for Playwright E2E tests.
 * Not linked from any production navigation.
 */

import { useState } from "react"
import { Button }         from "@/design-system/components/Button"
import { Input }          from "@/design-system/components/Input"
import { Checkbox }       from "@/design-system/components/Checkbox"
import { Switch }         from "@/design-system/components/Switch"
import { Badge }          from "@/design-system/components/Badge"
import { Alert, AlertTitle, AlertDescription } from "@/design-system/components/Alert"
import { FormField }      from "@/design-system/components/FormField"
import { StatCard }       from "@/design-system/components/StatCard"
import { EmptyState }     from "@/design-system/components/EmptyState"
import { NavigationItem } from "@/design-system/components/NavigationItem"
import { Spinner }        from "@/design-system/components/Spinner"
import { Progress }       from "@/design-system/components/Progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/design-system/components/Tabs"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/design-system/components/Table"
import { Zap, Car } from "lucide-react"

export default function DSPreviewPage() {
  const [checked, setChecked]   = useState(false)
  const [switched, setSwitched] = useState(false)
  const [inputVal, setInputVal] = useState("")
  const [hasError, setHasError] = useState(false)

  return (
    <div className="p-8 space-y-12 max-w-3xl mx-auto font-sans">
      <h1 className="text-2xl font-bold">Design System Preview</h1>

      {/* ── Button ────────────────────────────────────────────────────────── */}
      <section data-testid="section-button" className="space-y-3">
        <h2 className="text-lg font-semibold">Button</h2>
        <div className="flex gap-3 flex-wrap">
          <Button data-testid="btn-default">Save fleet</Button>
          <Button variant="secondary" data-testid="btn-secondary">Confirm</Button>
          <Button variant="outline"   data-testid="btn-outline">Cancel</Button>
          <Button variant="ghost"     data-testid="btn-ghost">More</Button>
          <Button variant="destructive" data-testid="btn-destructive">Delete</Button>
          <Button disabled            data-testid="btn-disabled">Disabled</Button>
        </div>
      </section>

      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <section data-testid="section-input" className="space-y-3">
        <h2 className="text-lg font-semibold">Input</h2>
        <Input
          data-testid="input-default"
          placeholder="Search vehicles…"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
        />
        <Input data-testid="input-disabled" disabled placeholder="Disabled" />
        <Input
          data-testid="input-error"
          aria-invalid="true"
          placeholder="Invalid value"
        />
      </section>

      {/* ── FormField ─────────────────────────────────────────────────────── */}
      <section data-testid="section-formfield" className="space-y-3">
        <h2 className="text-lg font-semibold">FormField</h2>
        <FormField
          label="Driver email"
          htmlFor="ff-email"
          helper="We'll send login instructions here."
        >
          <Input id="ff-email" data-testid="ff-input-happy" />
        </FormField>
        <FormField
          label="Vehicle plate"
          htmlFor="ff-plate"
          error="Plate number is required"
          required
        >
          <Input id="ff-plate" aria-invalid="true" data-testid="ff-input-error" />
        </FormField>
        <div className="flex gap-3">
          <Button
            size="sm"
            variant="outline"
            data-testid="toggle-error"
            onClick={() => setHasError(v => !v)}
          >
            Toggle error
          </Button>
        </div>
      </section>

      {/* ── Checkbox ──────────────────────────────────────────────────────── */}
      <section data-testid="section-checkbox" className="space-y-3">
        <h2 className="text-lg font-semibold">Checkbox</h2>
        <div className="flex items-center gap-2">
          <Checkbox
            id="cb-main"
            data-testid="checkbox-main"
            checked={checked}
            onCheckedChange={v => setChecked(!!v)}
          />
          <label htmlFor="cb-main" data-testid="checkbox-label">
            {checked ? "Checked" : "Unchecked"}
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="cb-disabled" data-testid="checkbox-disabled" disabled />
          <label htmlFor="cb-disabled">Disabled</label>
        </div>
      </section>

      {/* ── Switch ────────────────────────────────────────────────────────── */}
      <section data-testid="section-switch" className="space-y-3">
        <h2 className="text-lg font-semibold">Switch</h2>
        <div className="flex items-center gap-3">
          <Switch
            id="sw-main"
            data-testid="switch-main"
            checked={switched}
            onCheckedChange={setSwitched}
          />
          <label htmlFor="sw-main" data-testid="switch-label">
            {switched ? "On" : "Off"}
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="sw-disabled" data-testid="switch-disabled" disabled />
          <label htmlFor="sw-disabled">Disabled</label>
        </div>
      </section>

      {/* ── Badge ─────────────────────────────────────────────────────────── */}
      <section data-testid="section-badge" className="space-y-3">
        <h2 className="text-lg font-semibold">Badge</h2>
        <div className="flex gap-2 flex-wrap">
          <Badge data-testid="badge-default">Active</Badge>
          <Badge variant="volt"        data-testid="badge-volt">Charging</Badge>
          <Badge variant="secondary"   data-testid="badge-secondary">Inactive</Badge>
          <Badge variant="outline"     data-testid="badge-outline">Pending</Badge>
          <Badge variant="destructive" data-testid="badge-destructive">Offline</Badge>
        </div>
      </section>

      {/* ── Alert ─────────────────────────────────────────────────────────── */}
      <section data-testid="section-alert" className="space-y-3">
        <h2 className="text-lg font-semibold">Alert</h2>
        <Alert data-testid="alert-default">
          <AlertTitle>Fleet synced</AlertTitle>
          <AlertDescription>All vehicle data is up to date.</AlertDescription>
        </Alert>
        <Alert variant="success" data-testid="alert-success">
          <AlertTitle>Trip complete</AlertTitle>
          <AlertDescription>Vehicle EV-001 has returned to depot.</AlertDescription>
        </Alert>
        <Alert variant="warning" data-testid="alert-warning">
          <AlertTitle>Battery low</AlertTitle>
          <AlertDescription>EV-042 is at 14% — assign a charging station.</AlertDescription>
        </Alert>
        <Alert variant="destructive" data-testid="alert-destructive">
          <AlertTitle>Vehicle offline</AlertTitle>
          <AlertDescription>EV-017 has lost connection for over 2 hours.</AlertDescription>
        </Alert>
      </section>

      {/* ── StatCard ──────────────────────────────────────────────────────── */}
      <section data-testid="section-statcard" className="space-y-3">
        <h2 className="text-lg font-semibold">StatCard</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            data-testid="statcard-up"
            label="Fleet utilisation"
            value="84"
            unit="%"
            trend="up"
            trendValue="+6%"
            trendLabel="vs last week"
            icon={<Zap className="h-5 w-5" />}
          />
          <StatCard
            data-testid="statcard-down"
            label="Active vehicles"
            value={18}
            trend="down"
            trendValue="-3"
            trendLabel="vs yesterday"
          />
          <StatCard
            data-testid="statcard-neutral"
            label="Avg range"
            value="212"
            unit="km"
            trend="neutral"
            trendValue="0%"
          />
        </div>
      </section>

      {/* ── Spinner ───────────────────────────────────────────────────────── */}
      <section data-testid="section-spinner" className="space-y-3">
        <h2 className="text-lg font-semibold">Spinner</h2>
        <div className="flex items-center gap-6">
          <Spinner size="sm" data-testid="spinner-sm" />
          <Spinner size="md" data-testid="spinner-md" />
          <Spinner size="lg" data-testid="spinner-lg" />
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--ds-color-brand-primary)]">
            <Spinner size="sm" className="text-white" data-testid="spinner-white" />
          </div>
        </div>
      </section>

      {/* ── Progress ──────────────────────────────────────────────────────── */}
      <section data-testid="section-progress" className="space-y-3">
        <h2 className="text-lg font-semibold">Progress</h2>
        <Progress value={75} aria-label="Battery level" data-testid="progress-75" />
        <Progress value={14} aria-label="Low battery"   data-testid="progress-14" />
        <Progress value={0}  aria-label="Empty"         data-testid="progress-0" />
      </section>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <section data-testid="section-tabs" className="space-y-3">
        <h2 className="text-lg font-semibold">Tabs</h2>
        <Tabs defaultValue="fleet">
          <TabsList>
            <TabsTrigger value="fleet"   data-testid="tab-fleet">Fleet</TabsTrigger>
            <TabsTrigger value="drivers" data-testid="tab-drivers">Drivers</TabsTrigger>
            <TabsTrigger value="alerts"  data-testid="tab-alerts">Alerts</TabsTrigger>
          </TabsList>
          <TabsContent value="fleet"   data-testid="tab-content-fleet">Fleet panel content</TabsContent>
          <TabsContent value="drivers" data-testid="tab-content-drivers">Drivers panel content</TabsContent>
          <TabsContent value="alerts"  data-testid="tab-content-alerts">Alerts panel content</TabsContent>
        </Tabs>
      </section>

      {/* ── NavigationItem ────────────────────────────────────────────────── */}
      <section data-testid="section-nav" className="space-y-1 w-56">
        <h2 className="text-lg font-semibold mb-3">NavigationItem</h2>
        <NavigationItem label="Fleet"   href="/fleet"   isActive data-testid="nav-active" />
        <NavigationItem label="Drivers" href="/drivers"          data-testid="nav-inactive" />
        <NavigationItem label="Alerts"  href="/alerts"  badge={5} data-testid="nav-badge" />
        <NavigationItem label="Reports" href="/reports" disabled  data-testid="nav-disabled" />
      </section>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <section data-testid="section-table" className="space-y-3">
        <h2 className="text-lg font-semibold">Table</h2>
        <Table data-testid="table-fleet">
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Battery</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow data-testid="table-row-1">
              <TableCell>EV-001</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>87%</TableCell>
            </TableRow>
            <TableRow data-testid="table-row-2">
              <TableCell>EV-002</TableCell>
              <TableCell>Charging</TableCell>
              <TableCell>34%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div data-testid="table-empty-wrapper">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Vehicle</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <EmptyState
                    title="No vehicles assigned"
                    description="Add a vehicle to start tracking."
                    icon={<Car className="h-6 w-6" />}
                    data-testid="empty-state-in-table"
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ── EmptyState standalone ─────────────────────────────────────────── */}
      <section data-testid="section-empty" className="space-y-3 border rounded-lg">
        <EmptyState
          title="No alerts"
          description="Your fleet is running smoothly."
          icon={<Zap className="h-6 w-6" />}
          action={<Button data-testid="empty-action-btn">Add vehicle</Button>}
          data-testid="empty-state-standalone"
        />
      </section>
    </div>
  )
}
