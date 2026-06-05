import type { Meta, StoryObj } from "@storybook/react";
import { LayoutDashboard, Car, Users, Zap, Bell, Settings, MapPin } from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { StatCard } from "@/design-system/components/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/components/Card";

/**
 * Static mock of the DashboardShell layout pattern.
 *
 * The production DashboardShell (components/layout/DashboardShell.tsx) requires
 * Supabase auth and Next.js routing — those can't run in Storybook. This story
 * demonstrates the visual structure and token usage without the live data layer.
 *
 * When modifying DashboardShell for real use, ensure any structural changes
 * are reflected here so the pattern stays reviewable.
 */

const NAV_ITEMS = [
  { label: "Overview",          icon: LayoutDashboard, href: "#", active: true,  badge: undefined },
  { label: "Asset Management",  icon: Car,             href: "#", active: false, badge: undefined },
  { label: "Drivers",           icon: Users,           href: "#", active: false, badge: undefined },
  { label: "Charging Stations", icon: Zap,             href: "#", active: false, badge: undefined },
  { label: "Alerts",            icon: Bell,            href: "#", active: false, badge: 5 },
  { label: "Settings",          icon: Settings,        href: "#", active: false, badge: undefined },
];

function MockSidebar({ activeLabel = "Overview" }: { activeLabel?: string }) {
  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col h-full"
      style={{
        background: "var(--ds-color-neutral-ink)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Logo area */}
      <div
        className="h-[62px] flex items-center px-5 gap-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="w-7 h-7 rounded-[var(--ds-radius-sm)] flex items-center justify-center text-xs font-bold"
          style={{ background: "var(--ds-color-brand-secondary)", color: "var(--ds-color-neutral-ink)" }}
        >
          E
        </div>
        <span className="text-white font-semibold text-sm tracking-wide">EVEcosys</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ label, icon: Icon, active: defaultActive, badge }) => {
          const isActive = label === activeLabel || (activeLabel === "Overview" && defaultActive);
          return (
            <a
              key={label}
              href="#"
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-3 px-3 py-2 rounded-[var(--ds-radius-md)] text-sm transition-colors"
              style={{
                background: isActive ? "rgba(0,134,132,0.18)" : "transparent",
                color: isActive
                  ? "var(--ds-color-brand-primary)"
                  : "rgba(255,255,255,0.55)",
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? "3px solid var(--ds-color-brand-primary)" : "3px solid transparent",
              }}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">{badge}</Badge>
              )}
            </a>
          );
        })}
      </nav>

      {/* User area */}
      <div
        className="px-3 py-4 flex items-center gap-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="w-8 h-8 rounded-[var(--ds-radius-full)] flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: "var(--ds-color-brand-secondary)", color: "var(--ds-color-neutral-ink)" }}
        >
          JD
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate">Jane Doe</p>
          <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.45)" }}>Fleet Manager</p>
        </div>
      </div>
    </aside>
  );
}

function MockTopbar() {
  return (
    <div
      className="h-[62px] flex items-center justify-between px-6 flex-shrink-0"
      style={{
        background: "var(--ds-color-neutral-grey-05)",
        borderBottom: "1px solid var(--ds-color-neutral-grey-20)",
      }}
    >
      <div>
        <h1 className="text-[var(--ds-font-size-lg)] font-[var(--ds-font-weight-semibold)] text-[var(--ds-color-neutral-ink)]">
          Fleet Overview
        </h1>
        <p className="text-[var(--ds-font-size-xs)] text-[var(--ds-color-neutral-grey-60)]">
          Jakarta South · 2026-06-05 · 14:32 WIB
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 rounded-[var(--ds-radius-full)] px-3 py-1 text-xs font-semibold"
          style={{
            background: "rgba(150,208,44,0.12)",
            border: "1px solid rgba(150,208,44,0.3)",
            color: "var(--ds-color-brand-secondary-strong)",
          }}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--ds-color-brand-secondary)" }} />
          LIVE
        </div>
        <Button variant="outline" size="sm">
          <Bell className="h-4 w-4" />
          <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 ml-0.5">5</Badge>
        </Button>
      </div>
    </div>
  );
}

