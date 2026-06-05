import type { Preview } from "@storybook/react";
import "../app/globals.css";
import "../dist/tokens/variables.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "grey-05",
      values: [
        { name: "grey-05", value: "#f3f5f5" },
        { name: "white",   value: "#ffffff" },
        { name: "ink",     value: "#0b0f0e" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date:  /Date$/i,
      },
    },
    layout: "centered",
  },
};

export default preview;
