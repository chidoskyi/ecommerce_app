// src/lib/wallet.ts - Updated with proper TypeScript types
import prisma from '@/lib/prisma'
import { paystackService } from './paystack'
import { nanoid } from 'nanoid'
import { UserWallet, WalletTransaction, User } from '@prisma/client'

export interface WalletDepositParams {
  userId: string
  clerkId: string
  amount: number
  currency?: string
  callbackUrl: string
}

export interface WalletPaymentParams {
  fromUserId: string
  toUserId: string
  amount: number
  description?: string
  orderId?: string 
}

export interface WalletBalanceResponse {
  balance: number
  currency: string
  isActive: boolean
  lastActivity: Date | null
}

export interface WalletWithRelations extends UserWallet {
  user: User
  transactions: WalletTransaction[]
}

export interface DepositInitializationResult {
  transaction: WalletTransaction
  paymentUrl: string
  reference: string
  accessCode: string
  transactionId: string
}

export interface DepositVerificationResult {
  status: 'verified' | 'already_verified' | 'previously_failed' | 'failed'
  transaction?: WalletTransaction
  wallet?: UserWallet
  message: string
  paystackResponse?: unknown
}

export interface PaymentResult {
  paymentTransaction: WalletTransaction
  incomeTransaction: WalletTransaction | null
  senderWallet: UserWallet
  receiverWallet: UserWallet | null
}

