// /lib/paystack.ts - Next.js Optimized Paystack Service Implementation
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

interface PaystackInitializePaymentParams {
  reference: string;
  amount: number; // in kobo (smallest currency unit)
  currency: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  callback_url?: string;
  metadata?: PaystackMetadata;
}

interface PaystackMetadata {
  orderId: string;
  userId: string;
  clerkId: string;
  custom_fields?: PaystackCustomField[];
  [key: string]: unknown; // Allow additional metadata fields
}

interface PaystackCustomField {
  display_name: string;
  variable_name: string;
  value: string;
}

interface PaystackAuthorization {
  authorization_code: string;
  bin: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  channel: string;
  card_type: string;
  bank: string;
  country_code: string;
  brand: string;
  reusable: boolean;
  signature: string;
  account_name: string | null;
}

interface PaystackCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  customer_code: string;
  phone: string;
  metadata: Record<string, unknown>;
  risk_action: string;
  international_format_phone: string | null;
}

interface PaystackTransactionData {
  id: string;
  domain: string;
  status: string;
  reference: string;
  amount: number;
  message: string | null;
  gateway_response: string;
  paid_at: string;
  created_at: string;
  channel: string;
  currency: string;
  ip_address: string;
  metadata: PaystackMetadata;
  log: Record<string, unknown>;
  fees: number;
  fees_split: Record<string, unknown>;
  authorization: PaystackAuthorization;
  customer: PaystackCustomer;
  plan: Record<string, unknown> | null;
  split: Record<string, unknown> | null;
  order_id: string | null;
  paidAt: string;
  createdAt: string;
  requested_amount: number;
  pos_transaction_data: Record<string, unknown> | null;
  source: Record<string, unknown> | null;
  fees_breakdown: Record<string, unknown> | null;
}

interface PaystackWebhookEvent {
  event: string;
  data: PaystackTransactionData;
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: PaystackTransactionData;
}

interface PaystackTransactionListParams {
  perPage?: number;
  page?: number;
  customer?: string;
  status?: string;
  from?: string;
  to?: string;
  amount?: number;
}

interface PaystackRefundPayload {
  transaction: string;
  amount?: number;
}

interface PaystackRefundResponse {
  status: boolean;
  message: string;
  data: {
    transaction: PaystackTransactionData;
    integration: number;
    deducted_amount: number;
    channel: string | null;
    merchant_note: string;
    customer_note: string;
    status: string;
    refunded_by: string;
    expected_at: string;
    currency: string;
    domain: string;
    amount: number;
    fully_deducted: boolean;
    id: number;
    createdAt: string;
    updatedAt: string;
  };
}

interface PaystackBankListResponse {
  status: boolean;
  message: string;
  data: Array<{
    id: number;
    name: string;
    slug: string;
    code: string;
    longcode: string;
    gateway: string | null;
    pay_with_bank: boolean;
    active: boolean;
    country: string;
    currency: string;
    type: string;
    is_deleted: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface PaystackCreateCustomerParams {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

interface PaystackCustomerResponse {
  status: boolean;
  message: string;
  data: PaystackCustomer;
}

interface PaystackWebhookProcessResult {
  processed: boolean;
  event: string;
  reference?: string;
  amount?: number;
  status: 'success' | 'failed' | 'pending';
}

type PaystackPaymentStatus = 'success' | 'failed' | 'pending' | 'abandoned';

class PaystackServiceImpl {
  private secretKey: string;
  private publicKey: string;
  private baseUrl = 'https://api.paystack.co';

  constructor() {
    // Check for environment variables (works in both server and client contexts)
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY || '';
    this.publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

    if (!this.secretKey) {
      console.warn('PAYSTACK_SECRET_KEY is not configured in environment variables');
    }

    if (!this.publicKey) {
      console.warn('NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is not configured in environment variables');
    }
  }

  private getAuthHeaders(): HeadersInit {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured. Please set PAYSTACK_SECRET_KEY in your environment variables.');
    }

    return {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest<T>(endpoint: string, method: 'GET' | 'POST' = 'POST', data?: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: this.getAuthHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error(`Paystack API Error [${endpoint}]:`, {
          status: response.status,
          message: errorMessage,
          data: responseData
        });
        throw new Error(`Paystack API Error: ${errorMessage}`);
      }

      return responseData;
    } catch (error) {
      console.error(`Paystack API request failed for ${endpoint}:`, error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error(`Unknown error occurred while calling Paystack API: ${endpoint}`);
    }
  }

  async initializePayment(params: PaystackInitializePaymentParams): Promise<PaystackInitializeResponse> {
    try {
      const payload = {
        reference: params.reference,
        amount: params.amount,
        currency: params.currency || 'NGN',
        email: params.email,
        ...(params.first_name && { first_name: params.first_name }),
        ...(params.last_name && { last_name: params.last_name }),
        ...(params.phone && { phone: params.phone }),
        ...(params.callback_url && { callback_url: params.callback_url }),
        ...(params.metadata && { metadata: params.metadata }),
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('Initializing Paystack payment:', {
          reference: payload.reference,
          amount: payload.amount,
          email: payload.email,
          currency: payload.currency
        });
      }

      const response = await this.makeRequest<PaystackInitializeResponse>('/transaction/initialize', 'POST', payload);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Paystack initialization successful:', {
          reference: response.data?.reference,
          authorization_url: response.data?.authorization_url ? '[URL_PROVIDED]' : undefined
        });
      }
      
      return response;
    } catch (error) {
      console.error('Paystack initialization error:', error);
      throw error;
    }
  }

