import { NextResponse } from 'next/server'
import { walletService } from '@/lib/wallet'
import { AuthenticatedRequest, requireAuth } from '@/lib/auth'

// app/api/wallet/verify/route.ts
export const POST = requireAuth(
  async (
    request: AuthenticatedRequest
  ) => {
  try {
  
    const user = request.user;
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json()
    const { reference } = body

    if (!reference) {
      return NextResponse.json(
        { error: 'Reference is required' },
        { status: 400 }
      )
    }

    const result = await walletService.verifyDeposit(reference)

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error: unknown) {
    console.error('Deposit verification error:', error instanceof Error ? error.message : 'Unknown error')
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to verify deposit',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json()
//     console.log('Verification request received:', body)
    
//     const { reference, orderNo, country = 'NG' } = body
    
//     if (!reference && !orderNo) {
//       return NextResponse.json(
//         { success: false, error: 'Either reference or orderNo is required' },
//         { status: 400 }
//       )
//     }

//     // Verify with OPay
//     const verifyParams = {
//       reference: reference || undefined,
//       orderNo: orderNo || undefined,
//       country
//     }
    
//     const opayStatus = await opayService.verifyPayment(verifyParams)
//     console.log('OPay verification response:', opayStatus)

//     // Find wallet transaction with proper JSON query syntax
//     const transaction = await prisma.walletTransaction.findFirst({
//       where: {
//         OR: [
//           { reference }, // Search by direct reference
//           ...(orderNo ? [{
//             metadata: {
//               path: ['orderNo'],
//               equals: orderNo
//             }
//           }] : [])
//         ].filter(Boolean)
//       },
//       include: {
//         wallet: true,
//         user: true
//       }
//     })

//     if (!transaction) {
//       return NextResponse.json(
//         { success: false, error: 'Transaction not found' },
//         { status: 404 }
//       )
//     }

//     // Handle successful payment
//     if (opayStatus.code === '00000' && opayStatus.data?.status === 'SUCCESS') {
//       if (transaction.status !== 'SUCCESS') {
//         await prisma.$transaction(async (tx) => {
//           // Update transaction
//           await tx.walletTransaction.update({
//             where: { id: transaction.id },
//             data: {
//               status: 'SUCCESS',
//               balanceAfter: transaction.balanceBefore + transaction.amount,
//               metadata: {
//                 ...(typeof transaction.metadata === 'object' ? transaction.metadata : {}),
//                 verifiedAt: new Date().toISOString(),
//                 opayResponse: opayStatus.data
//               }
//             }
//           })

//           // Update wallet balance
//           await tx.userWallet.update({
//             where: { id: transaction.walletId },
//             data: {
//               balance: { increment: transaction.amount },
//               lastActivity: new Date()
//             }
//           })
//         })
//       }

//       return NextResponse.json({
//         success: true,
//         status: 'verified',
//         amount: transaction.amount,
//         newBalance: transaction.balanceBefore + transaction.amount,
//         reference: transaction.reference,
//         opayOrderNo: opayStatus.data?.orderNo
//       })
//     }

//     // Handle failed payment
//     if (opayStatus.data?.status === 'FAIL') {
//       await prisma.walletTransaction.update({
//         where: { id: transaction.id },
//         data: { 
//           status: 'FAILED',
//           metadata: {
//             ...(typeof transaction.metadata === 'object' ? transaction.metadata : {}),
//             failureReason: opayStatus.data?.failureReason || 'Payment failed',
//             opayResponse: opayStatus.data
//           }
//         }
//       })

//       return NextResponse.json({
//         success: false,
//         status: 'failed',
//         error: opayStatus.data?.failureReason || 'Payment failed',
//         reference: transaction.reference
//       })
//     }

//     // Return current status
//     return NextResponse.json({
//       success: true,
//       status: transaction.status.toLowerCase(),
//       amount: transaction.amount,
//       currentBalance: transaction.wallet.balance,
//       reference: transaction.reference,
//       opayStatus: opayStatus.data?.status
//     })

//   } catch (error: any) {
//     console.error('Wallet deposit verification error:', error)
//     return NextResponse.json(
//       { 
//         success: false, 
//         error: error.message || 'Verification failed',
//         ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
//       },
//       { status: 500 }
//     )
//   }
// }
