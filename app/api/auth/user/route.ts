import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getUserProfileAdmin } from '@/lib/firestore';
import { FieldValue } from 'firebase-admin/firestore';

// GET - Fetch user profile
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const userProfile = await getUserProfileAdmin(userId);
    
    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(userProfile);
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

// POST - Create or update user profile
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { email, name, role } = await req.json();

    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      // Update existing user
      await userRef.update({
        name: name || userSnap.data()?.name,
        lastLogin: FieldValue.serverTimestamp(),
      });
    } else {
      // Create new user
      await userRef.set({
        email: email || decodedToken.email,
        name: name || decodedToken.name || 'Student',
        role: role || 'student',
        createdAt: FieldValue.serverTimestamp(),
        lastLogin: FieldValue.serverTimestamp(),
        streak: 0,
        badges: [],
        totalTestsCompleted: 0,
      });
    }

    const updatedProfile = await getUserProfileAdmin(userId);
    return NextResponse.json(updatedProfile);
  } catch (error: any) {
    console.error('Error creating/updating user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create/update user profile' },
      { status: 500 }
    );
  }
}
