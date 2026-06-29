import type { Meta, StoryObj } from "@storybook/react";
import { SettingsTabNav } from "@/components/board/settings/SettingsTabNav";

/**
 * BoardSettingsTabs (SettingsTabNav) provides the horizontal tab navigation
 * for the Board Settings area: Branding | Users | BYODB | Feature Toggles.
 *
 * Each tab is a next/link wrapped in a Radix TabsTrigger (asChild).
 * The active tab is determined by usePathname() — per-story pathname is set
 * via parameters.nextjs.navigation.pathname (handled by @storybook/nextjs).
 *
 * Per Risk 2 in RESEARCH.md, the pathname parameter MUST be set per story
 * (not just in meta) to ensure each tab story shows that tab as active.
 */
const meta: Meta<typeof SettingsTabNav> = {
  title: "Compositions/BoardSettingsTabs",
  component: SettingsTabNav,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Horizontal tab bar for Board Settings. Uses Radix Tabs with " +
          "next/link (asChild). Active tab is derived from usePathname() — " +
          "@storybook/nextjs mocks usePathname via parameters.nextjs.navigation.pathname.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SettingsTabNav>;

// ─── Branding tab active ──────────────────────────────────────────────────────

export const BrandingTabActive: Story = {
  name: "Branding tab active",
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/board/settings/branding",
      },
    },
    docs: {
      description: {
        story:
          "pathname = '/board/settings/branding'. The Branding tab " +
          "renders as the active TabsTrigger.",
      },
    },
  },
};

// ─── Users tab active ─────────────────────────────────────────────────────────

export const UsersTabActive: Story = {
  name: "Users tab active",
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/board/settings/users",
      },
    },
    docs: {
      description: {
        story:
          "pathname = '/board/settings/users'. The Users tab " +
          "renders as the active TabsTrigger.",
      },
    },
  },
};

// ─── BYODB tab active ─────────────────────────────────────────────────────────

export const BYODBTabActive: Story = {
  name: "BYODB tab active",
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/board/settings/byodb",
      },
    },
    docs: {
      description: {
        story:
          "pathname = '/board/settings/byodb'. The BYODB tab " +
          "renders as the active TabsTrigger.",
      },
    },
  },
};

// ─── Feature Toggles tab active ───────────────────────────────────────────────

export const FeatureTogglesTabActive: Story = {
  name: "Feature Toggles tab active",
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/board/settings/toggles",
      },
    },
    docs: {
      description: {
        story:
          "pathname = '/board/settings/toggles'. The Feature Toggles tab " +
          "renders as the active TabsTrigger.",
      },
    },
  },
};
