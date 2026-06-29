import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import {
  LoadingState,
  EmptyState,
  ErrorState,
  RestrictedState,
  UnavailableState,
} from "@/components/layout/shell/ContentStates";

/**
 * Shell content state components — all five fallback/loading/error state UI
 * patterns used inside the DashboardShell content area.
 *
 * These are pure presentational components with no context dependencies.
 */

const meta: Meta<typeof LoadingState> = {
  title: "Components/ContentStates",
  component: LoadingState,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: "600px",
          padding: "24px",
          margin: "0 auto",
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LoadingState>;

// ─── Loading ──────────────────────────────────────────────────────────────────

export const Loading: Story = {
  name: "Loading",
  render: () => <LoadingState />,
};

// ─── Empty ────────────────────────────────────────────────────────────────────

export const Empty: Story = {
  name: "Empty",
  render: () => <EmptyState message="No vehicles found" />,
};

// ─── Empty with CTA ───────────────────────────────────────────────────────────

export const EmptyWithCta: Story = {
  name: "Empty with CTA",
  render: () => (
    <EmptyState
      message="No vehicles found"
      ctaLabel="Add your first vehicle"
      onCta={fn()}
    />
  ),
};

// ─── Error ────────────────────────────────────────────────────────────────────

export const Error: Story = {
  name: "Error",
  render: () => <ErrorState onRetry={fn()} onReport={fn()} />,
};

// ─── Restricted ───────────────────────────────────────────────────────────────

export const Restricted: Story = {
  name: "Restricted",
  render: () => <RestrictedState onBack={fn()} onRequestAccess={fn()} />,
};

// ─── Unavailable ──────────────────────────────────────────────────────────────

export const Unavailable: Story = {
  name: "Unavailable",
  render: () => <UnavailableState onUpgrade={fn()} onLearnMore={fn()} />,
};
