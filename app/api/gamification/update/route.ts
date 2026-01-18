/**
 * API Route: POST /api/gamification/update
 * Updates user gamification data (streaks, badges) after test completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { checkBadges } from '@/lib/gamification/badges';
import { updateStreakAfterTest } from '@/lib/gamification/streaks';

export async function POST(req: NextRequest) {
  try {
    // Get authentication token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const idToken = authHeader.substring(7);
    let decodedToken;
    
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    const userId = decodedToken.uid;
    const body = await req.json();
    const { testScore, testCompleted } = body;
    
    // Get user data
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    const userData = userSnap.data()!;
    const currentStreak = userData.currentStreak || 0;
    const longestStreak = userData.longestStreak || 0;
    const totalTestsCompleted = userData.totalTestsCompleted || 0;
    const badges = userData.badges || [];
    const lastTestDate = userData.lastTestDate;
    
    const updates: any = {};
    const newBadges: string[] = [];
    
    // Update streak if test was completed
    if (testCompleted) {
      const streakResult = updateStreakAfterTest(
        lastTestDate ? (lastTestDate as any).toDate() : null,
        currentStreak,
        longestStreak
      );
      
      updates.currentStreak = streakResult.currentStreak;
      updates.longestStreak = streakResult.longestStreak;
      updates.lastTestDate = Timestamp.now();
    }
    
    // Check for new badges
    if (testScore !== undefined) {
      const earnedBadges = checkBadges(
        totalTestsCompleted + (testCompleted ? 1 : 0),
        updates.currentStreak || currentStreak,
        testScore,
        badges
      );
      
      if (earnedBadges.length > 0) {
        newBadges.push(...earnedBadges);
        updates.badges = [...badges, ...earnedBadges];
      }
    }
    
    // Update user document
    if (Object.keys(updates).length > 0) {
      await userRef.update(updates);
    }
    
    return NextResponse.json({
      success: true,
      updates,
      newBadges,
      message: newBadges.length > 0 ? `Congratulations! You earned ${newBadges.length} new badge(s)!` : 'Progress updated',
    });
  } catch (error: any) {
    console.error('Error updating gamification:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update gamification',
      },
      { status: 500 }
    );
  }
}
