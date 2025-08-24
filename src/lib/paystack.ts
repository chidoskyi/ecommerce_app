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
  metadata?: {
    orderId: string;
    userId: string;
    clerkId: string;
    custom_fields?: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
  };
}

interface PaystackWebhookEvent {
  event: string;
  data: {
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
    metadata: any;
    log: any;
    fees: number;
    fees_split: any;
    authorization: {
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
    };
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
      metadata: any;
      risk_action: string;
      international_format_phone: string | null;
    };
    plan: any;
    split: any;
    order_id: string | null;
    paidAt: string;
    createdAt: string;
    requested_amount: number;
    pos_transaction_data: any;
    source: any;
    fees_breakdown: any;
  };
}

class PaystackService {
  private paystack: any;
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY!;

    if (!this.secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured in environment variables');
    }

    // Initialize Paystack with secret key
    this.paystack = Paystack(this.secretKey);
  }

  async initializePayment(params: PaystackInitializePaymentParams) {
    try {
      const payload = {
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
        Object.entries(payload).filter(([_, value]) => value !== undefined)
      );

      console.log('Initializing Paystack payment with payload:', JSON.stringify(cleanPayload, null, 2));

      const response = await this.paystack.transaction.initialize(cleanPayload);
      
      console.log('Paystack initialization response:', JSON.stringify(response, null, 2));
      
      return response;
    } catch (error) {
      console.error('Paystack initialization error:', error);
      throw error;
    }
  }

  async verifyPayment(reference: string) {
    try {
      console.log('Verifying Paystack payment:', reference);
      
      const response = await this.paystack.transaction.verify(reference);
      
      console.log('Paystack verification response:', JSON.stringify(response, null, 2));
      
      return response;
    } catch (error) {
      console.error('Paystack verification error:', error);
      throw error;
    }
  }

  async getTransaction(transactionId: string) {
    try {
      const response = await this.paystack.transaction.get(transactionId);
      return response;
    } catch (error) {
      console.error('Paystack get transaction error:', error);
      throw error;
    }
  }

  async getAllTransactions(params?: {
    perPage?: number;
    page?: number;
    customer?: string;
    status?: string;
    from?: string;
    to?: string;
    amount?: number;
  }) {
    try {
      const response = await this.paystack.transaction.list(params);
      return response;
    } catch (error) {
      console.error('Paystack get transactions error:', error);
      throw error;
    }
  }

  async refundTransaction(transactionId: string, amount?: number) {
    try {
      const payload: any = {
        transaction: transactionId
      };
      
      if (amount !== undefined) {
        payload.amount = amount;
      }

      const response = await this.paystack.refund.create(payload);
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
  processWebhookEvent(event: PaystackWebhookEvent) {
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
        return { processed: false, event: event.event };
    }
  }

  private handleChargeSuccess(data: any) {
    console.log('Processing successful charge:', data.reference);
    return {
      processed: true,
      event: 'charge.success',
      reference: data.reference,
      amount: data.amount,
      status: 'success'
    };
  }

  private handleChargeFailed(data: any) {
    console.log('Processing failed charge:', data.reference);
    return {
      processed: true,
      event: 'charge.failed',
      reference: data.reference,
      amount: data.amount,
      status: 'failed'
    };
  }

  private handleTransferSuccess(data: any) {
    console.log('Processing successful transfer:', data.reference);
    return {
      processed: true,
      event: 'transfer.success',
      reference: data.reference,
      status: 'success'
    };
  }

  private handleTransferFailed(data: any) {
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
  async getBanks(country: string = 'nigeria') {
    try {
      const response = await this.paystack.misc.list_banks({ country });
      return response;
    } catch (error) {
      console.error('Paystack get banks error:', error);
      throw error;
    }
  }

  // Create customer
  async createCustomer(params: {
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    metadata?: any;
  }) {
    try {
      const response = await this.paystack.customer.create(params);
      return response;
    } catch (error) {
      console.error('Paystack create customer error:', error);
      throw error;
    }
  }

  // Get customer
  async getCustomer(emailOrCode: string) {
    try {
      const response = await this.paystack.customer.get(emailOrCode);
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
  getPaymentStatus(response: any): 'success' | 'failed' | 'pending' | 'abandoned' {
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
export const paystackService = new PaystackService();

// Export types for use in other files
export type { PaystackInitializePaymentParams, PaystackWebhookEvent };
