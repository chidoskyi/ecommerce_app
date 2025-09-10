// src/lib/opay.ts
import axios, { AxiosError } from 'axios'
import sha512 from 'js-sha512'

export interface OpayPaymentRequest {
  reference: string
  amount: number
  currency: string
  country: string
  userPhone: string
  userEmail: string
  userName: string
  callbackUrl: string
  returnUrl: string
}

export interface OpayAmount {
  total: number
  currency: string
}

export interface OpayVat {
  total: number
  currency: string
}

export interface OpayPaymentResponse {
  code: string
  message: string
  success: boolean
  data: {
    reference: string
    orderNo: string
    cashierUrl: string
    status: string
    amount: OpayAmount
    vat: OpayVat
  }
}

export interface OpayVerifyPaymentParams {
  reference?: string
  orderNo?: string
  country: string
}

export type OpayPaymentStatus = 'INITIAL' | 'PENDING' | 'SUCCESS' | 'FAIL' | 'CLOSE'

export interface OpayVerifyResponse {
  code: string
  message: string
  success: boolean
  data?: {
    reference: string
    orderNo: string
    status: OpayPaymentStatus
    amount: OpayAmount
    vat?: OpayVat
    createTime: number
    failureCode?: string
    failureReason?: string
    isVoided?: boolean
  }
}

// Internal interfaces for request payloads
interface OpayUserInfo {
  userId: string
  userName: string
  userMobile: string
  userEmail: string
}

interface OpayProduct {
  name: string
  description: string
}

interface OpayCreatePaymentRequest {
  country: string
  reference: string
  amount: OpayAmount
  returnUrl: string
  callbackUrl: string
  expireAt: number
  userInfo: OpayUserInfo
  product: OpayProduct
}

export interface OpayVerifyRequest {
  reference?: string;
  orderNo?: string;
  country?: string;
  // Add index signature
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface OpayErrorResponse {
  code: string
  message: string
}

interface OpayAxiosErrorData {
  message?: string
  code?: string
}

class OpayService {
  private baseUrl: string
  private privateKey: string
  private publicKey: string
  private merchantId: string

  constructor() {
    // Use the correct URLs from documentation
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://liveapi.opaycheckout.com'
      : 'https://testapi.opaycheckout.com'
    
    // Need both keys for different operations
    this.privateKey = process.env.OPAY_PRIVATE_KEY!
    this.publicKey = process.env.OPAY_PUBLIC_KEY!
    this.merchantId = process.env.OPAY_MERCHANT_ID!

    if (!this.privateKey || !this.publicKey || !this.merchantId) {
      throw new Error('Missing required Opay environment variables: OPAY_PRIVATE_KEY, OPAY_PUBLIC_KEY, and OPAY_MERCHANT_ID')
    }
  }

  // Generate signature for payment status queries (uses private key)
  private generateHMACSignature(data: Record<string, unknown>): string {
    const jsonString = JSON.stringify(data)
    const hash = sha512.hmac.create(this.privateKey)
    hash.update(jsonString)
    return hash.hex()
  }

  // Generate authorization for payment creation (uses public key)  
  private generatePaymentAuthorization(): string {
    return `Bearer ${this.publicKey}`
  }

  private isAxiosError(error: unknown): error is AxiosError<OpayAxiosErrorData> {
    return axios.isAxiosError(error)
  }

  private handleOpayError(error: unknown, operation: string): never {
    console.error(`Opay ${operation} error details:`, error)

    if (this.isAxiosError(error)) {
      console.error('Axios error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      })

      // More detailed error message
      if (error.response?.data) {
        const errorData = error.response.data
        throw new Error(`Opay API error: ${errorData.message || errorData.code || 'Unknown error'} (HTTP ${error.response.status})`)
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to Opay API - check your internet connection')
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('Opay API request timed out')
      } else {
        throw new Error(`Opay ${operation} failed: ${error.message}`)
      }
    }

    // Handle non-Axios errors
    if (error instanceof Error) {
      throw new Error(`Opay ${operation} failed: ${error.message}`)
    }

    throw new Error(`Opay ${operation} failed: Unknown error`)
  }

  async initializePayment(paymentData: OpayPaymentRequest): Promise<OpayPaymentResponse> {
    // Build request payload according to Opay documentation
    const requestData: OpayCreatePaymentRequest = {
      country: paymentData.country,
      reference: paymentData.reference,
      amount: {
        total: paymentData.amount, // Amount should already be in kobo
        currency: paymentData.currency
      },
      returnUrl: paymentData.returnUrl,
      callbackUrl: paymentData.callbackUrl,
      expireAt: 30, // 30 minutes expiration
      userInfo: {
        userId: paymentData.userEmail, // Use email as userId
        userName: paymentData.userName,
        userMobile: paymentData.userPhone,
        userEmail: paymentData.userEmail
      },
      product: {
        name: 'Ecommerce Purchase',
        description: 'Purchase from our store'
      }
    }

    // Generate authorization for payment creation (uses public key)
    const authorization = this.generatePaymentAuthorization()

    console.log('Opay request data:', JSON.stringify(requestData, null, 2))
    console.log('Using base URL:', this.baseUrl)
    console.log('Merchant ID:', this.merchantId)
    console.log('Using public key authorization for payment creation')

    try {
      const response = await axios.post<OpayPaymentResponse>(
        `${this.baseUrl}/api/v1/international/cashier/create`, // Correct endpoint from docs
        requestData,
        {
          headers: {
            'Authorization': authorization, // Use public key for payment creation
            'MerchantId': this.merchantId,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      )

      console.log('Opay raw response:', response.data)

      // Check if response is successful according to Opay format
      if (response.data.code !== '00000') {
        throw new Error(`Opay API error: ${response.data.message || 'Unknown error'} (Code: ${response.data.code})`)
      }

      return response.data

    } catch (error) {
      this.handleOpayError(error, 'payment initialization')
    }
  }

  async verifyPayment(params: OpayVerifyPaymentParams): Promise<OpayVerifyResponse> {
    const { reference, orderNo, country } = params
    
    if (!reference && !orderNo) {
      throw new Error('Either reference or orderNo is required')
    }

    // Build request body as per documentation
    const requestBody: OpayVerifyRequest = { country }
    
    if (reference) {
      requestBody.reference = reference
    } else if (orderNo) {
      requestBody.orderNo = orderNo
    }

    // Generate HMAC signature for verification request (uses private key)
    const signature = this.generateHMACSignature(requestBody)

    console.log('Opay verify request:', JSON.stringify(requestBody, null, 2))
    console.log('Verify signature generated with private key:', signature)

    try {
      const response = await axios.post<OpayVerifyResponse>(
        `${this.baseUrl}/api/v1/international/cashier/status`, // Correct endpoint from docs
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${signature}`, // Use HMAC signature for verification
            'MerchantId': this.merchantId,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )

      console.log('Opay verify response:', response.data)

      return response.data

    } catch (error) {
      this.handleOpayError(error, 'payment verification')
    }
  }
}

export const opayService = new OpayService()