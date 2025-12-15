import type { Preview } from '@storybook/react-vite'
import React from 'react';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 20, background: "#0F1113", minHeight: "100vh" }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;

