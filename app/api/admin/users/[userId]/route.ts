/**
 * API Route: GET /api/admin/users/[userId]
 * Get detailed analysis for a specific student
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
  try {
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
    
    // Verify admin role
    const userRef = adminDb.collection('users').doc(decodedToken.uid);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists || userSnap.data()?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const resolvedParams = await Promise.resolve(params);
    const userId = resolvedParams.userId;
    
    // Get user data
    const targetUserRef = adminDb.collection('users').doc(userId);
    const targetUserSnap = await targetUserRef.get();
    
    if (!targetUserSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    const userData = targetUserSnap.data()!;
    
    // Get user's test attempts
    const attemptsSnapshot = await adminDb.collection('testAttempts')
      .where('userId', '==', userId)
      .get();
    
    // Get user's test results
    const resultsSnapshot = await adminDb.collection('testResults')
      .where('userId', '==', userId)
      .get();
    
    const attempts = attemptsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        testId: data.testId,
        status: data.status,
        startedAt: data.startedAt ? (data.startedAt as any).toDate().toISOString() : null,
        submittedAt: data.submittedAt ? (data.submittedAt as any).toDate().toISOString() : null,
        totalTimeSpent: data.totalTimeSpent || 0,
      };
    });
    
    const results = resultsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        testId: data.testId,
        totalScore: data.totalScore || 0,
        maxScore: data.maxScore || 0,
        percentage: data.percentage || 0,
        totalTimeSpent: data.totalTimeSpent || 0,
        createdAt: data.createdAt ? (data.createdAt as any).toDate().toISOString() : null,
      };
    });
    
    // Calculate statistics
    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter(a => a.status === 'submitted').length;
    const totalTimeSpent = attempts.reduce((sum, a) => sum + (a.totalTimeSpent || 0), 0);
    const averageTimePerAttempt = completedAttempts > 0 ? Math.round(totalTimeSpent / completedAttempts) : 0;
    
    const totalScore = results.reduce((sum, r) => sum + r.totalScore, 0);
    const maxScore = results.reduce((sum, r) => sum + r.maxScore, 0);
    const averageScore = results.length > 0 ? (totalScore / maxScore) * 100 : 0;
    
    // Time-based analysis
    const attemptsByWeek: Record<string, number> = {};
    const attemptsByMonth: Record<string, number> = {};
    const attemptsByQuarter: Record<string, number> = {};
    const attemptsByYear: Record<string, number> = {};
    const timeSpentByWeek: Record<string, number> = {};
    const timeSpentByMonth: Record<string, number> = {};
    
    const getWeekKey = (date: Date): string => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      return d.toISOString().split('T')[0];
    };
    
    const getQuarter = (date: Date): string => {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `${date.getFullYear()}-Q${quarter}`;
    };
    
    attempts.forEach(attempt => {
      if (attempt.startedAt) {
        const date = new Date(attempt.startedAt);
        const weekKey = getWeekKey(date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const quarterKey = getQuarter(date);
        const yearKey = String(date.getFullYear());
        
        attemptsByWeek[weekKey] = (attemptsByWeek[weekKey] || 0) + 1;
        attemptsByMonth[monthKey] = (attemptsByMonth[monthKey] || 0) + 1;
        attemptsByQuarter[quarterKey] = (attemptsByQuarter[quarterKey] || 0) + 1;
        attemptsByYear[yearKey] = (attemptsByYear[yearKey] || 0) + 1;
        
        if (attempt.totalTimeSpent) {
          timeSpentByWeek[weekKey] = (timeSpentByWeek[weekKey] || 0) + attempt.totalTimeSpent;
          timeSpentByMonth[monthKey] = (timeSpentByMonth[monthKey] || 0) + attempt.totalTimeSpent;
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userData.email || '',
        displayName: userData.displayName || 'Unknown',
        grade: userData.grade || null,
        createdAt: userData.createdAt ? (userData.createdAt as any).toDate().toISOString() : null,
        totalTestsCompleted: userData.totalTestsCompleted || 0,
        currentStreak: userData.currentStreak || 0,
        xp: userData.xp || 0,
        level: userData.level || 1,
        city: userData.city || null,
        state: userData.state || null,
        country: userData.country || null,
      },
      stats: {
        totalAttempts,
        completedAttempts,
        totalTimeSpent,
        averageTimePerAttempt,
        averageScore: Math.round(averageScore * 10) / 10,
        totalResults: results.length,
      },
      attempts,
      results,
      analytics: {
        attemptsByWeek,
        attemptsByMonth,
        attemptsByQuarter,
        attemptsByYear,
        timeSpentByWeek,
        timeSpentByMonth,
      },
    });
  } catch (error: any) {
    console.error('Error fetching user analysis:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch user analysis',
      },
      { status: 500 }
    );
  }
}
