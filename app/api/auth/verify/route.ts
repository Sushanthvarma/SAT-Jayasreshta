import { NextRequest, NextResponse } from 'next/server';
import { updateUserLogin } from '@/lib/sheets';

// Optional: Track user logins in Google Sheets (for analytics)
export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Track login (optional - for analytics)
    try {
      await updateUserLogin(email, name || 'Unknown');
    } catch (err) {
      // Don't fail if sheet tracking fails
      console.error('Failed to track login in sheets:', err);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Auth verification failed:', error);
    return NextResponse.json(
      { error: error.message || 'Verification failed' }, 
      { status: 500 }
    );
  }
}
