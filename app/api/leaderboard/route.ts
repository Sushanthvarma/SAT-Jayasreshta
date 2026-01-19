import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getLeaderboard, getUserStats, getSocialComparison } from '@/lib/gamification/leaderboard';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { searchParams } = new URL(req.url);
    // PRODUCTION-GRADE: Always fetch ALL students for consistent leaderboard
    // Limit is ignored - we return all students to ensure consistency
    const includeStats = searchParams.get('stats') === 'true';
    const includeComparison = searchParams.get('comparison') === 'true';

    // Fetch ALL students (no limit) for consistent leaderboard across all users
    const leaderboard = await getLeaderboard(10000, userId); // Large limit to get all
    
    const response: any = {
      success: true,
      leaderboard,
    };

    if (includeStats) {
      const stats = await getUserStats(userId);
      response.stats = stats;
    }

    if (includeComparison) {
      const comparison = await getSocialComparison(userId);
      response.comparison = comparison;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
