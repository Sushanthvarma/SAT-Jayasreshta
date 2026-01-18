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
    // Get name from token - try multiple fields (Google provides 'name' in the token)
    const displayName = decodedToken.name || 
                       (decodedToken.email ? decodedToken.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Student');
    const photoURL = decodedToken.picture || null;
    
    console.log('🔍 API: User info from token:', {
      uid: userId,
      name: decodedToken.name,
      email: decodedToken.email,
      hasPicture: !!photoURL,
      extractedDisplayName: displayName,
    });

    // Check if user exists in Firestore
    console.log('🔍 API: Checking Firestore for user:', userId);
    let userRef;
    let userSnap;
    let userData: any = null;
    
    try {
      userRef = adminDb.collection('users').doc(userId);
      userSnap = await userRef.get();
      
      if (userSnap.exists) {
        userData = userSnap.data()!;
      }
    } catch (firestoreError: any) {
      // Handle Firestore API not enabled error gracefully
      const errorMessage = firestoreError.message || String(firestoreError);
      if (errorMessage.includes('PERMISSION_DENIED') || 
          errorMessage.includes('Firestore API') ||
          errorMessage.includes('has not been used')) {
        console.warn('⚠️ Firestore API not enabled. Returning user data from token only.');
        console.warn('💡 Enable Firestore API: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=sat-mock-test-platform');
        // Return user data from token only
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
          warning: 'Firestore API not enabled. Some features may be limited.',
        });
      }
      // Re-throw if it's a different error
      console.error('❌ Firestore error:', errorMessage);
      throw firestoreError;
    }

    if (userSnap && userSnap.exists && userData) {
      console.log('✅ API: User exists, updating lastLoginAt');
      console.log('🔍 API: Current role in Firestore:', userData.role);
      
      // Use the name from token (most recent) or keep existing if token doesn't have it
      const finalDisplayName = displayName !== 'Student' ? displayName : (userData.displayName || userData.name || displayName);
      const finalPhotoURL = photoURL || userData.photoURL || userData.avatar || null;
      
      // IMPORTANT: Always read fresh role from Firestore (don't use cached data)
      // Re-fetch to ensure we get the latest role if it was just updated
      let freshUserData = userData;
      try {
        const freshSnap = await userRef.get();
        if (freshSnap.exists) {
          freshUserData = freshSnap.data()!;
          console.log('🔍 API: Fresh role from Firestore:', freshUserData.role);
        }
      } catch (refreshError) {
        console.warn('⚠️ Could not refresh user data, using cached:', refreshError);
      }
      
      // Update existing user (lastLoginAt and name/photo if changed)
      try {
        await userRef.update({
          lastLoginAt: FieldValue.serverTimestamp(),
          displayName: finalDisplayName, // Always update with latest from Google
          photoURL: finalPhotoURL, // Always update with latest from Google
        });
      } catch (updateError: any) {
        console.warn('⚠️ Could not update user in Firestore:', updateError.message);
        // Continue and return user data anyway
      }

      return NextResponse.json({
        success: true,
        user: {
          uid: userId,
          email,
          displayName: finalDisplayName,
          photoURL: finalPhotoURL,
          role: freshUserData.role || 'student', // Use fresh role from Firestore
          currentStreak: freshUserData.currentStreak || 0,
          longestStreak: freshUserData.longestStreak || 0,
          totalTestsCompleted: freshUserData.totalTestsCompleted || 0,
          badges: freshUserData.badges || [],
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

      try {
        if (userRef) {
          await userRef.set(newUser);
        }
      } catch (createError: any) {
        console.warn('⚠️ Could not create user in Firestore:', createError.message);
        // Continue and return user data anyway
      }

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
