/**
 * API Route: POST /api/admin/sync-user-stats
 * Syncs user statistics by recounting test results
 * Useful for fixing discrepancies in totalTestsCompleted
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Verify admin role
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists || userSnap.data()?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const targetUserId = body.userId;
    
    // If no userId provided, sync all users
    if (!targetUserId) {
      return syncAllUsers();
    }

    // Count actual test results for this user
    const resultsSnapshot = await adminDb
      .collection('testResults')
      .where('userId', '==', targetUserId)
      .get();

    const actualCount = resultsSnapshot.size;

    // Update user document with correct count
    const targetUserRef = adminDb.collection('users').doc(targetUserId);
    await targetUserRef.update({
      totalTestsCompleted: actualCount,
    });

    // Also recalculate average score
    if (resultsSnapshot.size > 0) {
      const totalScore = resultsSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.totalScore || 0);
      }, 0);
      
      const maxScore = resultsSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.maxScore || 0);
      }, 0);

      const averageScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

      await targetUserRef.update({
        totalScore: totalScore,
        averageScore: averageScore,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'User stats synced successfully',
      userId: targetUserId,
      totalTestsCompleted: actualCount,
      previousCount: userSnap.data()?.totalTestsCompleted || 0,
    });
  } catch (error: any) {
    console.error('Error syncing user stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync user stats' },
      { status: 500 }
    );
  }
}

async function syncAllUsers() {
  try {
    const usersSnapshot = await adminDb.collection('users').get();
    const results: Array<{ userId: string; previous: number; actual: number }> = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // Count actual test results
      const resultsSnapshot = await adminDb
        .collection('testResults')
        .where('userId', '==', userId)
        .get();
      
      const actualCount = resultsSnapshot.size;
      const previousCount = userData.totalTestsCompleted || 0;
      
      if (actualCount !== previousCount) {
        // Update user document
        await adminDb.collection('users').doc(userId).update({
          totalTestsCompleted: actualCount,
        });
        
        results.push({ userId, previous: previousCount, actual: actualCount });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Synced ${results.length} users`,
      synced: results,
      totalUsers: usersSnapshot.size,
    });
  } catch (error: any) {
    console.error('Error syncing all users:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync all users' },
      { status: 500 }
    );
  }
}
