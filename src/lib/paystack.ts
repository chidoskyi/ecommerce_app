// /lib/paystack.ts - Enhanced Paystack Service Implementation
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

// Note: Install the official Paystack SDK: npm install paystack
import Paystack from 'paystack'

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

interface PaystackService {
  initializePayment(params: PaystackInitializePaymentParams): Promise<PaystackInitializeResponse>;
  verifyPayment(reference: string): Promise<PaystackVerifyResponse>;
  getTransaction(transactionId: string): Promise<PaystackVerifyResponse>;
  getAllTransactions(params?: PaystackTransactionListParams): Promise<{ data: PaystackTransactionData[] }>;
  refundTransaction(transactionId: string, amount?: number): Promise<PaystackRefundResponse>;
  getBanks(country?: string): Promise<PaystackBankListResponse>;
  createCustomer(params: PaystackCreateCustomerParams): Promise<PaystackCustomerResponse>;
  getCustomer(emailOrCode: string): Promise<PaystackCustomerResponse>;
}

class PaystackServiceImpl implements PaystackService {
  private paystack: PaystackService;
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY!;

    if (!this.secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured in environment variables');
    }

    // Initialize Paystack with secret key
    this.paystack = Paystack(this.secretKey);
  }

  async initializePayment(params: PaystackInitializePaymentParams): Promise<PaystackInitializeResponse> {
    try {
      const payload: Partial<PaystackInitializePaymentParams> = {
        reference: params.reference,
        amount: params.amount,
        currency: params.currency || 'NGN',
        email: params.email,
        first_name: params.first_name,
        last_name: params.last_name,
        phone: params.phone,
        callback_url: params.callback_url,
        metadata: params.metadata
      };

      // Remove undefined values
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
      ) as PaystackInitializePaymentParams;

      console.log('Initializing Paystack payment with payload:', JSON.stringify(cleanPayload, null, 2));

      const response = await this.paystack.initializePayment(cleanPayload);
      
      console.log('Paystack initialization response:', JSON.stringify(response, null, 2));
      
      return response;
    } catch (error) {
      console.error('Paystack initialization error:', error);
      throw error;
    }
  }

  async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
    try {
      console.log('Verifying Paystack payment:', reference);
      
      const response = await this.paystack.verifyPayment(reference);
      
      console.log('Paystack verification response:', JSON.stringify(response, null, 2));
      
      return response;
    } catch (error) {
      console.error('Paystack verification error:', error);
      throw error;
    }
  }

  async getTransaction(transactionId: string): Promise<PaystackVerifyResponse> {
    try {
      const response = await this.paystack.getTransaction(transactionId);
      return response;
    } catch (error) {
      console.error('Paystack get transaction error:', error);
      throw error;
    }
  }

  async getAllTransactions(params?: PaystackTransactionListParams): Promise<{ data: PaystackTransactionData[] }> {
    try {
      const response = await this.paystack.getAllTransactions(params);
      return response;
    } catch (error) {
      console.error('Paystack get transactions error:', error);
      throw error;
    }
  }

  async refundTransaction(transactionId: string, amount?: number): Promise<PaystackRefundResponse> {
    try {
      const payload: PaystackRefundPayload = {
        transaction: transactionId
      };
      
      if (amount !== undefined) {
        payload.amount = amount;
      }

      const response = await this.paystack.refundTransaction(transactionId, amount);
      return response;
    } catch (error) {
      console.error('Paystack refund error:', error);
      throw error;
    }
  }

  // Utility method to validate webhook signature
  validateWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto.createHmac('sha512', this.secretKey).update(payload).digest('hex');
    return hash === signature;
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
        console.log('Unhandled webhook event:', event.event);
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
      const response = await this.paystack.getBanks(country);
      return response;
    } catch (error) {
      console.error('Paystack get banks error:', error);
      throw error;
    }
  }

  // Create customer
  async createCustomer(params: PaystackCreateCustomerParams): Promise<PaystackCustomerResponse> {
    try {
      const response = await this.paystack.createCustomer(params);
      return response;
    } catch (error) {
      console.error('Paystack create customer error:', error);
      throw error;
    }
  }

  // Get customer
  async getCustomer(emailOrCode: string): Promise<PaystackCustomerResponse> {
    try {
      const response = await this.paystack.getCustomer(emailOrCode);
      return response;
    } catch (error) {
      console.error('Paystack get customer error:', error);
      throw error;
    }
  }

  // Generate payment reference
  generatePaymentReference(prefix: string = 'PAY'): string {
    return `${prefix}_${uuidv4()}`;
  }

  // Validate payment amount (minimum 100 kobo = 1 NGN)
  validateAmount(amountInKobo: number): boolean {
    return amountInKobo >= 100;
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