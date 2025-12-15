import type { Meta, StoryObj } from '@storybook/react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

const meta = {
  title: 'Core/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://via.placeholder.com/80" alt="User Avatar" />
      <AvatarFallback>AS</AvatarFallback>
    </Avatar>
  ),
};

export const WithoutImage: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback className="bg-teal-500 text-black">AS</AvatarFallback>
    </Avatar>
  ),
};

export const Large: Story = {
  render: () => (
    <Avatar className="h-16 w-16">
      <AvatarFallback className="bg-teal-500 text-black text-lg">AS</AvatarFallback>
    </Avatar>
  ),
};

export const Small: Story = {
  render: () => (
    <Avatar className="h-8 w-8">
      <AvatarFallback className="bg-teal-500 text-black text-xs">AS</AvatarFallback>
    </Avatar>
  ),
};

