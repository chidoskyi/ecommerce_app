import { NextRequest, NextResponse } from "next/server";
import { AuthenticatedRequest, requireAuth } from "@/lib/auth";
import { walletService } from "@/lib/wallet";

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck) {
      return authCheck;
    }
  
    const user = (request as AuthenticatedRequest).user;
    
    if (!user?.id) {
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

  } catch (error: any) {
    console.error('Deposit initialization error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize deposit',
        message: error.message 
      },
      { status: 500 }
    )
  }
}