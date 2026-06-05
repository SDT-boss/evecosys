import type { Meta, StoryObj } from "@storybook/react";
import { Battery, MapPin } from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardDescription,
  CardContent, CardFooter,
} from "@/design-system/components/Card";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";

const meta: Meta<typeof Card> = {
  title: "Primitives/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Surface container for a discrete unit of content. Uses `--ds-radius-lg` (16px), a 1px `--ds-color-neutral-grey-20` border, and `--ds-shadow-sm` to lift cleanly from the `--ds-color-neutral-grey-05` page background.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

// ─── Playground ───────────────────────────────────────────────────────────────

export const Playground: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>Fleet overview</CardTitle>
        <CardDescription>Live status of your assigned vehicles</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-[var(--ds-font-size-sm)] text-[var(--ds-color-neutral-grey-60)]">
          12 vehicles active · 3 charging · 1 maintenance
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">View all</Button>
      </CardFooter>
    </Card>
  ),
};

// ─── Anatomy ──────────────────────────────────────────────────────────────────

export const Anatomy: Story = {
  name: "Sub-component anatomy",
  parameters: {
    docs: {
      description: {
        story: "All five sub-components (Header, Title, Description, Content, Footer) composed together.",
      },
    },
  },
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>CardTitle</CardTitle>
        <CardDescription>CardDescription — secondary context for the card</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-[var(--ds-font-size-sm)] text-[var(--ds-color-neutral-grey-60)]">
          CardContent — primary content area
        </p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost" size="sm">Cancel</Button>
        <Button size="sm">Save</Button>
      </CardFooter>
    </Card>
  ),
};

// ─── Vehicle card ─────────────────────────────────────────────────────────────

export const VehicleCard: Story = {
  name: "Vehicle summary card",
  parameters: {
    docs: {
      description: {
        story: "A representative real-world use: vehicle summary with status badge, battery level, and last known location.",
      },
    },
  },
  render: () => (
    <Card className="w-[340px]">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>EV-001</CardTitle>
            <CardDescription>BYD Atto 3 · Jakarta Fleet</CardDescription>
          </div>
          <Badge variant="volt">Charging</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[var(--ds-font-size-sm)]">
          <Battery className="h-4 w-4 text-[var(--ds-color-brand-secondary-strong)]" />
          <span className="text-[var(--ds-color-neutral-ink)]">78% — 312 km range</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--ds-font-size-sm)]">
          <MapPin className="h-4 w-4 text-[var(--ds-color-neutral-grey-40)]" />
          <span className="text-[var(--ds-color-neutral-grey-60)]">Pantai Indah Kapuk, last seen 4m ago</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" className="flex-1">Details</Button>
        <Button size="sm" className="flex-1">Assign driver</Button>
      </CardFooter>
    </Card>
  ),
};

// ─── Minimal ──────────────────────────────────────────────────────────────────

export const Minimal: Story = {
  name: "Content-only (no header/footer)",
  render: () => (
    <Card className="w-[320px] p-6">
      <p className="text-[var(--ds-font-size-sm)] text-[var(--ds-color-neutral-grey-60)]">
        A card used with a single direct padding override for tighter layouts like
        alert rows or table row expansions.
      </p>
    </Card>
  ),
};

// ─── Grid of cards ────────────────────────────────────────────────────────────

export const CardGrid: Story = {
  name: "Card grid pattern",
  parameters: { layout: "fullscreen" },
  render: () => (
    <div
      className="grid grid-cols-3 gap-6 p-8"
      style={{ background: "var(--ds-color-neutral-grey-05)" }}
    >
      {["Fleet utilisation", "Active vehicles", "Energy consumed"].map((title, i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--ds-font-size-3xl)] font-[var(--ds-font-weight-bold)] text-[var(--ds-color-neutral-ink)]">
              {["84%", "12", "2,840 kWh"][i]}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  ),
};
