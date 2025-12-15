import type { Meta, StoryObj } from '@storybook/react';
import InvoicesTable, { Invoice } from './InvoicesTable';

const meta = {
  title: 'Core/InvoicesTable',
  component: InvoicesTable,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof InvoicesTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockInvoices: Invoice[] = [
  { id: "inv_001", number: "INV-1042", date: "2025-12-01", amount: 120.0, status: "Paid" },
  { id: "inv_002", number: "INV-1041", date: "2025-12-10", amount: 240.0, status: "Pending" },
  { id: "inv_003", number: "INV-1040", date: "2025-11-15", amount: 49.0, status: "Due" },
  { id: "inv_004", number: "INV-1039", date: "2025-10-01", amount: 99.0, status: "Overdue" },
];

export const Default: Story = {
  args: {
    invoices: mockInvoices,
  },
};

export const Empty: Story = {
  args: {
    invoices: [],
  },
};

export const SingleInvoice: Story = {
  args: {
    invoices: [mockInvoices[0]],
  },
};
