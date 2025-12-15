/**
 * Storybook stories for BillingPortalButton component
 */

import type { Meta, StoryObj } from '@storybook/react';
import BillingPortalButton from './BillingPortalButton';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import React from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const meta = {
  title: 'Billing/BillingPortalButton',
  component: BillingPortalButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story: React.ComponentType) => (
      <QueryClientProvider client={queryClient}>
        <Story />
        <Toaster />
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof BillingPortalButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Manage Subscription',
  },
};

export const WithCustomReturnUrl: Story = {
  args: {
    returnUrl: '/account/billing',
    label: 'Manage Subscription',
  },
};

export const WithoutIcon: Story = {
  args: {
    label: 'Manage Subscription',
    showIcon: false,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Manage Subscription',
    disabled: true,
  },
};

export const OutlineVariant: Story = {
  args: {
    variant: 'outline',
    label: 'Manage Subscription',
  },
};

export const GhostVariant: Story = {
  args: {
    variant: 'ghost',
    label: 'Manage Subscription',
  },
};

export const SmallSize: Story = {
  args: {
    size: 'sm',
    label: 'Manage',
  },
};

export const LargeSize: Story = {
  args: {
    size: 'lg',
    label: 'Manage Subscription',
  },
};

export const CustomLabel: Story = {
  args: {
    label: 'Update Payment Method',
  },
};
