// src/app/api/wallet/deposit/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { walletService } from "@/lib/wallet";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    const trxref = searchParams.get('trxref');
    
    // Use reference or trxref (Paystack sends both)
    const paymentReference = reference || trxref;

    if (!paymentReference) {
      console.error('No payment reference found in callback');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/account/wallet?payment=error&message=no_reference`
      );
    }

    console.log('Paystack callback received for reference:', paymentReference);

    try {
      // Verify the payment with Paystack
      const result = await walletService.verifyDeposit(paymentReference);

      if (result.status === 'success') {
        console.log('Payment verification successful:', result);
        
        // Redirect to success page with reference
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/account/wallet?payment=success&reference=${paymentReference}`
        );
      } else {
        console.log('Payment verification failed:', result);
        
        // Redirect to failure page with reference
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/account/wallet?payment=failed&reference=${paymentReference}`
        );
      }
    } catch (verificationError: unknown) {
      console.error('Payment verification error:', verificationError);
      
      // Redirect to error page with reference for debugging
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/account/wallet?payment=error&reference=${paymentReference}`
      );
    }

  } catch (error: unknown) {
    console.error('Deposit callback error:', error);
    
    // Redirect to error page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/account/wallet?payment=error`
    );
  }
}

// Also handle POST requests in case Paystack sends POST
export async function POST(request: NextRequest) {
  return GET(request);
}