  async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Verifying Paystack payment:', reference);
      }
      
      const response = await this.makeRequest<PaystackVerifyResponse>(`/transaction/verify/${reference}`, 'GET');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Paystack verification result:', {
          reference: response.data?.reference,
          status: response.data?.status,
          amount: response.data?.amount
        });
      }
      
      return response;
    } catch (error) {
      console.error('Paystack verification error:', error);
      throw error;
    }
  }

  async getTransaction(transactionId: string): Promise<PaystackVerifyResponse> {
    try {
      const response = await this.makeRequest<PaystackVerifyResponse>(`/transaction/${transactionId}`, 'GET');
      return response;
    } catch (error) {
      console.error('Paystack get transaction error:', error);
      throw error;
    }
  }

  async getAllTransactions(params?: PaystackTransactionListParams): Promise<{ data: PaystackTransactionData[] }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const endpoint = `/transaction${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.makeRequest<{ data: PaystackTransactionData[] }>(endpoint, 'GET');
      return response;
    } catch (error) {
      console.error('Paystack get transactions error:', error);
      throw error;
    }
  }

  async refundTransaction(transactionId: string, amount?: number): Promise<PaystackRefundResponse> {
    try {
      const payload: PaystackRefundPayload = {
        transaction: transactionId,
        ...(amount !== undefined && { amount })
      };

      const response = await this.makeRequest<PaystackRefundResponse>('/refund', 'POST', payload);
      return response;
    } catch (error) {
      console.error('Paystack refund error:', error);
      throw error;
    }
  }

  // Utility method to validate webhook signature
  validateWebhookSignature(payload: string, signature: string): boolean {
    if (!this.secretKey) {
      console.error('Cannot validate webhook signature: Paystack secret key is not configured');
      return false;
    }

    try {
      const hash = crypto.createHmac('sha512', this.secretKey).update(payload).digest('hex');
      return hash === signature;
    } catch (error) {
      console.error('Error validating webhook signature:', error);
      return false;
    }
  }

  // Process webhook event
  processWebhookEvent(event: PaystackWebhookEvent): PaystackWebhookProcessResult {
    switch (event.event) {
      case 'charge.success':
        return this.handleChargeSuccess(event.data);
      case 'charge.failed':
        return this.handleChargeFailed(event.data);
      case 'transfer.success':
        return this.handleTransferSuccess(event.data);
      case 'transfer.failed':
        return this.handleTransferFailed(event.data);
      default:
        if (process.env.NODE_ENV === 'development') {
          console.log('Unhandled webhook event:', event.event);
        }
        return { processed: false, event: event.event, status: 'pending' };
    }
  }

  private handleChargeSuccess(data: PaystackTransactionData): PaystackWebhookProcessResult {
    console.log('Processing successful charge:', data.reference);
    return {
      processed: true,
      event: 'charge.success',
      reference: data.reference,
      amount: data.amount,
      status: 'success'
    };
  }

  private handleChargeFailed(data: PaystackTransactionData): PaystackWebhookProcessResult {
    console.log('Processing failed charge:', data.reference);
    return {
      processed: true,
      event: 'charge.failed',
      reference: data.reference,
      amount: data.amount,
      status: 'failed'
    };
  }

  private handleTransferSuccess(data: PaystackTransactionData): PaystackWebhookProcessResult {
    console.log('Processing successful transfer:', data.reference);
    return {
      processed: true,
      event: 'transfer.success',
      reference: data.reference,
      status: 'success'
    };
  }

  private handleTransferFailed(data: PaystackTransactionData): PaystackWebhookProcessResult {
    console.log('Processing failed transfer:', data.reference);
    return {
      processed: true,
      event: 'transfer.failed',
      reference: data.reference,
      status: 'failed'
    };
  }

  // Helper method to format amount from kobo to naira
  formatAmount(amountInKobo: number): number {
    return amountInKobo / 100;
  }

  // Helper method to format amount from naira to kobo
  formatAmountToKobo(amountInNaira: number): number {
    return Math.round(amountInNaira * 100);
  }

  // Get supported banks
  async getBanks(country: string = 'nigeria'): Promise<PaystackBankListResponse> {
    try {
      const response = await this.makeRequest<PaystackBankListResponse>(`/bank?country=${country}`, 'GET');
      return response;
    } catch (error) {
      console.error('Paystack get banks error:', error);
      throw error;
    }
  }

  // Create customer
  async createCustomer(params: PaystackCreateCustomerParams): Promise<PaystackCustomerResponse> {
    try {
      const response = await this.makeRequest<PaystackCustomerResponse>('/customer', 'POST', params);
      return response;
    } catch (error) {
      console.error('Paystack create customer error:', error);
      throw error;
    }
  }

  // Get customer
  async getCustomer(emailOrCode: string): Promise<PaystackCustomerResponse> {
    try {
      const response = await this.makeRequest<PaystackCustomerResponse>(`/customer/${emailOrCode}`, 'GET');
      return response;
    } catch (error) {
      console.error('Paystack get customer error:', error);
      throw error;
    }
  }

  // Generate payment reference
  generatePaymentReference(prefix: string = 'PAY'): string {
    const timestamp = Date.now().toString(36);
    const randomId = uuidv4().split('-')[0];
    return `${prefix}_${timestamp}_${randomId}`.toUpperCase();
  }

  // Validate payment amount (minimum 100 kobo = 1 NGN)
  validateAmount(amountInKobo: number): boolean {
    return Number.isInteger(amountInKobo) && amountInKobo >= 100;
  }

  // Get payment status from Paystack response
  getPaymentStatus(response: PaystackVerifyResponse): PaystackPaymentStatus {
    if (!response || !response.data) return 'failed';
    
    const status = response.data.status?.toLowerCase();
    
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'failed';
      case 'pending':
        return 'pending';
      case 'abandoned':
        return 'abandoned';
      default:
        return 'failed';
    }
  }

  // Get public key for client-side use
  getPublicKey(): string {
    return this.publicKey;
  }

  // Check if service is properly configured
  isConfigured(): boolean {
    return !!(this.secretKey && this.publicKey);
  }

  // Get callback URL for the current environment
  getCallbackUrl(path: string = '/payment/callback'): string {
    if (typeof window !== 'undefined') {
      // Client-side
      return `${window.location.origin}${path}`;
    }
    
    // Server-side - use environment variable or default
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    return `${baseUrl}${path}`;
  }
}

// Create and export singleton instance
export const paystackService = new PaystackServiceImpl();

// Export types for use in other files
export type { 
  PaystackInitializePaymentParams, 
  PaystackWebhookEvent,
  PaystackVerifyResponse,
  PaystackTransactionData,
  PaystackMetadata,
  PaystackCustomField,
  PaystackWebhookProcessResult,
  PaystackPaymentStatus,
  PaystackCreateCustomerParams,
  PaystackTransactionListParams
};