// lib/opay-utils.ts
import prisma from '@/lib/prisma';
import { TransactionStatus } from '@prisma/client';

/**
 * Helper function to update transaction status for OPay
 * Use this in webhook handlers or other parts of your application
 */
export async function updateOpayTransactionStatus(
  reference: string, 
  status: string, 
  providerData?: string | null
) {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { reference }
    });

    if (!transaction) {
      console.error('OPay transaction not found for reference:', reference);
      return null;
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: status.toUpperCase() as TransactionStatus,
        processedAt: new Date(),
        providerData: providerData ? JSON.stringify(providerData) : transaction.providerData
      }
    });

    console.log('OPay transaction updated:', updatedTransaction.id, 'Status:', updatedTransaction.status);
    return updatedTransaction;
  } catch (error) {
    console.error('Error updating OPay transaction status:', error);
    throw error;
  }
}