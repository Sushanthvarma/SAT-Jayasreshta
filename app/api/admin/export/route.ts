/**
 * Export API - PDF, CSV, Google Sheets
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

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
    
    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv'; // csv, json
    const type = searchParams.get('type') || 'students'; // students, attempts, results
    const userId = searchParams.get('userId'); // Optional: export specific user data
    
    let data: any[] = [];
    
    if (type === 'students') {
      const usersSnapshot = await adminDb.collection('users').get();
      data = usersSnapshot.docs.map(doc => {
        const user = doc.data();
        return {
          id: doc.id,
          name: user.displayName || 'Unknown',
          email: user.email || '',
          grade: user.grade || null,
          testsCompleted: user.totalTestsCompleted || 0,
          streak: user.currentStreak || 0,
          xp: user.xp || 0,
          level: user.level || 1,
          createdAt: user.createdAt ? (user.createdAt as any).toDate().toISOString() : null,
        };
      });
    } else if (type === 'attempts') {
      const attemptsSnapshot = userId
        ? await adminDb.collection('testAttempts').where('userId', '==', userId).get()
        : await adminDb.collection('testAttempts').get();
      
      data = attemptsSnapshot.docs.map(doc => {
        const attempt = doc.data();
        return {
          id: doc.id,
          userId: attempt.userId,
          testId: attempt.testId,
          status: attempt.status,
          startedAt: attempt.startedAt ? (attempt.startedAt as any).toDate().toISOString() : null,
          submittedAt: attempt.submittedAt ? (attempt.submittedAt as any).toDate().toISOString() : null,
          totalTimeSpent: attempt.totalTimeSpent || 0,
        };
      });
    } else if (type === 'results') {
      const resultsSnapshot = userId
        ? await adminDb.collection('testResults').where('userId', '==', userId).get()
        : await adminDb.collection('testResults').get();
      
      data = resultsSnapshot.docs.map(doc => {
        const result = doc.data();
        return {
          id: doc.id,
          userId: result.userId,
          testId: result.testId,
          testTitle: result.testTitle || '',
          totalScore: result.totalScore || 0,
          maxScore: result.maxScore || 0,
          percentage: result.percentage || 0,
          totalTimeSpent: result.totalTimeSpent || 0,
          completedAt: result.completedAt ? (result.completedAt as any).toDate().toISOString() : null,
        };
      });
    }
    
    if (format === 'csv') {
      // Convert to CSV
      if (data.length === 0) {
        return new NextResponse('No data to export', { status: 404 });
      }
      
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        ),
      ];
      
      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else {
      // JSON format
      return NextResponse.json({
        success: true,
        data,
        count: data.length,
        exportedAt: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to export data',
      },
      { status: 500 }
    );
  }
}
