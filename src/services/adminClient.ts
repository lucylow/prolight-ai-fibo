/**
 * Admin API Client
 * Handles admin operations like refund management
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface RefundRequest {
  id: string;
  tenant_id: string;
  user_id?: string;
  charge_id: string;
  amount_cents?: number;
  currency: string;
  reason?: string;
  status: string;
  admin_note?: string;
  stripe_refund_id?: string;
  created_at: string;
}

export interface ApproveRefundBody {
  amount_cents?: number;
  admin_note?: string;
}

export interface DenyRefundBody {
  admin_note?: string;
}

class AdminClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * List refund requests
   */
  async listRefunds(params?: { status?: string; q?: string }): Promise<RefundRequest[]> {
    const response = await axios.get(`${this.baseUrl}/api/admin/refunds`, { params });
    return response.data;
  }

  /**
   * Approve a refund request
   */
  async approveRefund(
    refundId: string,
    body: ApproveRefundBody
  ): Promise<RefundRequest> {
    const response = await axios.post(
      `${this.baseUrl}/api/admin/refunds/${refundId}/approve`,
      body
    );
    return response.data;
  }

  /**
   * Deny a refund request
   */
  async denyRefund(refundId: string, body: DenyRefundBody): Promise<RefundRequest> {
    const response = await axios.post(
      `${this.baseUrl}/api/admin/refunds/${refundId}/deny`,
      body
    );
    return response.data;
  }

  /**
   * Create a refund request (for users)
   */
  async createRefundRequest(
    tenantId: string,
    chargeId: string,
    amountCents?: number,
    reason?: string
  ): Promise<RefundRequest> {
    const response = await axios.post(
      `${this.baseUrl}/api/admin/refunds/create`,
      null,
      {
        params: {
          tenant_id: tenantId,
          charge_id: chargeId,
          amount_cents: amountCents,
          reason,
        },
      }
    );
    return response.data;
  }
}

export const adminClient = new AdminClient();
