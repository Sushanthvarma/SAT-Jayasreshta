import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface GoogleSignInRequest {
  idToken: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: GoogleSignInRequest = await req.json();
    const { idToken } = body;

    if (!idToken) {
      console.error('❌ API: Missing ID token');
      return NextResponse.json(
        { success: false, error: 'ID token is required' },
        { status: 400 }
      );
    }

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
      console.log('✅ API: Token verified for user:', decodedToken.uid);
    } catch (error: any) {
      console.error('❌ API: Token verification failed:', error.message);
      return NextResponse.json(
        { success: false, error: `Invalid token: ${error.message}` },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    const email = decodedToken.email || '';
    const displayName = decodedToken.name || 'Student';
    const photoURL = decodedToken.picture || null;

    // Check if user exists in Firestore
    console.log('🔍 API: Checking Firestore for user:', userId);
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      console.log('✅ API: User exists, updating lastLoginAt');
      // Update existing user (lastLoginAt)
      await userRef.update({
        lastLoginAt: FieldValue.serverTimestamp(),
        displayName: displayName, // Update in case name changed
        photoURL: photoURL, // Update in case photo changed
      });

      const userData = userSnap.data()!;
      return NextResponse.json({
        success: true,
        user: {
          uid: userId,
          email,
          displayName,
          photoURL,
          role: userData.role || 'student',
          currentStreak: userData.currentStreak || 0,
          longestStreak: userData.longestStreak || 0,
          totalTestsCompleted: userData.totalTestsCompleted || 0,
          badges: userData.badges || [],
        },
      });
    } else {
      // Create new user document
      console.log('📝 API: Creating new user document');
      const newUser = {
        uid: userId,
        email,
        displayName,
        photoURL,
        role: 'student' as const,
        createdAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
        currentStreak: 0,
        longestStreak: 0,
        totalTestsCompleted: 0,
        badges: [] as string[],
        lastTestDate: null as string | null,
        preferredSubjects: [] as string[],
      };

      await userRef.set(newUser);

      return NextResponse.json({
        success: true,
        user: {
          uid: userId,
          email,
          displayName,
          photoURL,
          role: 'student',
          currentStreak: 0,
          longestStreak: 0,
          totalTestsCompleted: 0,
          badges: [],
        },
      });
    }
  } catch (error: any) {
    console.error('❌ API: Google sign-in error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Sign-in failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
