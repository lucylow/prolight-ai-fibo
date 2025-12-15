import type { Meta, StoryObj } from '@storybook/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from './Navbar';
import { AuthProvider } from '../contexts/AuthContext';

// Mock auth context for Storybook
const MockAuthProvider = ({ children, user }: { children: React.ReactNode; user?: any }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

const meta = {
  title: 'Core/Navbar',
  component: Navbar,
  decorators: [
    (Story) => (
      <BrowserRouter>
        <MockAuthProvider>
          <Story />
        </MockAuthProvider>
      </BrowserRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Navbar />,
};