function MockContent() {
  return (
    <main className="flex-1 overflow-auto p-6 flex flex-col gap-6" style={{ background: "var(--ds-color-neutral-grey-05)" }}>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Fleet utilisation" value="84" unit="%" trend="up"      trendValue="+6%" trendLabel="vs last week" icon={<Zap />} />
        <StatCard label="Active vehicles"   value="12"          trend="neutral" trendValue="—"   trendLabel="no change"    icon={<Car />} />
        <StatCard label="Active drivers"    value="28"          trend="up"      trendValue="+3"  trendLabel="this month"   icon={<Users />} />
        <StatCard label="Alerts"            value="5"           trend="down"    trendValue="−2"  trendLabel="since yesterday" icon={<Bell />} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent alerts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[
              { label: "EV-007 — geofence breach",    badge: "destructive" as const, time: "2m ago"  },
              { label: "EV-003 — battery low (12%)",  badge: "volt"        as const, time: "18m ago" },
              { label: "EV-011 — maintenance due",    badge: "secondary"   as const, time: "1h ago"  },
            ].map(({ label, badge, time }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={badge} className="text-[10px]">!</Badge>
                  <span className="text-[var(--ds-font-size-sm)] text-[var(--ds-color-neutral-ink)]">{label}</span>
                </div>
                <span className="text-[var(--ds-font-size-xs)] text-[var(--ds-color-neutral-grey-40)]">{time}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicles map</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-[var(--ds-radius-md)] flex items-center justify-center gap-2"
              style={{
                height: 140,
                background: "var(--ds-color-neutral-grey-05)",
                border: "1px dashed var(--ds-color-neutral-grey-20)",
                color: "var(--ds-color-neutral-grey-40)",
              }}
            >
              <MapPin className="h-5 w-5" />
              <span className="text-[var(--ds-font-size-sm)]">Live map placeholder</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

// ─── Storybook Meta ───────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Compositions/DashboardShell",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Static mock of the Manager/Admin DashboardShell layout. The production shell (`components/layout/DashboardShell.tsx`) requires live Supabase auth and Next.js routing. This story demonstrates the visual structure, sidebar nav tokens, topbar pattern, and content grid — all driven by `--ds-*` tokens.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

// ─── Full shell ───────────────────────────────────────────────────────────────

export const ManagerOverview: Story = {
  name: "Manager — Overview page",
  render: () => (
    <div className="flex h-screen overflow-hidden">
      <MockSidebar activeLabel="Overview" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <MockTopbar />
        <MockContent />
      </div>
    </div>
  ),
};

// ─── Sidebar only ─────────────────────────────────────────────────────────────

export const SidebarNav: Story = {
  name: "Sidebar navigation",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "The sidebar in isolation. Active state uses a 3px Jade left border as the primary selection indicator — colour is never the sole signal (WCAG 1.4.1).",
      },
    },
  },
  render: () => (
    <div className="h-[500px] w-60 rounded-[var(--ds-radius-lg)] overflow-hidden [box-shadow:var(--ds-shadow-lg)]">
      <MockSidebar activeLabel="Alerts" />
    </div>
  ),
};

// ─── Empty state ──────────────────────────────────────────────────────────────

export const EmptyDashboard: Story = {
  name: "Empty / first-run state",
  render: () => (
    <div className="flex h-screen overflow-hidden">
      <MockSidebar activeLabel="Overview" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <MockTopbar />
        <main
          className="flex-1 flex items-center justify-center"
          style={{ background: "var(--ds-color-neutral-grey-05)" }}
        >
          <div className="text-center flex flex-col items-center gap-4">
            <div
              className="w-16 h-16 rounded-[var(--ds-radius-full)] flex items-center justify-center"
              style={{ background: "var(--ds-color-neutral-grey-10)" }}
            >
              <Car className="h-7 w-7" style={{ color: "var(--ds-color-brand-primary)" }} />
            </div>
            <div>
              <h2 className="text-[var(--ds-font-size-lg)] font-[var(--ds-font-weight-semibold)] text-[var(--ds-color-neutral-ink)]">
                No vehicles yet
              </h2>
              <p className="text-[var(--ds-font-size-sm)] text-[var(--ds-color-neutral-grey-60)] mt-1">
                Add your first vehicle to start tracking your fleet.
              </p>
            </div>
            <Button>Add vehicle</Button>
          </div>
        </main>
      </div>
    </div>
  ),
};
