/**
 * API Route: GET /api/admin/users
 * Search and list users for admin dashboard
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
    
    // Get search query
    const searchParams = req.nextUrl.searchParams;
    const searchQuery = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Get all users
    const usersSnapshot = await adminDb.collection('users').limit(limit).get();
    
    let users = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email || '',
        displayName: data.displayName || 'Unknown',
        grade: data.grade || null,
        role: data.role || 'student',
        createdAt: data.createdAt ? (data.createdAt as any).toDate().toISOString() : null,
        totalTestsCompleted: data.totalTestsCompleted || 0,
        currentStreak: data.currentStreak || 0,
        xp: data.xp || 0,
        level: data.level || 1,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
      };
    });
    
    // Filter by search query if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      users = users.filter(user => 
        user.email.toLowerCase().includes(query) ||
        user.displayName.toLowerCase().includes(query) ||
        (user.grade && user.grade.toLowerCase().includes(query))
      );
    }
    
    return NextResponse.json({
      success: true,
      users,
      total: users.length,
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch users',
      },
      { status: 500 }
    );
  }
}
