/**
 * API Route: POST /api/admin/email/weekly-reports
 * Send weekly progress reports to all active students
 * This should be called by a scheduled task (cron job or Cloud Scheduler)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sendEmail, generateWeeklyReportHTML, getEncouragementMessage } from '@/lib/email/service';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
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
    
    // Get week range
    const today = new Date();
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay() - 7); // Previous Sunday
    const thisSunday = new Date(today);
    thisSunday.setDate(today.getDate() - today.getDay()); // This Sunday
    
    const weekStart = lastSunday.toISOString().split('T')[0];
    const weekEnd = thisSunday.toISOString().split('T')[0];
    
    // Get all active students
    const usersSnapshot = await adminDb.collection('users')
      .where('role', '==', 'student')
      .get();
    
    const results: Array<{ userId: string; success: boolean; error?: string }> = [];
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const userId = userDoc.id;
      
      // Check email preferences
      const emailPrefs = user.emailPreferences || {};
      if (emailPrefs.weeklyReport === false) {
        results.push({ userId, success: false, error: 'User opted out' });
        continue;
      }
      
      // Get user's test results from this week
      // Note: This query requires a composite index on testResults: userId (ASC), completedAt (ASC)
      // Create it via Firebase Console or deploy firestore.indexes.json
      let resultsSnapshot;
      try {
        resultsSnapshot = await adminDb.collection('testResults')
          .where('userId', '==', userId)
          .where('completedAt', '>=', Timestamp.fromDate(lastSunday))
          .where('completedAt', '<=', Timestamp.fromDate(thisSunday))
          .get();
      } catch (error: any) {
        // Fallback: Fetch all user results and filter in memory if index doesn't exist
        if (error.message?.includes('index')) {
          console.warn('⚠️ Firestore index not found, fetching all results and filtering in memory');
          const allResults = await adminDb.collection('testResults')
            .where('userId', '==', userId)
            .get();
          
          resultsSnapshot = {
            docs: allResults.docs.filter(doc => {
              const data = doc.data();
              if (!data.completedAt) return false;
              const completedAt = (data.completedAt as any)?.toDate() || new Date();
              return completedAt >= lastSunday && completedAt <= thisSunday;
            }),
            empty: false,
          } as any;
        } else {
          throw error;
        }
      }
      
      const weeklyResults = resultsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          date: data.completedAt ? (data.completedAt as any).toDate().toISOString().split('T')[0] : '',
          testTitle: data.testTitle || 'Test',
          score: data.percentage || 0,
        };
      });
      
      // Calculate stats
      const testsCompleted = weeklyResults.length;
      const avgScore = weeklyResults.length > 0
        ? weeklyResults.reduce((sum, r) => sum + r.score, 0) / weeklyResults.length
        : 0;
      
      // Get badges earned this week (simplified - would need badge tracking)
      const badgesEarned: string[] = []; // TODO: Track badges earned this week
      
      // Generate highlights
      const highlights: string[] = [];
      if (user.currentStreak > 0) {
        highlights.push(`✅ You're on a <strong>${user.currentStreak}-day streak!</strong> Keep it going!`);
      }
      if (testsCompleted > 0) {
        highlights.push(`📈 You completed <strong>${testsCompleted} test${testsCompleted > 1 ? 's' : ''}</strong> this week!`);
      }
      if (avgScore >= 90) {
        highlights.push(`💯 You scored an average of <strong>${Math.round(avgScore)}%</strong> - Excellent work!`);
      } else if (avgScore >= 80) {
        highlights.push(`📚 Your average score is <strong>${Math.round(avgScore)}%</strong> - Great job!`);
      }
      
      if (highlights.length === 0) {
        highlights.push('💪 Ready to start this week? Complete your first test!');
      }
      
      // Generate email
      const emailData = {
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        testsCompleted,
        avgScore,
        currentStreak: user.currentStreak || 0,
        badgesEarned,
        highlights,
        weeklyTests: weeklyResults,
      };
      
      const emailHtml = generateWeeklyReportHTML(user.displayName || 'Student', emailData);
      const encouragement = getEncouragementMessage(avgScore, 0);
      
      const emailResult = await sendEmail({
        to: user.email || '',
        subject: testsCompleted > 0 
          ? `🎉 Great week, ${user.displayName || 'Student'}! You completed ${testsCompleted} test${testsCompleted > 1 ? 's' : ''}!`
          : `📚 Your SAT Practice Weekly Report - ${weekStart} to ${weekEnd}`,
        html: emailHtml,
        userId,
        emailType: 'weekly_report',
        customArgs: {
          weekStart,
          weekEnd,
        },
      });
      
      // Log email
      await adminDb.collection('emailLogs').add({
        userId,
        userEmail: user.email || '',
        emailType: 'weekly_report',
        subject: emailResult.success ? `Weekly Report - ${weekStart}` : 'Failed to send',
        sentAt: Timestamp.now(),
        sendGridId: emailResult.messageId || '',
        status: emailResult.success ? 'sent' : 'failed',
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        testsCompleted,
        avgScore,
        currentStreak: user.currentStreak || 0,
        error: emailResult.error,
      });
      
      results.push({
        userId,
        success: emailResult.success,
        error: emailResult.error,
      });
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} emails, ${failureCount} failed`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
    });
  } catch (error: any) {
    console.error('Error sending weekly reports:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send weekly reports',
      },
      { status: 500 }
    );
  }
}
