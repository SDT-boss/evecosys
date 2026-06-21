import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
  EmptyState,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
} from "@evecosys/design-system";
import { TenantSwitcher } from "@/components/layout/shell/TenantSwitcher";
import { TenantList } from "@/components/platform/TenantList";
import { TenantProvider } from "@/components/platform/TenantContext";

// ─── Section A — TenantSwitcher (sidebar dropdown) ────────────────────────────

const meta: Meta<typeof TenantSwitcher> = {
  title: "Compositions/TenantSwitcher",
  component: TenantSwitcher,
  decorators: [
    (Story) => (
      <TenantProvider initialName="Acme Fleet">
        <Story />
      </TenantProvider>
    ),
  ],
  args: {
    tenants: [
      { id: "1", name: "Acme Fleet" },
      { id: "2", name: "BrightGrid" },
      { id: "3", name: "SunPath" },
    ],
    onSelect: fn(),
  },
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Sidebar tenant-switcher dropdown. The collapsed state shows the active tenant name; clicking expands a listbox with all available tenants. Requires TenantProvider in parent context.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TenantSwitcher>;

// ─── A1: Collapsed — no active selection ──────────────────────────────────────

export const DefaultList: Story = {
  name: "Default — tenant list",
  decorators: [
    (Story) => (
      <TenantProvider initialName={null}>
        <div style={{ width: 240 }}>
          <Story />
        </div>
      </TenantProvider>
    ),
  ],
  args: {
    tenants: [
      { id: "1", name: "Acme Fleet" },
      { id: "2", name: "BrightGrid" },
      { id: "3", name: "SunPath" },
    ],
    onSelect: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Collapsed state with no active tenant. Shows 'Select workspace' placeholder text and chevron-down.",
      },
    },
  },
};

// ─── A2: Active row highlighted ───────────────────────────────────────────────

export const ActiveRowHighlighted: Story = {
  name: "Active row highlighted",
  decorators: [
    (Story) => (
      <TenantProvider initialName="Acme Fleet">
        <div style={{ width: 240 }}>
          <Story />
        </div>
      </TenantProvider>
    ),
  ],
  args: {
    tenants: [
      { id: "1", name: "Acme Fleet" },
      { id: "2", name: "BrightGrid" },
      { id: "3", name: "SunPath" },
    ],
    onSelect: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Tenant 'Acme Fleet' is the active workspace. When the dropdown is opened, the matching row renders with teal background and a check-mark icon.",
      },
    },
  },
};

// ─── Section B — TenantList state machine (SWIT-01/02/03) ─────────────────────
//
// TenantList manages isPending / pendingTenantId / switchError as internal
// state. The stories below use thin wrapper components to expose the same
// visual states without triggering the real setActiveTenant server action.

/**
 * Wrapper that reproduces the visual layout of TenantList when a switch is
 * in progress (SWIT-02). The spinner row for "Acme Fleet" is shown as
 * TenantList would render it while pendingTenantId === "1".
 */
function SwitchingInProgressWrapper() {
  const tenants = [
    { id: "1", name: "Acme Fleet", status: "Active" as const },
    { id: "2", name: "BrightGrid", status: "Active" as const },
    { id: "3", name: "SunPath", status: "Pending" as const },
  ];

  return (
    <Table aria-busy={true} style={{ cursor: "not-allowed" }}>
      <TableHeader>
        <TableRow>
          <TableHead>Tenant</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody style={{ opacity: 0.5 }}>
        {tenants.map((tenant) => (
          <TableRow
            key={tenant.id}
            role="button"
            tabIndex={0}
            aria-label={`Set ${tenant.name} as active workspace`}
            data-state={tenant.id === "1" ? "selected" : undefined}
            style={{ pointerEvents: "none" }}
          >
            <TableCell>
              {tenant.id === "1" ? (
                <span className="flex items-center gap-[var(--ds-space-xs)]">
                  <Spinner size="sm" aria-hidden="true" />
                  <span className="sr-only">Switching to {tenant.name}…</span>
                </span>
              ) : (
                tenant.name
              )}
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  tenant.status === "Active"
                    ? "default"
                    : tenant.status === "Pending"
                    ? "secondary"
                    : "destructive"
                }
              >
                {tenant.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export const SwitchingInProgress: StoryObj = {
  name: "Switching in progress (SWIT-02)",
  render: () => (
    <TenantProvider initialName="Acme Fleet">
      <SwitchingInProgressWrapper />
    </TenantProvider>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "SWIT-02 switching state: 'Acme Fleet' row shows a spinner while the setActiveTenant server action is in flight. All rows are dimmed (opacity 0.5) and pointer events are disabled during the transition.",
      },
    },
  },
};

export const SwitchFailure: StoryObj = {
  name: "Switch failure (SWIT-03)",
  render: () => (
    <TenantProvider initialName="BrightGrid">
      <div>
        <Alert
          variant="destructive"
          className="mb-[var(--ds-space-sm)]"
          style={{ position: "relative" }}
        >
          <AlertTitle>Switch failed</AlertTitle>
          <AlertDescription>
            Failed to switch workspace. Please try again. (Permission denied —
            contact your admin)
          </AlertDescription>
          <button
            aria-label="Dismiss error"
            className="absolute text-[var(--ds-color-status-error)] hover:opacity-70"
            style={{ right: "var(--ds-space-md)", top: "var(--ds-space-md)" }}
          >
            ×
          </button>
        </Alert>
        <TenantList
          tenants={[
            { id: "1", name: "Acme Fleet", status: "Active" },
            { id: "2", name: "BrightGrid", status: "Active" },
            { id: "3", name: "SunPath", status: "Pending" },
          ]}
          activeTenantId="2"
        />
      </div>
    </TenantProvider>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "SWIT-03 failure state: the switch failed with 'Permission denied — contact your admin'. A destructive Alert banner is shown above the table with a dismiss button.",
      },
    },
  },
};

export const EmptyTenants: StoryObj = {
  name: "Empty tenant list",
  render: () => (
    <TenantProvider initialName={null}>
      <EmptyState
        title="No tenants found"
        description="No tenants have been registered yet. New tenants will appear here once provisioning begins."
      />
    </TenantProvider>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Empty state when no tenants exist. TenantList renders EmptyState when the tenants array is empty.",
      },
    },
  },
};
