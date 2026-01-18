/**
 * Data Quality Monitoring API
 * Checks for data quality issues and runs daily aggregations
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
    
    const issues: string[] = [];
    const stats: any = {
      totalUsers: 0,
      totalAttempts: 0,
      totalResults: 0,
      orphanedAttempts: 0,
      invalidScores: 0,
      missingFields: 0,
      duplicateAttempts: 0,
    };
    
    // Get all data
    const [usersSnapshot, attemptsSnapshot, resultsSnapshot] = await Promise.all([
      adminDb.collection('users').get(),
      adminDb.collection('testAttempts').get(),
      adminDb.collection('testResults').get(),
    ]);
    
    stats.totalUsers = usersSnapshot.size;
    stats.totalAttempts = attemptsSnapshot.size;
    stats.totalResults = resultsSnapshot.size;
    
    const userIds = new Set(usersSnapshot.docs.map(doc => doc.id));
    
    // Check 1: Orphaned attempts (userId doesn't exist)
    for (const attemptDoc of attemptsSnapshot.docs) {
      const attempt = attemptDoc.data();
      if (!userIds.has(attempt.userId)) {
        issues.push(`Orphaned attempt: ${attemptDoc.id} (userId: ${attempt.userId} doesn't exist)`);
        stats.orphanedAttempts++;
      }
    }
    
    // Check 2: Invalid scores (score > totalQuestions or score < 0)
    for (const resultDoc of resultsSnapshot.docs) {
      const result = resultDoc.data();
      if (result.totalScore !== undefined && result.maxScore !== undefined) {
        if (result.totalScore > result.maxScore || result.totalScore < 0) {
          issues.push(`Invalid score: ${resultDoc.id} (${result.totalScore}/${result.maxScore})`);
          stats.invalidScores++;
        }
      }
    }
    
    // Check 3: Missing required fields
    for (const attemptDoc of attemptsSnapshot.docs) {
      const attempt = attemptDoc.data();
      if (!attempt.userId || !attempt.testId || attempt.status === undefined) {
        issues.push(`Missing fields in attempt: ${attemptDoc.id}`);
        stats.missingFields++;
      }
    }
    
    for (const resultDoc of resultsSnapshot.docs) {
      const result = resultDoc.data();
      if (!result.userId || !result.testId || result.percentage === undefined) {
        issues.push(`Missing fields in result: ${resultDoc.id}`);
        stats.missingFields++;
      }
    }
    
    // Check 4: Duplicate attempts (same user, test, same day)
    const attemptMap = new Map<string, string[]>();
    for (const attemptDoc of attemptsSnapshot.docs) {
      const attempt = attemptDoc.data();
      const key = `${attempt.userId}_${attempt.testId}`;
      if (!attemptMap.has(key)) {
        attemptMap.set(key, []);
      }
      attemptMap.get(key)!.push(attemptDoc.id);
    }
    
    // Check for multiple attempts on same day
    for (const [key, attemptIds] of attemptMap.entries()) {
      if (attemptIds.length > 1) {
        const attempts = attemptIds.map(id => attemptsSnapshot.docs.find(d => d.id === id)?.data()).filter(Boolean);
        const dates = attempts.map(a => {
          const startedAt = (a!.startedAt as any)?.toDate();
          return startedAt ? startedAt.toISOString().split('T')[0] : null;
        });
        
        const dateCounts = new Map<string, number>();
        dates.forEach(date => {
          if (date) {
            dateCounts.set(date, (dateCounts.get(date) || 0) + 1);
          }
        });
        
        for (const [date, count] of dateCounts.entries()) {
          if (count > 1) {
            issues.push(`Possible duplicate attempts: ${key} on ${date} (${count} attempts)`);
            stats.duplicateAttempts += count - 1;
          }
        }
      }
    }
    
    // Calculate daily aggregation stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);
    
    const todayAttempts = attemptsSnapshot.docs.filter(doc => {
      const startedAt = (doc.data().startedAt as any)?.toDate();
      return startedAt && startedAt >= today;
    }).length;
    
    const todayResults = resultsSnapshot.docs.filter(doc => {
      const completedAt = (doc.data().completedAt as any)?.toDate();
      return completedAt && completedAt >= today;
    }).length;
    
    // Save daily aggregation
    const dailyStatsDoc = {
      date: today.toISOString().split('T')[0],
      totalUsers: stats.totalUsers,
      totalAttempts: stats.totalAttempts,
      totalResults: stats.totalResults,
      todayAttempts,
      todayResults,
      dataQualityIssues: issues.length,
      timestamp: Timestamp.now(),
    };
    
    await adminDb.collection('dailyStats').doc(today.toISOString().split('T')[0]).set(dailyStatsDoc, { merge: true });
    
    return NextResponse.json({
      success: true,
      issues,
      stats,
      dailyAggregation: dailyStatsDoc,
      summary: {
        totalIssues: issues.length,
        criticalIssues: issues.filter(i => i.includes('Invalid') || i.includes('Orphaned')).length,
        warnings: issues.filter(i => !i.includes('Invalid') && !i.includes('Orphaned')).length,
      },
    });
  } catch (error: any) {
    console.error('Error running data quality check:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to run data quality check',
      },
      { status: 500 }
    );
  }
}
