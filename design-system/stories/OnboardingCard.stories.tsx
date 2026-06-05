import type { Meta, StoryObj } from "@storybook/react";
import { Car, Users, Zap, CheckCircle } from "lucide-react";
import { OnboardingCard } from "@/design-system/components/OnboardingCard";
import { Button } from "@/design-system/components/Button";

const meta: Meta<typeof OnboardingCard> = {
  title: "Compositions/OnboardingCard",
  component: OnboardingCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Step-based onboarding card used during first-run flows for all role types: Manager fleet setup, Driver vehicle assignment, and Admin organisation review. Uses `--ds-shadow-md` to stand out from the page background during the focused flow.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof OnboardingCard>;

// ─── Playground ───────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    step: 1,
    totalSteps: 3,
    title: "Set up your fleet",
    description:
      "Add your first vehicles to start tracking routes, charging sessions, and energy usage.",
    icon: <Car />,
    action: <Button className="w-full">Add vehicles</Button>,
    secondaryAction: (
      <Button variant="ghost" className="w-full">
        Skip for now
      </Button>
    ),
  },
};

// ─── Manager flow ─────────────────────────────────────────────────────────────

export const ManagerFlow: Story = {
  name: "Manager onboarding flow (3 steps)",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: "All three steps of the Manager first-run flow shown side-by-side.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-6 items-center">
      <OnboardingCard
        step={1}
        totalSteps={3}
        title="Add your first vehicle"
        description="Enter the plate number, model, and battery capacity to start tracking your fleet."
        icon={<Car />}
        action={<Button className="w-full">Add vehicle</Button>}
        secondaryAction={<Button variant="ghost" className="w-full">Skip for now</Button>}
      />
      <OnboardingCard
        step={2}
        totalSteps={3}
        title="Invite drivers"
        description="Send an invite to your drivers. They'll receive an email with instructions to set up their account."
        icon={<Users />}
        action={<Button className="w-full">Invite drivers</Button>}
        secondaryAction={<Button variant="ghost" className="w-full">Do this later</Button>}
      />
      <OnboardingCard
        step={3}
        totalSteps={3}
        title="Configure charging stations"
        description="Add your charging locations so the system can track session data and costs automatically."
        icon={<Zap />}
        action={<Button className="w-full">Add stations</Button>}
        secondaryAction={<Button variant="ghost" className="w-full">Skip</Button>}
      />
    </div>
  ),
};

// ─── Complete state ───────────────────────────────────────────────────────────

export const CompletionState: Story = {
  name: "Completion step",
  parameters: { controls: { disable: true } },
  render: () => (
    <OnboardingCard
      title="You're all set!"
      description="Your fleet is configured and your drivers have been invited. Head to your dashboard to see live data."
      icon={<CheckCircle />}
      action={<Button className="w-full">Go to dashboard</Button>}
    />
  ),
};

// ─── No step indicator ────────────────────────────────────────────────────────

export const WithoutStepIndicator: Story = {
  name: "Without step indicator",
  args: {
    title: "Welcome to EVEcosys",
    description:
      "Your account has been set up by your fleet manager. Review your assigned vehicle and get ready to drive.",
    icon: <Car />,
    action: <Button className="w-full">View my vehicle</Button>,
  },
};

// ─── Minimal (no icon, no secondary action) ───────────────────────────────────

export const Minimal: Story = {
  name: "Minimal (no icon, no secondary action)",
  args: {
    step: 1,
    totalSteps: 2,
    title: "Verify your email",
    description: "Click the link we sent to confirm your account before continuing.",
    action: <Button variant="outline" className="w-full">Resend email</Button>,
  },
};
