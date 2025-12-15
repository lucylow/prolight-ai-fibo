/**
 * Mock Stripe Service
 * Simulates Stripe API calls with mock data for demonstration
 */

export interface MockCheckoutSession {
  id: string;
  url: string;
  customer: string;
  amount_total: number;
  currency: string;
  payment_status: string;
  status: string;
}

export interface MockPaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

export interface MockInvoice {
  id: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  created: number;
  hosted_invoice_url: string;
  invoice_pdf: string;
  subscription: string;
  description?: string;
}

export interface MockSubscription {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  items: {
    price: {
      id: string;
      unit_amount: number;
      currency: string;
      recurring: {
        interval: string;
      };
    };
  }[];
}

/**
 * Create a mock checkout session
 */
export async function createMockCheckoutSession(params: {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  mode?: 'subscription' | 'payment';
  customerId?: string;
}): Promise<MockCheckoutSession> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const sessionId = `cs_test_${Math.random().toString(36).substring(2, 15)}`;
  
  return {
    id: sessionId,
    url: `${window.location.origin}/checkout?session_id=${sessionId}`,
    customer: params.customerId || `cus_${Math.random().toString(36).substring(2, 15)}`,
    amount_total: params.mode === 'subscription' ? 0 : 4999, // $49.99
    currency: 'usd',
    payment_status: 'unpaid',
    status: 'open',
  };
}

/**
 * Get mock payment methods
 */
export async function getMockPaymentMethods(customerId?: string): Promise<MockPaymentMethod[]> {
  await new Promise(resolve => setTimeout(resolve, 300));

  return [
    {
      id: `pm_${Math.random().toString(36).substring(2, 15)}`,
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        exp_month: 12,
        exp_year: 2025,
      },
    },
    {
      id: `pm_${Math.random().toString(36).substring(2, 15)}`,
      type: 'card',
      card: {
        brand: 'mastercard',
        last4: '5555',
        exp_month: 6,
        exp_year: 2026,
      },
    },
  ];
}

/**
 * Get mock invoices
 */
export async function getMockInvoices(customerId?: string, limit: number = 10): Promise<MockInvoice[]> {
  await new Promise(resolve => setTimeout(resolve, 400));

  const invoices: MockInvoice[] = [];
  const now = Date.now();
  const monthMs = 30 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < limit; i++) {
    const amount = i === 0 ? 4999 : 2999; // $49.99 or $29.99
    invoices.push({
      id: `in_${Math.random().toString(36).substring(2, 15)}`,
      amount_paid: amount,
      amount_due: 0,
      currency: 'usd',
      status: 'paid',
      created: now - (i * monthMs),
      hosted_invoice_url: `${window.location.origin}/invoices/${Math.random().toString(36).substring(2, 15)}`,
      invoice_pdf: `${window.location.origin}/invoices/${Math.random().toString(36).substring(2, 15)}.pdf`,
      subscription: `sub_${Math.random().toString(36).substring(2, 15)}`,
      description: i === 0 ? 'Pro Plan - Monthly' : 'Pro Plan - Monthly',
    });
  }

  return invoices;
}

/**
 * Get mock subscription
 */
export async function getMockSubscription(subscriptionId?: string): Promise<MockSubscription> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const now = Date.now();
  const monthMs = 30 * 24 * 60 * 60 * 1000;

  return {
    id: subscriptionId || `sub_${Math.random().toString(36).substring(2, 15)}`,
    status: 'active',
    current_period_start: now - (15 * 24 * 60 * 60 * 1000), // 15 days ago
    current_period_end: now + (15 * 24 * 60 * 60 * 1000), // 15 days from now
    cancel_at_period_end: false,
    items: [
      {
        price: {
          id: 'price_mock_pro',
          unit_amount: 4999,
          currency: 'usd',
          recurring: {
            interval: 'month',
          },
        },
      },
    ],
  };
}

/**
 * Complete a mock checkout session (simulate payment)
 */
export async function completeMockCheckout(sessionId: string): Promise<{
  success: boolean;
  session: MockCheckoutSession;
  paymentIntent?: string;
}> {
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing

  return {
    success: true,
    session: {
      id: sessionId,
      url: '',
      customer: `cus_${Math.random().toString(36).substring(2, 15)}`,
      amount_total: 4999,
      currency: 'usd',
      payment_status: 'paid',
      status: 'complete',
    },
    paymentIntent: `pi_${Math.random().toString(36).substring(2, 15)}`,
  };
}

/**
 * Create a mock billing portal session
 */
export async function createMockBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  await new Promise(resolve => setTimeout(resolve, 300));

  return {
    url: `${window.location.origin}/account/billing?session=${Math.random().toString(36).substring(2, 15)}`,
  };
}

