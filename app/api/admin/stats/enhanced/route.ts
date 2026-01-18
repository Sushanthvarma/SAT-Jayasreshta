/**
 * Enhanced Admin Stats API
 * Calculates comprehensive KPIs for executive dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
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
    
    // Get all data
    const [usersSnapshot, attemptsSnapshot, resultsSnapshot] = await Promise.all([
      adminDb.collection('users').get(),
      adminDb.collection('testAttempts').get(),
      adminDb.collection('testResults').get(),
    ]);
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Calculate KPIs
    const totalUsers = usersSnapshot.size;
    const totalAttempts = attemptsSnapshot.size;
    const totalResults = resultsSnapshot.size;
    
    // Active users (tested in last 30 days)
    const activeUsers = new Set<string>();
    const activeToday = new Set<string>();
    const activeThisWeek = new Set<string>();
    const activeThisMonth = new Set<string>();
    
    // User grade map
    const userGradeMap: Record<string, string> = {};
    usersSnapshot.docs.forEach(doc => {
      userGradeMap[doc.id] = doc.data().grade || 'Unknown';
    });
    
    // Process attempts and results
    let totalTimeSpent = 0;
    const userScores: Record<string, number[]> = {};
    const userAttempts: Record<string, number> = {};
    const userLastActive: Record<string, Date> = {};
    const userStreaks: Record<string, number> = {};
    
    attemptsSnapshot.docs.forEach(doc => {
      const attempt = doc.data();
      const userId = attempt.userId;
      const timeSpent = attempt.totalTimeSpent || 0;
      totalTimeSpent += timeSpent;
      
      if (attempt.startedAt) {
        const startedAt = (attempt.startedAt as any)?.toDate() || new Date();
        userLastActive[userId] = startedAt > (userLastActive[userId] || new Date(0)) ? startedAt : userLastActive[userId];
        
        if (startedAt >= lastMonth) {
          activeUsers.add(userId);
          if (startedAt >= lastWeek) activeThisWeek.add(userId);
          if (startedAt >= today) activeToday.add(userId);
        }
      }
      
      userAttempts[userId] = (userAttempts[userId] || 0) + 1;
    });
    
    resultsSnapshot.docs.forEach(doc => {
      const result = doc.data();
      const userId = result.userId;
      if (!userScores[userId]) userScores[userId] = [];
      userScores[userId].push(result.percentage || 0);
    });
    
    // Get user streaks
    usersSnapshot.docs.forEach(doc => {
      const user = doc.data();
      userStreaks[doc.id] = user.currentStreak || 0;
    });
    
    // Calculate average scores
    const allScores: number[] = [];
    Object.values(userScores).forEach(scores => {
      allScores.push(...scores);
    });
    const platformAvgScore = allScores.length > 0 
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length 
      : 0;
    
    // Calculate improvement rates
    const improvingStudents = new Set<string>();
    const atRiskStudents = new Set<string>();
    const excellingStudents = new Set<string>();
    
    Object.entries(userScores).forEach(([userId, scores]) => {
      if (scores.length >= 4) {
        const recent = scores.slice(-4);
        const older = scores.slice(-8, -4);
        if (older.length > 0) {
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
          const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
          if (recentAvg > olderAvg) improvingStudents.add(userId);
          if (recentAvg < olderAvg - 5 || recentAvg < 60) atRiskStudents.add(userId);
        }
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avg >= 90) excellingStudents.add(userId);
      } else if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avg < 60) atRiskStudents.add(userId);
        if (avg >= 90) excellingStudents.add(userId);
      }
    });
    
    // Calculate streak metrics
    const activeStreaks = Object.values(userStreaks).filter(s => s > 0);
    const avgStreakLength = activeStreaks.length > 0
      ? activeStreaks.reduce((a, b) => a + b, 0) / activeStreaks.length
      : 0;
    const longestStreak = Math.max(...activeStreaks, 0);
    
    // Calculate session duration (average time per attempt)
    const completedAttempts = attemptsSnapshot.docs.filter(
      d => d.data().status === 'submitted'
    );
    const avgSessionDuration = completedAttempts.length > 0
      ? totalTimeSpent / completedAttempts.length
      : 0;
    
    // Calculate DAU/MAU ratio
    const dauMauRatio = totalUsers > 0 ? (activeToday.size / totalUsers) * 100 : 0;
    
    // Calculate median score
    const sortedScores = [...allScores].sort((a, b) => a - b);
    const medianScore = sortedScores.length > 0
      ? sortedScores[Math.floor(sortedScores.length / 2)]
      : 0;
    
    // Time-based analytics
    const testsByDay: Record<string, number> = {};
    const scoresByDay: Record<string, number[]> = {};
    
    resultsSnapshot.docs.forEach(doc => {
      const result = doc.data();
      if (result.completedAt) {
        const date = (result.completedAt as any)?.toDate() || new Date();
        const dayKey = date.toISOString().split('T')[0];
        testsByDay[dayKey] = (testsByDay[dayKey] || 0) + 1;
        if (!scoresByDay[dayKey]) scoresByDay[dayKey] = [];
        scoresByDay[dayKey].push(result.percentage || 0);
      }
    });
    
    // 7-day trend data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });
    
    const trendData = last7Days.map(day => ({
      date: day,
      tests: testsByDay[day] || 0,
      avgScore: scoresByDay[day] 
        ? scoresByDay[day].reduce((a, b) => a + b, 0) / scoresByDay[day].length
        : 0,
    }));
    
    // Calculate week-over-week comparison
    const thisWeekTests = last7Days.reduce((sum, day) => sum + (testsByDay[day] || 0), 0);
    const lastWeekStart = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const lastWeekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(lastWeekStart);
      date.setDate(date.getDate() + i);
      return date.toISOString().split('T')[0];
    });
    const lastWeekTests = lastWeekDays.reduce((sum, day) => sum + (testsByDay[day] || 0), 0);
    const testsGrowth = lastWeekTests > 0 
      ? ((thisWeekTests - lastWeekTests) / lastWeekTests) * 100 
      : 0;
    
    // User growth
    const usersThisWeek = usersSnapshot.docs.filter(doc => {
      const createdAt = doc.data().createdAt;
      if (!createdAt) return false;
      const date = (createdAt as any)?.toDate() || new Date();
      return date >= lastWeek;
    }).length;
    
    const usersLastWeek = usersSnapshot.docs.filter(doc => {
      const createdAt = doc.data().createdAt;
      if (!createdAt) return false;
      const date = (createdAt as any)?.toDate() || new Date();
      const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
      return date >= twoWeeksAgo && date < lastWeek;
    }).length;
    
    const usersGrowth = usersLastWeek > 0 
      ? ((usersThisWeek - usersLastWeek) / usersLastWeek) * 100 
      : 0;
    
    // Score improvement
    const thisWeekScores = last7Days.flatMap(day => scoresByDay[day] || []);
    const lastWeekScores = lastWeekDays.flatMap(day => scoresByDay[day] || []);
    const thisWeekAvg = thisWeekScores.length > 0
      ? thisWeekScores.reduce((a, b) => a + b, 0) / thisWeekScores.length
      : 0;
    const lastWeekAvg = lastWeekScores.length > 0
      ? lastWeekScores.reduce((a, b) => a + b, 0) / lastWeekScores.length
      : 0;
    const scoreGrowth = lastWeekAvg > 0
      ? ((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100
      : 0;
    
    return NextResponse.json({
      success: true,
      kpis: {
        platformHealth: {
          totalActiveStudents: totalUsers,
          totalTestsCompleted: totalResults,
          platformAverageScore: Math.round(platformAvgScore * 10) / 10,
          activeToday: activeToday.size,
          totalUsersChange: usersGrowth,
          testsCompletedChange: testsGrowth,
          avgScoreChange: scoreGrowth,
        },
        engagement: {
          dau: activeToday.size,
          wau: activeThisWeek.size,
          mau: activeUsers.size,
          dauMauRatio: Math.round(dauMauRatio * 10) / 10,
          avgSessionDuration: Math.round(avgSessionDuration / 60 * 10) / 10, // minutes
        },
        learningOutcomes: {
          studentsImproving: improvingStudents.size,
          studentsAtRisk: atRiskStudents.size,
          studentsExcelling: excellingStudents.size,
          medianScore: Math.round(medianScore * 10) / 10,
        },
        streaks: {
          activeStreaks: activeStreaks.length,
          avgStreakLength: Math.round(avgStreakLength * 10) / 10,
          longestStreak: longestStreak,
          streakDropOffRate: 0, // TODO: Calculate based on historical data
        },
      },
      trendData,
      userDetails: Object.keys(userScores).map(userId => {
        const user = usersSnapshot.docs.find(d => d.id === userId)?.data();
        const scores = userScores[userId] || [];
        const avgScore = scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
        
        // Calculate risk level
        let riskLevel = 'excellent';
        if (atRiskStudents.has(userId)) riskLevel = 'at-risk';
        else if (improvingStudents.has(userId) && avgScore >= 70) riskLevel = 'good';
        else if (avgScore < 70) riskLevel = 'at-risk';
        
        return {
          id: userId,
          name: user?.displayName || 'Unknown',
          email: user?.email || '',
          grade: user?.grade || null,
          testsCompleted: scores.length,
          avgScore: Math.round(avgScore * 10) / 10,
          recentTrend: improvingStudents.has(userId) ? 'up' : atRiskStudents.has(userId) ? 'down' : 'stable',
          streak: userStreaks[userId] || 0,
          lastActive: userLastActive[userId]?.toISOString() || null,
          riskLevel,
        };
      }),
    });
  } catch (error: any) {
    console.error('Error fetching enhanced admin stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch admin statistics',
      },
      { status: 500 }
    );
  }
}
