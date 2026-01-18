import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { skillMasteryTracker } from '@/lib/adaptive/skill-mastery';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get user's skill mastery data
    const skillMasteryRef = adminDb.collection('skillMastery').doc(userId);
    const skillMasterySnap = await skillMasteryRef.get();

    let skillTree;

    if (skillMasterySnap.exists) {
      const data = skillMasterySnap.data();
      skillTree = {
        userId,
        skills: data?.skills || {},
        updatedAt: data?.updatedAt?.toDate() || new Date(),
      };
    } else {
      // Initialize empty skill tree for new user
      skillTree = {
        userId,
        skills: {},
        updatedAt: new Date(),
      };
    }

    return NextResponse.json({
      success: true,
      skillTree,
    });
  } catch (error: any) {
    console.error('Error fetching skill mastery:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch skill mastery' },
      { status: 500 }
    );
  }
}
