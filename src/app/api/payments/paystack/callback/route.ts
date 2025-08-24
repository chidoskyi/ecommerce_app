// src/app/api/payment/paystack/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { paystackService } from "@/lib/paystack";
import { walletService } from "@/lib/wallet";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reference = searchParams.get("reference");
    const trxref = searchParams.get("trxref");
    const paymentReference = reference || trxref;

    if (!paymentReference) {
      console.error('No payment reference found in callback');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/account/wallet?payment=failed&error=missing_reference`
      );
    }

    console.log('Paystack callback received for reference:', paymentReference);

    try {
      // Verify payment with Paystack
      const verification = await paystackService.verifyPayment(paymentReference);

      if (!verification.status || verification.data.status !== "success") {
        console.log('Payment verification failed:', verification);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL}/account/wallet?payment=failed&reference=${paymentReference}`
        );
      }

      console.log('Payment verification successful for:', paymentReference);

      if (paymentReference.startsWith('WD_')) {
        // Handle wallet deposit
        console.log('Processing wallet deposit...');
        
        try {
          const walletResult = await walletService.verifyDeposit(paymentReference);
          
          // FIX: Check the actual result structure, not just status
          console.log('Wallet service result:', walletResult);
          
          // Check if walletResult indicates success
          if (walletResult && (walletResult.status === 'verified' || walletResult.status === 'success')) {
            console.log('Wallet deposit processed successfully');
            return NextResponse.redirect(
              `${process.env.NEXT_PUBLIC_BASE_URL}/account/wallet?payment=success&reference=${paymentReference}`
            );
          } else {
            console.log('Wallet deposit processing failed:', walletResult);
            return NextResponse.redirect(
              `${process.env.NEXT_PUBLIC_BASE_URL}/account/wallet?payment=failed&reference=${paymentReference}`
            );
          }
        } catch (walletError: any) {
          console.error('Wallet deposit processing error:', walletError);
          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_BASE_URL}/account/wallet?payment=error&reference=${paymentReference}`
          );
        }
      } else {
        // Handle other payment types...
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/payment-success?reference=${paymentReference}`
        );
      }

    } catch (verificationError: any) {
      console.error('Payment verification error:', verificationError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/account/wallet?payment=error&reference=${paymentReference}`
      );
    }

  } catch (error: any) {
    console.error('Payment callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/account/wallet?payment=error`
    );
  }
}

// Also handle POST requests in case Paystack sends POST
export async function POST(request: NextRequest) {
  return GET(request);
}

// import { NextRequest, NextResponse } from "next/server";
// import { paystackService } from "@/lib/paystack";
// import { AuthenticatedRequest, requireAuth } from "@/lib/auth";

// export async function GET(request: NextRequest) {
//   try {
//     // First check auth status
//     // const authCheck = await requireAuth(request);
//     // if (authCheck) {
//     //   return authCheck;
//     // }

//     // const user = await (request as AuthenticatedRequest).user;
//     // if (!user) {
//     //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     // }
//     const searchParams = request.nextUrl.searchParams;
//     const reference = searchParams.get("reference");
//     const trxref = searchParams.get("trxref");

//     const paymentReference = reference || trxref;

//     if (!paymentReference) {
//       return NextResponse.redirect(
//         `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/payment-failed?error=missing_reference`
//       );
//     }

//     // Verify payment with Paystack
//     const verification = await paystackService.verifyPayment(paymentReference);

//     if (verification.status && verification.data.status === "success") {
//       // Payment successful
//       return NextResponse.redirect(
//         `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/payment-success?reference=${paymentReference}`
//       );
//     } else {
//       // Payment failed
//       return NextResponse.redirect(
//         `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/payment-failed?reference=${paymentReference}`
//       );
//     }
//   } catch (error) {
//     console.error("Payment callback error:", error);
//     return NextResponse.redirect(
//       `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/failed?error=verification_failed`
//     );
//   }
// }
