import type { Meta, StoryObj } from "@storybook/react";
import { BlockedScreen } from "@/components/platform/BlockedScreen";

const meta: Meta<typeof BlockedScreen> = {
  title: "Components/BlockedScreen",
  component: BlockedScreen,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof BlockedScreen>;

export const BlockedState: Story = {};
