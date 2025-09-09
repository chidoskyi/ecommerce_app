import { NextResponse } from "next/server";
import { AuthenticatedRequest, requireAuth } from "@/lib/auth";
import { walletService } from "@/lib/wallet";

// export async function GET(request: NextRequest) {
//   const authCheck = await requireAuth(request)
//   if(authCheck){
//     return authCheck
//   }

//   const user = (request as AuthenticatedRequest).user;
  
//   if (!user) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   try {
//     const balance = await walletService.getWalletBalance(user.id);
//     return NextResponse.json({ success: true, data: balance });
//   } catch (error: any) {
//     console.error("Get balance error:", error);
//     return NextResponse.json(
//       { success: false, error: error.message || "Failed to get wallet balance" },
//       { status: 500 }
//     );
//   }
// }

// api/wallet/balance/route
export const GET = requireAuth(
  async (
    request: AuthenticatedRequest
  ) => {
  try {
  
    const user = request.user;
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const balance = await walletService.getWalletBalance(user.id, user.clerkId)

    return NextResponse.json({
      success: true,
      data: balance
    })

  } catch (error: unknown) {
    console.error('Get balance error:', error instanceof Error ? error.message : 'Unknown error')
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get wallet balance',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})
