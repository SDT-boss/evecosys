import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { InviteStateRow } from "@/components/board/settings/InviteStateRow";

/**
 * InviteStateRow — invite lifecycle row covering all 5 states:
 * sent, expiring, accepted, expired, revoked — plus the isLimitedAccess variant.
 *
 * All Date values are static offsets from a fixed epoch (2026-06-21T12:00:00Z)
 * so stories render consistently regardless of when Storybook is opened.
 */

// Fixed reference point — matches today's date in this project.
const REF = new Date("2026-06-21T12:00:00Z");

const meta: Meta<typeof InviteStateRow> = {
  title: "Components/InviteStateRow",
  component: InviteStateRow,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div
        style={{
          border: "1px solid #eef2ee",
          padding: "16px",
          backgroundColor: "#ffffff",
          maxWidth: "700px",
          margin: "0 auto",
          borderRadius: "8px",
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof InviteStateRow>;

// ─── Sent ─────────────────────────────────────────────────────────────────────

export const Sent: Story = {
  name: "Sent",
  args: {
    state: "sent",
    email: "charlie@example.com",
    name: "Charlie",
    // Expires in 5 days from reference
    expiresAt: new Date(REF.getTime() + 5 * 24 * 60 * 60 * 1000),
    onResend: fn(),
    onRevoke: fn(),
  },
};

// ─── Expiring ─────────────────────────────────────────────────────────────────

export const Expiring: Story = {
  name: "Expiring",
  args: {
    state: "expiring",
    email: "dana@example.com",
    name: "Dana",
    // Expires in 8 hours from reference
    expiresAt: new Date(REF.getTime() + 8 * 60 * 60 * 1000),
    onResend: fn(),
    onRevoke: fn(),
  },
};

// ─── Accepted ─────────────────────────────────────────────────────────────────

export const Accepted: Story = {
  name: "Accepted",
  args: {
    state: "accepted",
    email: "evan@example.com",
    name: "Evan",
    // Joined 2 hours before reference
    joinedAt: new Date(REF.getTime() - 2 * 60 * 60 * 1000),
    onView: fn(),
  },
};

// ─── Expired ──────────────────────────────────────────────────────────────────

export const Expired: Story = {
  name: "Expired",
  args: {
    state: "expired",
    email: "fiona@example.com",
    name: "Fiona",
    // Expired 3 days before reference
    expiresAt: new Date(REF.getTime() - 3 * 24 * 60 * 60 * 1000),
    onReinvite: fn(),
  },
};

// ─── Revoked ──────────────────────────────────────────────────────────────────

export const Revoked: Story = {
  name: "Revoked",
  args: {
    state: "revoked",
    email: "george@example.com",
    name: "George",
    // Revoked 1 day before reference
    revokedAt: new Date(REF.getTime() - 1 * 24 * 60 * 60 * 1000),
    revokedBy: "Admin User",
    onReinvite: fn(),
  },
};

// ─── Limited Access ───────────────────────────────────────────────────────────

export const LimitedAccess: Story = {
  name: "Limited Access",
  args: {
    state: "sent",
    email: "helen@example.com",
    name: "Helen",
    // Expires in 2 days from reference
    expiresAt: new Date(REF.getTime() + 2 * 24 * 60 * 60 * 1000),
    onResend: fn(),
    onRevoke: fn(),
    isLimitedAccess: true,
  },
};
