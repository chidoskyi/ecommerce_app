import { NextResponse } from "next/server";
import { AuthenticatedRequest, requireAuth } from "@/lib/auth";
import { walletService } from "@/lib/wallet";

export const POST = requireAuth(
  async (
    request: AuthenticatedRequest,
  ) => {
  try {
  
    const user = request.user;
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json()
    const { amount } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Use the unified callback URL
    const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/paystack/callback`

    console.log('Initializing deposit with callback URL:', callbackUrl);

    const result = await walletService.initializeDeposit({
      userId: user.id,
      clerkId: user.clerkId,
      amount: parseFloat(amount),
      callbackUrl
    })

    console.log('Wallet service result:', result);

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error:   unknown) {
    console.error('Deposit initialization error:', error instanceof Error ? error.message : 'Unknown error')
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize deposit',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})