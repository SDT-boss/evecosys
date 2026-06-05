import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "@/design-system/components/Input";
import { Label } from "@/design-system/components/Label";
import { FormField } from "@/design-system/components/FormField";

const meta: Meta<typeof Input> = {
  title: "Primitives/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Single-line text input covering the full EVEcosys state set. Focus uses a Jade border + 3px halo. Error state is applied via `aria-invalid='true'` and reads from the `status-error` token.",
      },
    },
  },
  argTypes: {
    disabled: { control: "boolean" },
    placeholder: { control: "text" },
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "search"],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[340px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Input>;

// ─── Playground ───────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    placeholder: "Vehicle plate number",
  },
};

// ─── States ───────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: { placeholder: "Vehicle plate number" },
};

export const WithValue: Story = {
  name: "Filled",
  args: { defaultValue: "EV-001-JKT", placeholder: "Vehicle plate number" },
};

export const Disabled: Story = {
  args: {
    placeholder: "Vehicle plate number",
    defaultValue: "EV-001-JKT",
    disabled: true,
  },
};

export const Error: Story = {
  name: "Error state",
  parameters: {
    docs: {
      description: {
        story:
          "Pass `aria-invalid='true'` to trigger the red border + halo. Always pair with a visible error message via `aria-describedby`.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-1.5">
      <Input
        placeholder="driver@company.com"
        aria-invalid="true"
        aria-describedby="email-error"
        defaultValue="not-an-email"
      />
      <p
        id="email-error"
        className="text-[var(--ds-font-size-xs)] text-[var(--ds-color-status-error)]"
      >
        Enter a valid email address.
      </p>
    </div>
  ),
};

// ─── With Label ───────────────────────────────────────────────────────────────

export const WithLabel: Story = {
  name: "With label",
  render: () => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="plate">Vehicle plate</Label>
      <Input id="plate" placeholder="EV-001-JKT" />
    </div>
  ),
};

// ─── Full form field ──────────────────────────────────────────────────────────

export const AllStatesFormField: Story = {
  name: "All states (FormField)",
  parameters: {
    docs: {
      description: {
        story:
          "All four states rendered with their FormField wrappers for visual comparison.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-6 w-[340px]">
      <FormField id="ff-default" label="Driver email" helperText="We'll send login instructions here.">
        <Input id="ff-default" placeholder="driver@company.com" />
      </FormField>

      <FormField id="ff-filled" label="Driver email">
        <Input id="ff-filled" defaultValue="jane@evecosys.com" />
      </FormField>

      <FormField
        id="ff-error"
        label="Vehicle plate"
        required
        error="Plate number is required"
      >
        <Input id="ff-error" aria-invalid="true" aria-describedby="ff-plate-error" placeholder="EV-001-JKT" />
      </FormField>

      <FormField id="ff-disabled" label="Organisation ID">
        <Input id="ff-disabled" defaultValue="ORG-42" disabled />
      </FormField>
    </div>
  ),
};

// ─── Input types ──────────────────────────────────────────────────────────────

export const Types: Story = {
  name: "Input types",
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-4 w-[340px]">
      <Input type="text"     placeholder="Text input" />
      <Input type="email"    placeholder="email@example.com" />
      <Input type="password" placeholder="••••••••" />
      <Input type="number"   placeholder="0" />
      <Input type="search"   placeholder="Search vehicles…" />
    </div>
  ),
};
