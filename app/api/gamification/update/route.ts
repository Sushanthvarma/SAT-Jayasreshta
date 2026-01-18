/**
 * API Route: POST /api/gamification/update
 * Updates user gamification data (streaks, badges, XP, daily goals)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { checkBadges } from '@/lib/gamification/badges';
import { updateStreakAfterTest } from '@/lib/gamification/streaks';
import { calculateTestXP, calculateStreakBonus } from '@/lib/gamification/xp';
import { updateUserXP } from '@/lib/gamification/leaderboard';
import { updateDailyGoalXP, getTodayGoal } from '@/lib/gamification/daily-goals';

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
    const { testScore, testCompleted, maxScore, timeSpent } = body;
    
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
    const currentTotalXP = userData.totalXP || 0;
    const currentLevel = userData.level || 1;
    const averageScore = userData.averageScore || 0;
    const totalScore = userData.totalScore || 0;
    
    const updates: any = {};
    const newBadges: string[] = [];
    let xpGained = 0;
    let leveledUp = false;
    
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
      
      // Calculate XP for test completion
      if (testScore !== undefined && maxScore !== undefined) {
        xpGained = calculateTestXP(testScore, maxScore, timeSpent || 0);
        
        // Add streak bonus
        const streakBonus = calculateStreakBonus(streakResult.currentStreak);
        xpGained += streakBonus;
        
        // Update XP and level
        const xpResult = await updateUserXP(userId, xpGained, 'test_completed');
        leveledUp = xpResult.leveledUp;
        updates.totalXP = xpResult.newTotalXP;
        updates.level = xpResult.newLevel;
        
        // Update daily goal
        const today = new Date().toISOString().split('T')[0];
        await updateDailyGoalXP(userId, today, xpGained);
      }
      
      // Update average score
      const newTotalTests = totalTestsCompleted + 1;
      const newTotalScore = totalScore + (testScore || 0);
      const newAverageScore = newTotalScore / newTotalTests;
      updates.averageScore = Math.round(newAverageScore);
      updates.totalScore = newTotalScore;
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
      await userRef.update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    
    return NextResponse.json({
      success: true,
      updates: {
        ...updates,
        xpGained,
        leveledUp,
      },
      newBadges,
      message: newBadges.length > 0 
        ? `Congratulations! You earned ${newBadges.length} new badge(s) and ${xpGained} XP!` 
        : leveledUp
        ? `Level up! You're now level ${updates.level}!`
        : `Great job! You earned ${xpGained} XP!`,
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
