import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getTodayGoal } from '@/lib/gamification/daily-goals';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const goal = await getTodayGoal(userId);

    return NextResponse.json({
      success: true,
      goal,
    });
  } catch (error: any) {
    console.error('Error fetching daily goal:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch daily goal' },
      { status: 500 }
    );
  }
}
