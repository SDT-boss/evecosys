import type { Meta, StoryObj } from "@storybook/react";
import { Zap, Car, Users, BatteryCharging } from "lucide-react";
import { StatCard } from "@/design-system/components/StatCard";

const meta: Meta<typeof StatCard> = {
  title: "Compositions/StatCard",
  component: StatCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "KPI display card for fleet metrics, driver summaries, and energy dashboards. The primary pattern for Manager and Admin dashboard grids. Trend direction `up` uses Volt Green Strong, `down` uses status-error, `neutral` uses grey-60.",
      },
    },
  },
  argTypes: {
    trend: {
      control: "select",
      options: ["up", "down", "neutral"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatCard>;

// ─── Playground ───────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    label: "Fleet utilisation",
    value: "84",
    unit: "%",
    trend: "up",
    trendValue: "+6%",
    trendLabel: "vs last week",
    icon: <Zap />,
  },
};

// ─── Trend directions ─────────────────────────────────────────────────────────

export const TrendDirections: Story = {
  name: "Trend directions",
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <StatCard
        label="Fleet utilisation"
        value="84"
        unit="%"
        trend="up"
        trendValue="+6%"
        trendLabel="vs last week"
        icon={<Zap />}
      />
      <StatCard
        label="Average range"
        value="312"
        unit="km"
        trend="neutral"
        trendValue="—"
        trendLabel="no change"
        icon={<Car />}
      />
      <StatCard
        label="Offline vehicles"
        value="3"
        trend="down"
        trendValue="−2"
        trendLabel="since yesterday"
        icon={<BatteryCharging />}
      />
    </div>
  ),
};

// ─── With and without icon ────────────────────────────────────────────────────

export const WithAndWithoutIcon: Story = {
  name: "With and without icon",
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex gap-4">
      <StatCard
        label="Active drivers"
        value="28"
        trend="up"
        trendValue="+3"
        trendLabel="this month"
        icon={<Users />}
      />
      <StatCard
        label="Active drivers"
        value="28"
        trend="up"
        trendValue="+3"
        trendLabel="this month"
      />
    </div>
  ),
};

// ─── Dashboard KPI grid ───────────────────────────────────────────────────────

export const DashboardGrid: Story = {
  name: "Manager dashboard KPI grid",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        story: "Four StatCards in the 4-column grid pattern used on the Manager overview page.",
      },
    },
    controls: { disable: true },
  },
  render: () => (
    <div className="p-8" style={{ background: "var(--ds-color-neutral-grey-05)" }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Fleet utilisation" value="84" unit="%" trend="up"      trendValue="+6%"  trendLabel="vs last week"  icon={<Zap />} />
        <StatCard label="Active vehicles"   value="12"          trend="neutral" trendValue="—"    trendLabel="no change"     icon={<Car />} />
        <StatCard label="Active drivers"    value="28"          trend="up"      trendValue="+3"   trendLabel="this month"    icon={<Users />} />
        <StatCard label="Energy consumed"   value="2,840" unit="kWh" trend="down" trendValue="−8%" trendLabel="vs last week" icon={<BatteryCharging />} />
      </div>
    </div>
  ),
};

// ─── Minimal (no trend, no icon) ──────────────────────────────────────────────

export const Minimal: Story = {
  name: "Minimal (value only)",
  args: {
    label: "Total trips",
    value: "1,247",
    description: "Since fleet inception",
  },
};
