// app/api/admin/init-system-user/route.ts
import { NextResponse } from 'next/server';
import { getOrCreateSystemUser } from '@/lib/systemUser'; // Your function

export async function GET() {
  try {
    const systemUserId = await getOrCreateSystemUser();
    return NextResponse.json({ 
      success: true, 
      systemUserId,
      message: 'System user initialized successfully' 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}