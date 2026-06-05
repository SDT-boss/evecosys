import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "@/design-system/components/Badge";

const meta: Meta<typeof Badge> = {
  title: "Primitives/Badge",
  component: Badge,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Compact status indicator for labelling entities, states, and roles. The `volt` variant is an EVEcosys addition — it does not exist in the base shadcn badge.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "volt", "secondary", "outline", "destructive"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

// ─── Playground ───────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: { children: "Active", variant: "default" },
};

// ─── All variants ─────────────────────────────────────────────────────────────

export const AllVariants: Story = {
  name: "All variants",
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="default">Active</Badge>
      <Badge variant="volt">Charging</Badge>
      <Badge variant="secondary">Inactive</Badge>
      <Badge variant="outline">Pending</Badge>
      <Badge variant="destructive">Offline</Badge>
    </div>
  ),
};

// ─── Semantic usage ───────────────────────────────────────────────────────────

export const VehicleStatus: Story = {
  name: "Vehicle status semantics",
  parameters: {
    docs: {
      description: {
        story:
          "How each variant maps to EVEcosys vehicle and driver states.",
      },
    },
    controls: { disable: true },
  },
  render: () => (
    <div className="flex flex-col gap-4 w-[360px]">
      {[
        { variant: "default"     as const, label: "Active",      meaning: "Vehicle in service, driver assigned" },
        { variant: "volt"        as const, label: "Charging",    meaning: "Connected to charging station" },
        { variant: "secondary"   as const, label: "Idle",        meaning: "Available but unassigned" },
        { variant: "outline"     as const, label: "Maintenance", meaning: "Scheduled service, not in fleet" },
        { variant: "destructive" as const, label: "Offline",     meaning: "Lost signal or geofence breach" },
      ].map(({ variant, label, meaning }) => (
        <div key={variant} className="flex items-center gap-4">
          <Badge variant={variant} className="w-24 justify-center">{label}</Badge>
          <span className="text-[var(--ds-font-size-sm)] text-[var(--ds-color-neutral-grey-60)]">{meaning}</span>
        </div>
      ))}
    </div>
  ),
};

// ─── In context ───────────────────────────────────────────────────────────────

export const InlineWithText: Story = {
  name: "Inline with text",
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[var(--ds-font-size-sm)] text-[var(--ds-color-neutral-ink)]">EV-001 — BYD Atto 3</span>
        <Badge variant="volt">Charging</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[var(--ds-font-size-sm)] text-[var(--ds-color-neutral-ink)]">Jane Doe</span>
        <Badge variant="default">Manager</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[var(--ds-font-size-sm)] text-[var(--ds-color-neutral-ink)]">EV-007 — NIO ET5</span>
        <Badge variant="destructive">Offline</Badge>
      </div>
    </div>
  ),
};
