#!/usr/bin/env node

/**
 * API Flow Test Script
 * Tests the complete checkout to payment flow
 */

const BASE_URL = 'http://localhost:3000/api';

// Mock data for testing
const testData = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+2348012345678'
  },
  shippingAddress: {
    firstName: 'John',
    lastName: 'Doe',
    address: '123 Test Street',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    zip: '100001',
    phone: '+2348012345678'
  },
  cartItems: [
    {
      productId: 'test-product-1',
      quantity: 2,
      price: 1500
    },
    {
      productId: 'test-product-2',
      quantity: 1,
      price: 2500
    }
  ]
};

class APITester {
  constructor() {
    this.authToken = null;
    this.results = [];
  }

  async log(message, status = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${status}: ${message}`;
    console.log(logMessage);
    this.results.push({ timestamp, status, message });
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
      }
    };

    const requestOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, requestOptions);
      const data = await response.json();
      
      return {
        status: response.status,
        ok: response.ok,
        data
      };
    } catch (error) {
      return {
        status: 0,
        ok: false,
        error: error.message
      };
    }
  }

  async testCheckoutFlow() {
    await this.log('Starting Checkout Flow Test', 'TEST');

    // Test 1: Main checkout with Opay
    await this.log('Testing main checkout endpoint with Opay payment');
    const checkoutData = {
      items: testData.cartItems,
      shippingAddress: testData.shippingAddress,
      paymentMethod: 'opay',
      subtotal: 5500,
      taxAmount: 550,
      shippingAmount: 1000,
      discountAmount: 0,
      currency: 'NGN'
    };

    const checkoutResponse = await this.makeRequest('/checkout', {
      method: 'POST',
      body: JSON.stringify(checkoutData)
    });

    if (checkoutResponse.ok) {
      await this.log('✅ Checkout successful', 'SUCCESS');
      await this.log(`Order ID: ${checkoutResponse.data.order?.id}`);
      await this.log(`Payment URL: ${checkoutResponse.data.paymentUrl}`);
      return checkoutResponse.data;
    } else {
      await this.log(`❌ Checkout failed: ${checkoutResponse.data.error}`, 'ERROR');
      return null;
    }
  }

  async testCODCheckout() {
    await this.log('Testing Cash on Delivery checkout');
    
    const codData = {
      items: testData.cartItems,
      shippingAddress: testData.shippingAddress,
      paymentMethod: 'cod',
      subtotal: 5500,
      taxAmount: 550,
      shippingAmount: 1000,
      discountAmount: 0,
      currency: 'NGN'
    };

    const response = await this.makeRequest('/checkout', {
      method: 'POST',
      body: JSON.stringify(codData)
    });

    if (response.ok) {
      await this.log('✅ COD checkout successful', 'SUCCESS');
      return response.data;
    } else {
      await this.log(`❌ COD checkout failed: ${response.data.error}`, 'ERROR');
      return null;
    }
  }

  async testBankTransferCheckout() {
    await this.log('Testing Bank Transfer checkout');
    
    const bankTransferData = {
      items: testData.cartItems,
      shippingAddress: testData.shippingAddress,
      paymentMethod: 'bank_transfer',
      subtotal: 5500,
      taxAmount: 550,
      shippingAmount: 1000,
      discountAmount: 0,
      currency: 'NGN'
    };

    const response = await this.makeRequest('/checkout', {
      method: 'POST',
      body: JSON.stringify(bankTransferData)
    });

    if (response.ok) {
      await this.log('✅ Bank transfer checkout successful', 'SUCCESS');
      await this.log(`Bank Details: ${JSON.stringify(response.data.invoice?.bankDetails)}`);
      return response.data;
    } else {
      await this.log(`❌ Bank transfer checkout failed: ${response.data.error}`, 'ERROR');
      return null;
    }
  }

  async testPaymentCallback(paymentReference) {
    await this.log('Testing payment callback verification');
    
    const response = await this.makeRequest(`/payments/opay/callback?reference=${paymentReference}`, {
      method: 'GET'
    });

    if (response.ok) {
      await this.log('✅ Payment verification successful', 'SUCCESS');
      return response.data;
    } else {
      await this.log(`❌ Payment verification failed: ${response.data.error}`, 'ERROR');
      return null;
    }
  }

  async testOrdersAPI() {
    await this.log('Testing Orders API');
    
    // Test GET orders
    const ordersResponse = await this.makeRequest('/orders');
    
    if (ordersResponse.ok) {
      await this.log('✅ Orders retrieval successful', 'SUCCESS');
      await this.log(`Found ${ordersResponse.data.data?.length || 0} orders`);
    } else {
      await this.log(`❌ Orders retrieval failed: ${ordersResponse.data.error}`, 'ERROR');
    }

    return ordersResponse.data;
  }

  async testInvoiceAPI(orderId) {
    if (!orderId) {
      await this.log('Skipping invoice test - no order ID provided', 'SKIP');
      return;
    }

    await this.log('Testing Invoice API');
    
    const response = await this.makeRequest(`/invoice?orderId=${orderId}`);
    
    if (response.ok) {
      await this.log('✅ Invoice retrieval successful', 'SUCCESS');
      return response.data;
    } else {
      await this.log(`❌ Invoice retrieval failed: ${response.data.error}`, 'ERROR');
      return null;
    }
  }

  async runAllTests() {
    await this.log('🚀 Starting API Flow Tests', 'START');
    
    try {
      // Test different checkout methods
      const opayCheckout = await this.testCheckoutFlow();
      const codCheckout = await this.testCODCheckout();
      const bankTransferCheckout = await this.testBankTransferCheckout();

      // Test orders API
      await this.testOrdersAPI();

      // Test invoice API if we have an order
      if (opayCheckout?.order?.id) {
        await this.testInvoiceAPI(opayCheckout.order.id);
      }

      // Test payment verification (this will fail without actual payment)
      if (opayCheckout?.paymentReference) {
        await this.testPaymentCallback(opayCheckout.paymentReference);
      }

      await this.log('🎉 All tests completed', 'COMPLETE');
      
    } catch (error) {
      await this.log(`💥 Test suite failed: ${error.message}`, 'FATAL');
    }

    // Print summary
    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('TEST SUMMARY');
    console.log('='.repeat(50));
    
    const summary = this.results.reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    }, {});

    Object.entries(summary).forEach(([status, count]) => {
      console.log(`${status}: ${count}`);
    });

    console.log('\nNOTE: Some tests may fail due to authentication requirements.');
    console.log('This script tests the API structure and basic functionality.');
    console.log('For full testing, implement proper authentication and test data setup.');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new APITester();
  tester.runAllTests().catch(console.error);
}

module.exports = APITester;