export interface TransactionHistory {
  transactions: (WalletTransaction & {
    wallet: UserWallet
    user: { id: string; email: string; clerkId: string | null }
  })[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface TransactionWithRelations extends WalletTransaction {
  wallet: UserWallet
  user: { id: string; email: string; clerkId: string | null }
}

export interface WebhookProcessResult {
  processed: boolean
  event?: string
  reference?: string
  status?: string
}

class WalletService {

  // Create a new wallet for a user
  async createWallet(userId: string, clerkId: string): Promise<UserWallet> {
    try {
      const wallet = await prisma.userWallet.create({
        data: {
          userId,
          clerkId,
          balance: 0.0,
          currency: 'NGN',
          isActive: true,
          lastActivity: new Date(),
          pin: null
        }
      })
      return wallet;
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw new Error('Failed to create wallet');
    }
  }
  
  // Create or get user wallet
  async getOrCreateWallet(userId: string, clerkId?: string): Promise<WalletWithRelations> {
    try {
      let wallet = await prisma.userWallet.findUnique({
        where: { 
          userId: userId,
          ...(clerkId && { clerkId })
        },
        include: { 
          user: true,
          transactions: true
        }
      })

      if (!wallet) {
        if (!clerkId) {
          throw new Error('ClerkId is required when creating a new wallet');
        }

        wallet = await prisma.userWallet.create({
          data: {
            userId: userId,
            clerkId: clerkId,
            balance: 0.0,
            currency: 'NGN',
            isActive: true,
            lastActivity: new Date(),
            pin: null
          },
          include: { 
            user: true,
            transactions: true
          }
        })
      }

      return wallet;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Detailed wallet creation error:', {
          message: error.message,
          stack: error.stack,
          // Prisma-specific error properties
          ...(('code' in error) && { code: error.code }),
          ...(('meta' in error) && { meta: error.meta })
        });
        throw new Error(`Failed to get or create wallet: ${error.message}`);
      }
      
      console.error('Unknown wallet creation error:', error);
      throw new Error('Failed to get or create wallet: Unknown error occurred');
    }
  }

  // Get wallet balance
  async getWalletBalance(userId: string, clerkId: string): Promise<WalletBalanceResponse> {
    try {
      const wallet = await this.getOrCreateWallet(userId, clerkId)
      
      return {
        balance: wallet.balance,
        currency: wallet.currency,
        isActive: wallet.isActive,
        lastActivity: wallet.lastActivity
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get wallet balance: ${errorMessage}`)
    }
  }

  // Initialize wallet deposit via Paystack
  async initializeDeposit(params: WalletDepositParams): Promise<DepositInitializationResult> {
    const { userId, clerkId, amount, currency = 'NGN', callbackUrl } = params;
  
    try {
      const wallet = await this.getOrCreateWallet(userId, clerkId);
      const user = wallet.user;
      
      // Generate unique reference and transaction ID
      const reference = `WD_${nanoid(12)}_${Date.now()}`;
      const amountInKobo = paystackService.formatAmountToKobo(amount);

      // Validate amount (minimum 1 NGN = 100 kobo)
      if (!paystackService.validateAmount(amountInKobo)) {
        throw new Error('Minimum deposit amount is ₦1.00');
      }

      // Create wallet transaction record for deposit
      const walletTransaction = await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: userId,
          type: 'WALLET_TOPUP',
          amount: amount,
          currency: currency,
          status: 'PENDING',
          reference: reference,
          description: `Wallet deposit via Paystack`,
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance, // Will be updated after successful payment
          metadata: {
            paymentMethod: 'paystack',
            provider: 'paystack',
            walletId: wallet.id
          }
        }
      });

      // Initialize Paystack payment
      const paystackResponse = await paystackService.initializePayment({
        reference: reference,
        amount: amountInKobo,
        currency: currency,
        email: user.email,
        first_name: user.firstName?.split(' ')[0] || user.email.split('@')[0],
        last_name: user.lastName?.split(' ').slice(1).join(' ') || '',
        phone: user.phone || '',
        callback_url: callbackUrl,
        metadata: {
          orderId: walletTransaction.id,
          userId: userId,
          clerkId: user.clerkId || userId,
          custom_fields: [
            {
              display_name: "Transaction Type",
              variable_name: "transaction_type",
              value: "wallet_deposit"
            }
          ]
        }
      });

      // Update wallet transaction with provider data
      await prisma.walletTransaction.update({
        where: { id: walletTransaction.id },
        data: {
          metadata: {
            ...(walletTransaction.metadata as Record<string, unknown> || {}),
            paystackResponse: paystackResponse.data
          }
        }
      });

      return {
        transaction: walletTransaction,
        paymentUrl: paystackResponse.data.authorization_url,
        reference: reference,
        accessCode: paystackResponse.data.access_code,
        transactionId: walletTransaction.id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('Deposit initialization failed:', {
        userId,
        amount,
        error: errorMessage,
        stack: errorStack
      });
      throw new Error(`Failed to initialize deposit: ${errorMessage}`);
    }
  }

  // Verify and complete deposit
  async verifyDeposit(reference: string): Promise<DepositVerificationResult> {
    try {
      // Get wallet transaction
      const walletTransaction = await prisma.walletTransaction.findFirst({
        where: { reference },
        include: { 
          wallet: {
            include: {
              user: true
            }
          }
        }
      });
  
      if (!walletTransaction) {
        throw new Error('Transaction not found');
      }
  
      // Handle different status cases
      switch (walletTransaction.status) {
        case 'SUCCESS':
          return { 
            status: 'already_verified', 
            transaction: walletTransaction,
            message: 'Deposit already verified and processed'
          };
          
        case 'FAILED':
          return {
            status: 'previously_failed',
            transaction: walletTransaction,
            message: 'Deposit previously failed verification'
          };
      }
  
      // Verify with Paystack
      const verifyResponse = await paystackService.verifyPayment(reference);
      const paymentStatus = paystackService.getPaymentStatus(verifyResponse);
  
      console.log('Paystack Verification Response:', verifyResponse);
  
      if (paymentStatus === 'success') {
        // Successful verification - update records in transaction
        const result = await prisma.$transaction(async (tx) => {
          const updatedWalletTransaction = await tx.walletTransaction.update({
            where: { id: walletTransaction.id },
            data: {
              status: 'SUCCESS',
              balanceAfter: walletTransaction.balanceBefore + walletTransaction.amount,
              metadata: {
                ...(walletTransaction.metadata as Record<string, unknown> || {}),
                verifiedAt: new Date().toISOString(),
                paystackResponse: JSON.parse(JSON.stringify(verifyResponse.data)) // Serialize to ensure JSON compatibility
              }
            }
          });
  
          const updatedWallet = await tx.userWallet.update({
            where: { id: walletTransaction.walletId },
            data: {
              balance: { increment: walletTransaction.amount },
              lastActivity: new Date()
            }
          });
  
          return { 
            transaction: updatedWalletTransaction, 
            wallet: updatedWallet 
          };
        });
  
        return { 
          status: 'verified', 
          ...result,
          message: 'Deposit successfully verified and credited to wallet'
        };
      } else {
        // Failed verification
        const failureReason = verifyResponse.data?.gateway_response || 
                            verifyResponse.message || 
                            'Payment verification failed';
  
        await prisma.walletTransaction.update({
          where: { id: walletTransaction.id },
          data: { 
            status: 'FAILED',
            metadata: {
              ...(walletTransaction.metadata as Record<string, unknown> || {}),
              failureReason,
              paystackResponse: JSON.parse(JSON.stringify(verifyResponse.data)) // Serialize to ensure JSON compatibility
            }
          }
        });
  
        return { 
          status: 'failed',
          message: failureReason,
          paystackResponse: verifyResponse
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('Verify deposit error:', {
        reference,
        error: errorMessage,
        stack: errorStack
      });
      
      // Update transaction as failed in case of unexpected errors
      try {
        await prisma.walletTransaction.updateMany({
          where: { reference },
          data: { 
            status: 'FAILED',
            metadata: {
              error: errorMessage,
              errorAt: new Date().toISOString()
            }
          }
        });
      } catch (updateError) {
        console.error('Failed to update transaction status:', updateError);
      }
  
      throw new Error(`Failed to verify deposit: ${errorMessage}`);
    }
  }

  // Handle Paystack webhook
  async handlePaystackWebhook(payload: string, signature: string): Promise<WebhookProcessResult> {
    try {
      // Validate webhook signature
      if (!paystackService.validateWebhookSignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const event = JSON.parse(payload);
      console.log('Processing Paystack webhook:', event.event);

      // Process the webhook event
      const result = paystackService.processWebhookEvent(event);

      if (result.processed && (result.event === 'charge.success' || result.event === 'charge.failed')) {
        // Find and update the corresponding wallet transaction
        const walletTransaction = await prisma.walletTransaction.findFirst({
          where: { reference: result.reference }
        });

        if (walletTransaction) {
          const status = result.status === 'success' ? 'SUCCESS' : 'FAILED';
          
          await prisma.walletTransaction.update({
            where: { id: walletTransaction.id },
            data: {
              status,
              metadata: {
                ...(walletTransaction.metadata as Record<string, unknown> || {}),
                webhookProcessedAt: new Date().toISOString(),
                webhookEvent: event
              }
            }
          });

          // If successful and it's a topup, update wallet balance
          if (status === 'SUCCESS' && walletTransaction.type === 'WALLET_TOPUP') {
            await prisma.userWallet.update({
              where: { id: walletTransaction.walletId },
              data: {
                balance: { increment: walletTransaction.amount },
                lastActivity: new Date()
              }
            });
          }
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Webhook processing error:', error);
      throw new Error(`Failed to process webhook: ${errorMessage}`);
    }
  }

  // Make payment from wallet (for shopping)
  async makePayment(params: WalletPaymentParams): Promise<PaymentResult> {
    const { fromUserId, toUserId, amount, description = 'Payment for goods/services' } = params

    try {
      const senderWallet = await this.getOrCreateWallet(fromUserId)
      let receiverWallet: WalletWithRelations | null = null;
      
      // Only get receiver wallet if it's not a system payment
      if (toUserId !== 'SYSTEM') {
        receiverWallet = await this.getOrCreateWallet(toUserId)
      }

      // Check sufficient balance
      if (senderWallet.balance < amount) {
        throw new Error('Insufficient wallet balance')
      }

      // Generate unique reference
      const reference = `PAY_${nanoid(12)}_${Date.now()}`

      // Perform payment transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create sender wallet transaction (debit)
        const senderWalletTransaction = await tx.walletTransaction.create({
          data: {
            walletId: senderWallet.id,
            userId: fromUserId,
            type: 'ORDER_PAYMENT',
            amount: amount,
            currency: senderWallet.currency,
            status: 'SUCCESS',
            reference: `${reference}_OUT`,
            description: description,
            balanceBefore: senderWallet.balance,
            balanceAfter: senderWallet.balance - amount,
            metadata: {
              transactionType: 'payment',
              recipientUserId: toUserId,
              walletId: senderWallet.id
            }
          }
        })

        let receiverWalletTransaction: WalletTransaction | null = null;
        let updatedReceiverWallet: UserWallet | null = null;

        // Only create receiver transaction if it's not a system payment
        if (toUserId !== 'SYSTEM' && receiverWallet) {
          // Create receiver wallet transaction (credit)
          receiverWalletTransaction = await tx.walletTransaction.create({
            data: {
              walletId: receiverWallet.id,
              userId: toUserId,
              type: 'WALLET_TOPUP', // Using existing enum value for credits
              amount: amount,
              currency: receiverWallet.currency,
              status: 'SUCCESS',
              reference: `${reference}_IN`,
              description: description || 'Payment received',
              balanceBefore: receiverWallet.balance,
              balanceAfter: receiverWallet.balance + amount,
              metadata: {
                transactionType: 'income',
                senderUserId: fromUserId,
                walletId: receiverWallet.id
              }
            }
          })

          // Update receiver wallet balance
          updatedReceiverWallet = await tx.userWallet.update({
            where: { id: receiverWallet.id },
            data: {
              balance: { increment: amount },
              lastActivity: new Date()
            }
          })
        }

        // Update sender wallet balance
        const updatedSenderWallet = await tx.userWallet.update({
          where: { id: senderWallet.id },
          data: {
            balance: { decrement: amount },
            lastActivity: new Date()
          }
        })

        return {
          paymentTransaction: senderWalletTransaction,
          incomeTransaction: receiverWalletTransaction,
          senderWallet: updatedSenderWallet,
          receiverWallet: updatedReceiverWallet
        }
      })

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to complete payment: ${errorMessage}`)
    }
  }

  // Get wallet transaction history
  async getTransactionHistory(userId: string, limit = 50, offset = 0): Promise<TransactionHistory> {
    try {
      const transactions = await prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          wallet: true,
          user: {
            select: { id: true, email: true, clerkId: true }
          }
        }
      })

      const total = await prisma.walletTransaction.count({
        where: { userId }
      })

      return {
        transactions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get transaction history: ${errorMessage}`)
    }
  }

  // Get single transaction
  async getTransaction(userId: string, reference: string): Promise<TransactionWithRelations> {
    try {
      const transaction = await prisma.walletTransaction.findFirst({
        where: {
          reference,
          userId
        },
        include: {
          wallet: true,
          user: {
            select: { id: true, email: true, clerkId: true }
          }
        }
      })

      if (!transaction) {
        throw new Error('Transaction not found')
      }

      return transaction

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get transaction: ${errorMessage}`)
    }
  }

  // Get transaction by ID
  async getTransactionById(transactionId: string): Promise<TransactionWithRelations> {
    try {
      const transaction = await prisma.walletTransaction.findUnique({
        where: { id: transactionId },
        include: {
          wallet: true,
          user: {
            select: { id: true, email: true, clerkId: true }
          }
        }
      })

      if (!transaction) {
        throw new Error('Transaction not found')
      }

      return transaction

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get transaction: ${errorMessage}`)
    }
  }
}

export const walletService = new WalletService()