import type { Meta, StoryObj } from "@storybook/react";
import { Zap, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/design-system/components/Button";

const meta: Meta<typeof Button> = {
  title: "Primitives/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "The foundational interactive element for EVEcosys. Six semantic variants map directly to use-case hierarchy. All share the Cyber Jade focus ring for consistent keyboard-navigation affordance.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "ghost", "destructive", "link"],
      description: "Visual and semantic intent of the button",
    },
    size: {
      control: "select",
      options: ["sm", "default", "lg", "icon"],
      description: "Height and padding scale",
    },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// ─── Single-variant playground ────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    children: "Add vehicle",
    variant: "default",
    size: "default",
  },
};

// ─── All variants ─────────────────────────────────────────────────────────────

export const AllVariants: Story = {
  name: "All variants",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Every variant in its resting state. Use at most one `default` (Volt Green) CTA per view.",
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="default">Default (CTA)</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

// ─── All sizes ────────────────────────────────────────────────────────────────

export const AllSizes: Story = {
  name: "All sizes",
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-end gap-3">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Lightning bolt action">
        <Zap />
      </Button>
    </div>
  ),
};

// ─── With icons ───────────────────────────────────────────────────────────────

export const WithIcon: Story = {
  name: "With leading icon",
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="default">
        <Zap /> Start charging
      </Button>
      <Button variant="secondary">
        <ArrowRight /> Next step
      </Button>
      <Button variant="destructive">
        <Trash2 /> Delete vehicle
      </Button>
    </div>
  ),
};

// ─── Loading state ────────────────────────────────────────────────────────────

export const Loading: Story = {
  name: "Loading state",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Simulate pending state with a Spinner icon. The button should also be `disabled` during loading to prevent double-submission.",
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled>
        <Loader2 className="animate-spin" /> Saving…
      </Button>
      <Button variant="secondary" disabled>
        <Loader2 className="animate-spin" /> Submitting…
      </Button>
    </div>
  ),
};

// ─── Disabled state ───────────────────────────────────────────────────────────

export const Disabled: Story = {
  name: "Disabled state",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Disabled state uses explicit grey tokens (not `opacity`) so it meets WCAG non-text contrast requirements across all variants.",
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled variant="default">Default</Button>
      <Button disabled variant="secondary">Secondary</Button>
      <Button disabled variant="outline">Outline</Button>
      <Button disabled variant="ghost">Ghost</Button>
      <Button disabled variant="destructive">Destructive</Button>
    </div>
  ),
};

// ─── Icon-only ────────────────────────────────────────────────────────────────

export const IconOnly: Story = {
  name: "Icon-only (size=icon)",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: "Icon-only buttons must carry an `aria-label` for screen reader accessibility.",
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="icon" aria-label="Start charging">
        <Zap />
      </Button>
      <Button size="icon" variant="outline" aria-label="Delete">
        <Trash2 />
      </Button>
      <Button size="icon" variant="ghost" aria-label="Next">
        <ArrowRight />
      </Button>
    </div>
  ),
};
