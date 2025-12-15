/**
 * Stripe API Client
 * Handles payment processing, checkout sessions, and billing portal
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface CreateCheckoutSessionRequest {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  coupon?: string;
  mode?: 'subscription' | 'payment';
}

export interface CheckoutSessionResponse {
  id: string;
  url: string;
}

export interface CreatePortalSessionRequest {
  customerId: string;
  returnUrl: string;
}

export interface PortalSessionResponse {
  url: string;
}

export interface Invoice {
  id: string;
  amount_paid: number;
  currency: string;
  status: string;
  hosted_invoice_url: string;
  period_start: number;
  period_end: number;
  created: number;
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
}

export interface RefundRequest {
  charge_id: string;
  amount_cents?: number;
  reason?: string;
}

export interface RefundResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
  charge: string;
}

class StripeClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Create a Stripe Checkout Session
   */
  async createCheckoutSession(
    request: CreateCheckoutSessionRequest
  ): Promise<CheckoutSessionResponse> {
    const response = await axios.post(
      `${this.baseUrl}/api/stripe/create-checkout-session`,
      request
    );
    return response.data;
  }

  /**
   * Create a Customer Portal Session
   */
  async createPortalSession(
    request: CreatePortalSessionRequest
  ): Promise<PortalSessionResponse> {
    const response = await axios.post(
      `${this.baseUrl}/api/stripe/create-portal-session`,
      request
    );
    return response.data;
  }

  /**
   * Get invoice history for a customer
   */
  async getInvoices(customerId: string, limit: number = 12): Promise<InvoiceListResponse> {
    const response = await axios.get(
      `${this.baseUrl}/api/billing/invoices/${customerId}`,
      { params: { limit } }
    );
    return response.data;
  }

  /**
   * Create a refund request
   */
  async createRefund(request: RefundRequest): Promise<RefundResponse> {
    const response = await axios.post(
      `${this.baseUrl}/api/billing/refund`,
      request
    );
    return response.data;
  }
}

export const stripeClient = new StripeClient();

