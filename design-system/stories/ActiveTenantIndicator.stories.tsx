import type { Meta, StoryObj } from "@storybook/react";
import { ActiveTenantIndicator } from "@/components/platform/ActiveTenantIndicator";
import { TenantProvider } from "@/components/platform/TenantContext";

/**
 * ActiveTenantIndicator displays the current active tenant workspace name
 * alongside a Building2 icon in the platform admin header (ContentUtilityBar alertBell slot).
 *
 * The component reads directly from TenantContext — wrap each story in a
 * TenantProvider with the desired initialName to control which visual state renders.
 */
const meta: Meta<typeof ActiveTenantIndicator> = {
  title: "Components/ActiveTenantIndicator",
  component: ActiveTenantIndicator,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Shows the currently-active tenant workspace name with a Building2 icon. " +
          "Color transitions from grey (no tenant) to teal (active tenant). " +
          "Each story uses its own TenantProvider decorator with a different initialName.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ActiveTenantIndicator>;

// ─── Default: active tenant ───────────────────────────────────────────────────

export const Default: Story = {
  name: "Default — active tenant",
  decorators: [
    (Story) => (
      <TenantProvider initialName="Acme Fleet">
        <Story />
      </TenantProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Active workspace 'Acme Fleet' is set. The Building2 icon and name text " +
          "render in var(--ds-color-brand-primary) (Cyber Jade #008684).",
      },
    },
  },
};

// ─── NoTenant: no workspace selected ─────────────────────────────────────────

export const NoTenant: Story = {
  name: "No workspace selected",
  decorators: [
    (Story) => (
      <TenantProvider initialName={null}>
        <Story />
      </TenantProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "No active tenant — initialName is null. The indicator shows " +
          "'No workspace selected' fallback text in grey " +
          "(var(--ds-color-neutral-grey-40)).",
      },
    },
  },
};

// ─── Loading: pre-load state (visually identical to NoTenant) ─────────────────

export const Loading: Story = {
  name: "Loading / pre-load state",
  decorators: [
    (Story) => (
      <TenantProvider initialName={null}>
        <Story />
      </TenantProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Represents the pre-load state before the server has hydrated the tenant " +
          "context. The component has no explicit loading prop — the visual is " +
          "identical to NoTenant (grey icon + 'No workspace selected'). " +
          "Once hydrated, the context is updated and the component transitions " +
          "to the Default state via the CSS color transition.",
      },
    },
  },
};
