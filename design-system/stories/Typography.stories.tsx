import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Foundations/Typography",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    controls: { disable: true },
    docs: {
      description: {
        component:
          "All typographic tokens from `dist/tokens/variables.css`. Two font families: **Inter/Geist** (sans) for all UI text, **JetBrains Mono** (mono) for code, IDs, and data values. Size scale is rem-based; weight and line-height tokens are dimensionless ratios.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

// ─── Font families ────────────────────────────────────────────────────────────

export const FontFamilies: Story = {
  name: "Font families",
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-3 text-[var(--ds-font-size-xs)] font-semibold uppercase tracking-widest text-[var(--ds-color-neutral-grey-40)]">
          --ds-font-family-sans
        </p>
        <p
          style={{ fontFamily: "var(--ds-font-family-sans)" }}
          className="text-[var(--ds-font-size-2xl)] text-[var(--ds-color-neutral-ink)]"
        >
          Fleet Management System
        </p>
        <p
          style={{ fontFamily: "var(--ds-font-family-sans)" }}
          className="text-[var(--ds-font-size-base)] text-[var(--ds-color-neutral-grey-60)] mt-1"
        >
          Geist, Inter, ui-sans-serif, system-ui, sans-serif
        </p>
      </div>

      <div>
        <p className="mb-3 text-[var(--ds-font-size-xs)] font-semibold uppercase tracking-widest text-[var(--ds-color-neutral-grey-40)]">
          --ds-font-family-mono
        </p>
        <p
          style={{ fontFamily: "var(--ds-font-family-mono)" }}
          className="text-[var(--ds-font-size-2xl)] text-[var(--ds-color-neutral-ink)]"
        >
          EV-001 · 4.2 mi/kWh · 2026-06-05
        </p>
        <p
          style={{ fontFamily: "var(--ds-font-family-mono)" }}
          className="text-[var(--ds-font-size-base)] text-[var(--ds-color-neutral-grey-60)] mt-1"
        >
          JetBrains Mono, ui-monospace, monospace
        </p>
      </div>
    </div>
  ),
};

// ─── Size scale ───────────────────────────────────────────────────────────────

const sizeTokens: { token: string; value: string; usage: string }[] = [
  { token: "--ds-font-size-3xl", value: "1.875rem", usage: "Dashboard KPI figures" },
  { token: "--ds-font-size-2xl", value: "1.5rem",   usage: "Page headings" },
  { token: "--ds-font-size-xl",  value: "1.25rem",  usage: "Section headings" },
  { token: "--ds-font-size-lg",  value: "1.125rem", usage: "Subheadings, card titles" },
  { token: "--ds-font-size-base", value: "1rem",    usage: "Primary body text" },
  { token: "--ds-font-size-sm",  value: "0.875rem", usage: "Secondary body, table cells" },
  { token: "--ds-font-size-xs",  value: "0.75rem",  usage: "Labels, badges, timestamps" },
];

export const SizeScale: Story = {
  name: "Size scale",
  render: () => (
    <div className="flex flex-col gap-6 max-w-2xl">
      {sizeTokens.map(({ token, value, usage }) => (
        <div key={token} className="flex items-baseline gap-6">
          <p style={{ fontSize: `var(${token})` }} className="text-[var(--ds-color-neutral-ink)] leading-none min-w-0 flex-1">
            EVEcosys Fleet
          </p>
          <div className="flex-shrink-0 text-right">
            <p className="font-mono text-[var(--ds-font-size-xs)] text-[var(--ds-color-brand-primary)]">{token}</p>
            <p className="font-mono text-[var(--ds-font-size-xs)] text-[var(--ds-color-neutral-grey-40)]">{value} · {usage}</p>
          </div>
        </div>
      ))}
    </div>
  ),
};

// ─── Weight scale ─────────────────────────────────────────────────────────────

const weightTokens = [
  { token: "--ds-font-weight-bold",     value: "700", label: "Bold" },
  { token: "--ds-font-weight-semibold", value: "600", label: "Semibold" },
  { token: "--ds-font-weight-medium",   value: "500", label: "Medium" },
  { token: "--ds-font-weight-normal",   value: "400", label: "Normal" },
];

export const WeightScale: Story = {
  name: "Weight scale",
  render: () => (
    <div className="flex flex-col gap-4">
      {weightTokens.map(({ token, value, label }) => (
        <div key={token} className="flex items-center gap-6">
          <p
            style={{ fontWeight: `var(${token})` }}
            className="text-[var(--ds-font-size-xl)] text-[var(--ds-color-neutral-ink)] w-48"
          >
            {label}
          </p>
          <div>
            <p className="font-mono text-[var(--ds-font-size-xs)] text-[var(--ds-color-brand-primary)]">{token}</p>
            <p className="font-mono text-[var(--ds-font-size-xs)] text-[var(--ds-color-neutral-grey-40)]">{value}</p>
          </div>
        </div>
      ))}
    </div>
  ),
};

// ─── Line-height scale ────────────────────────────────────────────────────────

const lineHeightTokens = [
  { token: "--ds-font-line-height-tight",   value: "1.25",  label: "Tight",   usage: "Headings" },
  { token: "--ds-font-line-height-snug",    value: "1.375", label: "Snug",    usage: "Subheadings" },
  { token: "--ds-font-line-height-normal",  value: "1.5",   label: "Normal",  usage: "Body text" },
  { token: "--ds-font-line-height-relaxed", value: "1.625", label: "Relaxed", usage: "Long-form content" },
];

export const LineHeightScale: Story = {
  name: "Line-height scale",
  render: () => (
    <div className="flex flex-col gap-6 max-w-xl">
      {lineHeightTokens.map(({ token, value, label, usage }) => (
        <div key={token} className="flex gap-6 items-start">
          <div
            style={{ lineHeight: `var(${token})` }}
            className="text-[var(--ds-font-size-base)] text-[var(--ds-color-neutral-ink)] flex-1"
          >
            Monitor charging health, track energy consumption, and manage your EV fleet from one place.
          </div>
          <div className="flex-shrink-0 text-right w-48">
            <p className="font-mono text-[var(--ds-font-size-xs)] text-[var(--ds-color-brand-primary)]">{token}</p>
            <p className="font-mono text-[var(--ds-font-size-xs)] text-[var(--ds-color-neutral-grey-40)]">{value} · {label} · {usage}</p>
          </div>
        </div>
      ))}
    </div>
  ),
};

// ─── Real-world typographic hierarchy ─────────────────────────────────────────

export const PageHierarchy: Story = {
  name: "Page hierarchy (real-world)",
  parameters: {
    docs: {
      description: {
        story: "Demonstrates the full typographic hierarchy as it appears on a Manager dashboard page.",
      },
    },
  },
  render: () => (
    <div className="max-w-xl flex flex-col gap-4">
      <p className="text-[var(--ds-font-size-xs)] font-semibold uppercase tracking-widest text-[var(--ds-color-neutral-grey-40)]">
        Fleet Management
      </p>
      <h1 className="text-[var(--ds-font-size-3xl)] font-[var(--ds-font-weight-bold)] leading-[var(--ds-font-line-height-tight)] text-[var(--ds-color-neutral-ink)]">
        Jakarta South Fleet
      </h1>
      <h2 className="text-[var(--ds-font-size-xl)] font-[var(--ds-font-weight-semibold)] text-[var(--ds-color-neutral-grey-80)]">
        Active vehicles · 12 of 15
      </h2>
      <p className="text-[var(--ds-font-size-base)] leading-[var(--ds-font-line-height-normal)] text-[var(--ds-color-neutral-grey-60)]">
        3 vehicles are currently offline. Review the alert log to identify
        geofence breaches and schedule maintenance as needed.
      </p>
      <p className="text-[var(--ds-font-size-xs)] text-[var(--ds-color-neutral-grey-40)]">
        Last synced: 2026-06-05 · 14:32 WIB
      </p>
    </div>
  ),
};
