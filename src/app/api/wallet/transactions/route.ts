import { NextRequest, NextResponse } from "next/server";
import { AuthenticatedRequest, requireAuth } from "@/lib/auth";
import { walletService } from "@/lib/wallet";

// export async function GET(request: NextRequest) {
//   const authCheck = await requireAuth(request)
//   if (authCheck) {
    
//   }
//   const user = (request as AuthenticatedRequest).user;
  
//   if (!user?.id) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   try {
//     const { searchParams } = new URL(request.url);
//     const limit = parseInt(searchParams.get("limit") || "50");
//     const offset = parseInt(searchParams.get("offset") || "0");

//     const history = await walletService.getTransactionHistory(
//       user.id,
//       limit,
//       offset
//     );

//     return NextResponse.json({ success: true, data: history });
//   } catch (error: any) {
//     console.error("Transaction history error:", error);
//     return NextResponse.json(
//       { success: false, error: error.message || "Failed to get transaction history" },
//       { status: 500 }
//     );
//   }
// }

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request)
    if (authCheck) {
      return authCheck
    }
    const user = (request as AuthenticatedRequest).user;
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const transactions = await walletService.getTransactionHistory(user.id, limit, offset)

    return NextResponse.json({
      success: true,
      data: transactions
    })

  } catch (error: any) {
    console.error('Get transactions error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get transaction history',
        message: error.message 
      },
      { status: 500 }
    )
  }
}