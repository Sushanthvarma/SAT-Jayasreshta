import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Note: Firebase Auth handles sign-out client-side
    // This endpoint is for any server-side cleanup if needed in the future
    // Currently, we just return success
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Sign-out API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Sign-out failed' },
      { status: 500 }
    );
  }
}
