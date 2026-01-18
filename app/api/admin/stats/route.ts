/**
 * API Route: GET /api/admin/stats
 * Returns admin dashboard statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Test } from '@/lib/types/test';

export async function GET(req: NextRequest) {
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
    
    // Verify admin role
    const userRef = adminDb.collection('users').doc(decodedToken.uid);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists || userSnap.data()?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Get statistics
    const [testsSnapshot, usersSnapshot, attemptsSnapshot] = await Promise.all([
      adminDb.collection('tests').get(),
      adminDb.collection('users').get(),
      adminDb.collection('testAttempts').get(),
    ]);
    
    const totalTests = testsSnapshot.size;
    const publishedTests = testsSnapshot.docs.filter(
      doc => doc.data().status === 'published' && doc.data().isActive === true
    ).length;
    const totalUsers = usersSnapshot.size;
    const totalAttempts = attemptsSnapshot.size;
    
    // Helper function to get week key
    const getWeekKey = (date: Date): string => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      return d.toISOString().split('T')[0];
    };

    // Analytics: Time Spent
    let totalTimeSpent = 0;
    const timeSpentByDay: Record<string, number> = {};
    const timeSpentByWeek: Record<string, number> = {};
    
    attemptsSnapshot.docs.forEach(doc => {
      const attempt = doc.data();
      const timeSpent = attempt.totalTimeSpent || 0;
      totalTimeSpent += timeSpent;
      
      if (attempt.startedAt) {
        const date = (attempt.startedAt as any)?.toDate() || new Date();
        const dayKey = date.toISOString().split('T')[0];
        const weekKey = getWeekKey(date);
        
        timeSpentByDay[dayKey] = (timeSpentByDay[dayKey] || 0) + timeSpent;
        timeSpentByWeek[weekKey] = (timeSpentByWeek[weekKey] || 0) + timeSpent;
      }
    });
    
    // Analytics: Locations
    const locationsByState: Record<string, number> = {};
    const locationsByCountry: Record<string, number> = {};
    
    usersSnapshot.docs.forEach(doc => {
      const user = doc.data();
      if (user.state) {
        locationsByState[user.state] = (locationsByState[user.state] || 0) + 1;
      }
      if (user.country) {
        locationsByCountry[user.country] = (locationsByCountry[user.country] || 0) + 1;
      }
    });
    
    // Analytics: Grades
    const gradesDistribution: Record<string, number> = {};
    usersSnapshot.docs.forEach(doc => {
      const user = doc.data();
      if (user.grade) {
        gradesDistribution[user.grade] = (gradesDistribution[user.grade] || 0) + 1;
      }
    });
    
    // Analytics: User Growth Over Time
    const userGrowthByMonth: Record<string, number> = {};
    usersSnapshot.docs.forEach(doc => {
      const user = doc.data();
      if (user.createdAt) {
        const date = (user.createdAt as any)?.toDate() || new Date();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        userGrowthByMonth[monthKey] = (userGrowthByMonth[monthKey] || 0) + 1;
      }
    });
    
    // Analytics: Test Attempts Over Time
    const attemptsByMonth: Record<string, number> = {};
    const attemptsByQuarter: Record<string, number> = {};
    const attemptsByYear: Record<string, number> = {};
    const timeSpentByMonth: Record<string, number> = {};
    const timeSpentByQuarter: Record<string, number> = {};
    const timeSpentByYear: Record<string, number> = {};
    
    const getQuarter = (date: Date): string => {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `${date.getFullYear()}-Q${quarter}`;
    };
    
    attemptsSnapshot.docs.forEach(doc => {
      const attempt = doc.data();
      const timeSpent = attempt.totalTimeSpent || 0;
      
      if (attempt.startedAt) {
        const date = (attempt.startedAt as any)?.toDate() || new Date();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const quarterKey = getQuarter(date);
        const yearKey = String(date.getFullYear());
        
        attemptsByMonth[monthKey] = (attemptsByMonth[monthKey] || 0) + 1;
        attemptsByQuarter[quarterKey] = (attemptsByQuarter[quarterKey] || 0) + 1;
        attemptsByYear[yearKey] = (attemptsByYear[yearKey] || 0) + 1;
        
        timeSpentByMonth[monthKey] = (timeSpentByMonth[monthKey] || 0) + timeSpent;
        timeSpentByQuarter[quarterKey] = (timeSpentByQuarter[quarterKey] || 0) + timeSpent;
        timeSpentByYear[yearKey] = (timeSpentByYear[yearKey] || 0) + timeSpent;
      }
    });
    
    // Grade-wise Analysis - Create user grade map first
    const userGradeMap: Record<string, string> = {};
    usersSnapshot.docs.forEach(doc => {
      const user = doc.data();
      userGradeMap[doc.id] = user.grade || 'Unknown';
    });
    
    const gradeWiseStats: Record<string, {
      totalUsers: number;
      totalAttempts: number;
      totalTimeSpent: number;
      averageTimePerAttempt: number;
      completedAttempts: number;
    }> = {};
    
    // Initialize grade stats from user data
    usersSnapshot.docs.forEach(doc => {
      const user = doc.data();
      const grade = user.grade || 'Unknown';
      
      if (!gradeWiseStats[grade]) {
        gradeWiseStats[grade] = {
          totalUsers: 0,
          totalAttempts: 0,
          totalTimeSpent: 0,
          averageTimePerAttempt: 0,
          completedAttempts: 0,
        };
      }
      gradeWiseStats[grade].totalUsers += 1;
    });
    
    // Process attempts with grade mapping
    attemptsSnapshot.docs.forEach(doc => {
      const attempt = doc.data();
      const timeSpent = attempt.totalTimeSpent || 0;
      const grade = userGradeMap[attempt.userId] || 'Unknown';
      
      if (gradeWiseStats[grade]) {
        gradeWiseStats[grade].totalAttempts += 1;
        gradeWiseStats[grade].totalTimeSpent += timeSpent;
        if (attempt.status === 'submitted') {
          gradeWiseStats[grade].completedAttempts += 1;
        }
      }
    });
    
    // Calculate averages for each grade
    Object.keys(gradeWiseStats).forEach(grade => {
      const stats = gradeWiseStats[grade];
      stats.averageTimePerAttempt = stats.completedAttempts > 0 
        ? Math.round(stats.totalTimeSpent / stats.completedAttempts) 
        : 0;
    });
    
    // Get time period filter from query
    const searchParams = req.nextUrl.searchParams;
    const timePeriod = searchParams.get('period') || 'all'; // all, week, month, quarter, year
    const selectedGrade = searchParams.get('grade') || null;
    
    return NextResponse.json({
      success: true,
      stats: {
        totalTests,
        publishedTests,
        totalUsers,
        totalAttempts,
        totalTimeSpent, // in seconds
        averageTimePerAttempt: totalAttempts > 0 ? Math.round(totalTimeSpent / totalAttempts) : 0,
      },
      analytics: {
        timeSpent: {
          total: totalTimeSpent,
          averagePerAttempt: totalAttempts > 0 ? Math.round(totalTimeSpent / totalAttempts) : 0,
          byDay: timeSpentByDay,
          byWeek: timeSpentByWeek,
          byMonth: timeSpentByMonth,
          byQuarter: timeSpentByQuarter,
          byYear: timeSpentByYear,
        },
        locations: {
          byState: locationsByState,
          byCountry: locationsByCountry,
        },
        grades: gradesDistribution,
        gradeWiseStats: gradeWiseStats,
        userGrowth: userGrowthByMonth,
        attemptsOverTime: {
          byMonth: attemptsByMonth,
          byQuarter: attemptsByQuarter,
          byYear: attemptsByYear,
        },
      },
      filters: {
        timePeriod,
        selectedGrade,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch admin statistics',
      },
      { status: 500 }
    );
  }
}
