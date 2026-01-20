/**
 * API Route: GET /api/admin/stats
 * Returns admin dashboard statistics
 * CRITICAL: Uses unified analytics aggregator (single source of truth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getAnalyticsSummary } from '@/lib/analytics/aggregator';

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
    
    // CRITICAL: Use unified analytics aggregator (single source of truth)
    const analyticsSummary = await getAnalyticsSummary();
    
    // Get additional test stats
    const testsSnapshot = await adminDb.collection('tests').get();
    
    const totalTests = testsSnapshot.size;
    const publishedTests = testsSnapshot.docs.filter(
      doc => doc.data().status === 'published' && doc.data().isActive === true
    ).length;
    
    // CRITICAL: Use unified analytics (single source of truth)
    // This ensures all admin pages show consistent data
    const totalUsers = analyticsSummary.totalUsers;
    const totalAttempts = analyticsSummary.totalTestsTaken;
    
    // Get time period filter from query
    const searchParams = req.nextUrl.searchParams;
    const timePeriod = searchParams.get('period') || 'all';
    const selectedGrade = searchParams.get('grade') || null;
    
    // Calculate total time spent from grade stats
    const totalTimeSpent = Object.values(analyticsSummary.gradeStats)
      .reduce((sum, stats) => sum + stats.totalTimeSpent, 0) * 60; // Convert minutes to seconds
    
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
        // CRITICAL: Use unified analytics data
        gradeWiseStats: analyticsSummary.gradeStats,
        contentStats: analyticsSummary.contentStats,
        summary: {
          totalUsers: analyticsSummary.totalUsers,
          activeUsers: analyticsSummary.activeUsers,
          totalTestsTaken: analyticsSummary.totalTestsTaken,
          lastUpdated: analyticsSummary.lastUpdated,
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
