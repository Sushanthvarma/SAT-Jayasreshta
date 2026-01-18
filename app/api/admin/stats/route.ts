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
    
    if (!userSnap.exists() || userSnap.data()?.role !== 'admin') {
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
    
    // Get all tests
    const tests: Test[] = testsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as any)?.toDate() || new Date(),
        updatedAt: (data.updatedAt as any)?.toDate() || new Date(),
        publishedAt: (data.publishedAt as any)?.toDate(),
      } as Test;
    });
    
    return NextResponse.json({
      success: true,
      stats: {
        totalTests,
        publishedTests,
        totalUsers,
        totalAttempts,
      },
      tests,
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
