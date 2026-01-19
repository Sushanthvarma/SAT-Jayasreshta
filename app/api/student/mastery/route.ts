/**
 * API Route: GET /api/student/mastery
 * Returns mastery tracking data for progressive assessment system
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getUserTestMastery, getUserMasteryProgress, getAdaptiveRecommendation } from '@/lib/test-system/mastery-tracker';

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
    const grade = parseInt(searchParams.get('grade') || '4');
    const includeRecommendation = searchParams.get('recommendation') === 'true';

    const [testMastery, progress] = await Promise.all([
      getUserTestMastery(userId, grade),
      getUserMasteryProgress(userId, grade),
    ]);

    const response: any = {
      success: true,
      testMastery,
      progress,
    };

    if (includeRecommendation) {
      const recommendation = await getAdaptiveRecommendation(userId, grade);
      response.recommendation = recommendation;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching mastery data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch mastery data' },
      { status: 500 }
    );
  }
}
