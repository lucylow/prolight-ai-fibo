import type { Meta, StoryObj } from '@storybook/react';
import S3PresignedUploader from './S3PresignedUploader';
import { AuthProvider } from '../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

const meta = {
  title: 'Core/S3Uploader',
  component: S3PresignedUploader,
  decorators: [
    (Story) => (
      <BrowserRouter>
        <AuthProvider>
          <div style={{ padding: 40, maxWidth: 600 }}>
            <Story />
          </div>
        </AuthProvider>
      </BrowserRouter>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof S3PresignedUploader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onComplete: (result) => {
      console.log('Upload complete:', result);
    },
    accept: 'image/*',
    maxSize: 5 * 1024 * 1024, // 5MB
  },
};

export const MultipleFiles: Story = {
  args: {
    multiple: true,
    onComplete: (result) => {
      console.log('Upload complete:', result);
    },
  },
};
