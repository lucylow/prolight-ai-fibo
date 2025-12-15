/**
 * Storybook stories for CheckoutButton component
 */

import type { Meta, StoryObj } from '@storybook/react';
import CheckoutButton from './CheckoutButton';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import React from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const meta = {
  title: 'Billing/CheckoutButton',
  component: CheckoutButton,
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
} satisfies Meta<typeof CheckoutButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Subscription: Story = {
  args: {
    planName: 'pro',
    mode: 'subscription',
    label: 'Subscribe to Pro',
  },
};

export const OneTimePayment: Story = {
  args: {
    priceId: 'price_test_1234567890',
    mode: 'payment',
    label: 'Buy Now',
  },
};

export const WithCustomUrls: Story = {
  args: {
    planName: 'enterprise',
    mode: 'subscription',
    successUrl: '/checkout/success',
    cancelUrl: '/checkout/cancel',
    label: 'Subscribe',
  },
};

export const Disabled: Story = {
  args: {
    planName: 'pro',
    mode: 'subscription',
    label: 'Subscribe',
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    planName: 'pro',
    mode: 'subscription',
    label: 'Subscribe',
  },
  render: (args) => {
    // Simulate loading state
    return <CheckoutButton {...args} />;
  },
};

export const OutlineVariant: Story = {
  args: {
    planName: 'pro',
    mode: 'subscription',
    variant: 'outline',
    label: 'Subscribe',
  },
};

export const SmallSize: Story = {
  args: {
    planName: 'pro',
    mode: 'subscription',
    size: 'sm',
    label: 'Subscribe',
  },
};

export const LargeSize: Story = {
  args: {
    planName: 'pro',
    mode: 'subscription',
    size: 'lg',
    label: 'Subscribe to Pro Plan',
  },
};

