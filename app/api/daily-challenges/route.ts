import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { generateDailyChallenges, updateChallengeProgress } from '@/lib/gamification/daily-challenges';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get user data
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const userData = userSnap.data();
    
    // Get or create today's challenges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().split('T')[0];
    
    const challengesRef = adminDb.collection('dailyChallenges').doc(`${userId}_${todayKey}`);
    const challengesSnap = await challengesRef.get();

    let challenges: any[];

    if (challengesSnap.exists) {
      // Return existing challenges
      const data = challengesSnap.data();
      challenges = data?.challenges || [];
    } else {
      // Generate new challenges for today
      const recentActivity = {
        lastTestScore: userData?.lastTestScore,
        lastTestDate: userData?.lastTestDate,
      };

      challenges = generateDailyChallenges({
        skillLevel: userData?.level || 1,
        recentActivity,
        currentStreak: userData?.currentStreak || 0,
      });

      // Save to Firestore
      await challengesRef.set({
        userId,
        date: Timestamp.fromDate(today),
        challenges: challenges.map(c => ({
          ...c,
          completedAt: c.completedAt ? Timestamp.fromDate(c.completedAt) : null,
        })),
        createdAt: Timestamp.now(),
      });
    }

    // Convert Firestore timestamps back to dates
    const processedChallenges = challenges.map(c => ({
      ...c,
      completedAt: c.completedAt?.toDate ? c.completedAt.toDate() : c.completedAt,
    }));

    return NextResponse.json({
      success: true,
      challenges: processedChallenges,
    });
  } catch (error: any) {
    console.error('Error fetching daily challenges:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch daily challenges' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const body = await req.json();
    const { activity } = body;

    // Get today's challenges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().split('T')[0];
    
    const challengesRef = adminDb.collection('dailyChallenges').doc(`${userId}_${todayKey}`);
    const challengesSnap = await challengesRef.get();

    if (!challengesSnap.exists) {
      return NextResponse.json({ success: false, error: 'Challenges not found' }, { status: 404 });
    }

    const data = challengesSnap.data();
    let challenges = data?.challenges || [];

    // Update challenge progress
    challenges = updateChallengeProgress(challenges, activity);

    // Save updated challenges
    await challengesRef.set({
      ...data,
      challenges: challenges.map((c: any) => ({
        ...c,
        completedAt: c.completedAt ? Timestamp.fromDate(c.completedAt) : null,
      })),
      updatedAt: Timestamp.now(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      challenges: challenges.map((c: any) => ({
        ...c,
        completedAt: c.completedAt?.toDate ? c.completedAt.toDate() : c.completedAt,
      })),
    });
  } catch (error: any) {
    console.error('Error updating daily challenges:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update daily challenges' },
      { status: 500 }
    );
  }
}
