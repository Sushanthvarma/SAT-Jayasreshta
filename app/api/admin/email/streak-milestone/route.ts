/**
 * Streak Milestone Email API
 * Sends celebration emails when students reach streak milestones
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email/service';
import { Timestamp } from 'firebase-admin/firestore';

const MILESTONE_STREAKS = [5, 10, 15, 20, 30, 50];

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
    
    const body = await req.json();
    const { userId, streak } = body;
    
    if (!userId || !streak) {
      return NextResponse.json(
        { success: false, error: 'userId and streak are required' },
        { status: 400 }
      );
    }
    
    // Check if this is a milestone
    if (!MILESTONE_STREAKS.includes(streak)) {
      return NextResponse.json(
        { success: false, error: 'Not a milestone streak' },
        { status: 400 }
      );
    }
    
    // Get user data
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    const user = userDoc.data();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User data not found' },
        { status: 404 }
      );
    }
    
    // Check email preferences
    const emailPrefs = user.emailPreferences || {};
    if (emailPrefs.achievementEmails === false) {
      return NextResponse.json({
        success: false,
        error: 'User opted out of achievement emails',
      });
    }
    
    // Get streak stats
    const resultsSnapshot = await adminDb.collection('testResults')
      .where('userId', '==', userId)
      .orderBy('completedAt', 'desc')
      .limit(streak)
      .get();
    
    const streakResults = resultsSnapshot.docs.map(doc => doc.data());
    const avgScoreDuringStreak = streakResults.length > 0
      ? streakResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / streakResults.length
      : 0;
    
    // Generate email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 40px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
    <div style="font-size: 64px; margin-bottom: 10px;">🔥</div>
    <h1 style="margin: 0; font-size: 32px;">WOW! ${streak}-Day Streak!</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">You're on fire, ${user.displayName || 'Student'}!</p>
  </div>

  <!-- Content -->
  <div style="background: white; padding: 30px; margin: 0;">
    <h2 style="color: #333; margin-top: 0;">🎉 Congratulations!</h2>
    <p style="color: #666; line-height: 1.6; font-size: 16px;">
      You've reached an incredible <strong>${streak}-day streak</strong>! This is a huge achievement and shows amazing dedication to your SAT preparation.
    </p>
    
    <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #333; margin-top: 0;">📊 Your Streak Stats</h3>
      <table width="100%" cellpadding="10">
        <tr>
          <td style="text-align: center; padding: 15px; background: #e3f2fd; border-radius: 8px;">
            <div style="font-size: 28px; font-weight: bold; color: #1976d2;">${streak}</div>
            <div style="font-size: 14px; color: #666;">Days in a Row</div>
          </td>
          <td width="20"></td>
          <td style="text-align: center; padding: 15px; background: #e8f5e9; border-radius: 8px;">
            <div style="font-size: 28px; font-weight: bold; color: #388e3c;">${Math.round(avgScoreDuringStreak)}%</div>
            <div style="font-size: 14px; color: #666;">Avg Score</div>
          </td>
        </tr>
      </table>
    </div>
    
    <p style="color: #666; line-height: 1.6; font-size: 16px;">
      ${streak >= 20 
        ? 'You\'re in the top tier of students! This level of consistency is exceptional.'
        : streak >= 10
        ? 'You\'re building incredible momentum! Keep it going!'
        : 'You\'re off to a great start! Can you make it to 10 days?'}
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <h3 style="color: #333;">Next Challenge: ${MILESTONE_STREAKS.find(m => m > streak) || 'Maintain your streak!'} Days! 🚀</h3>
    </div>
  </div>

  <!-- CTA -->
  <div style="background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%); padding: 30px; margin: 0; text-align: center; border-radius: 0 0 10px 10px;">
    <h3 style="color: #333; margin-top: 0;">Keep The Streak Alive! 🔥</h3>
    <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
      Don't let your streak break! Complete today's test to keep it going.
    </p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sat-practice.com'}/student" 
       style="display: inline-block; background: #f59e0b; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
      Continue Your Streak →
    </a>
  </div>

  <!-- Footer -->
  <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
    <p>SAT Practice Platform | <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sat-practice.com'}/unsubscribe" style="color: #999;">Unsubscribe</a></p>
  </div>

</body>
</html>
    `;
    
    // Send email
    const emailResult = await sendEmail({
      to: user.email || '',
      subject: `🔥 WOW! You've reached a ${streak}-day streak, ${user.displayName || 'Student'}!`,
      html: emailHtml,
      userId,
      emailType: 'streak_milestone',
      customArgs: {
        streak: streak.toString(),
      },
    });
    
    // Log email
    await adminDb.collection('emailLogs').add({
      userId,
      userEmail: user.email || '',
      emailType: 'streak_milestone',
      subject: `Streak Milestone: ${streak} days`,
      sentAt: Timestamp.now(),
      sendGridId: emailResult.messageId || '',
      status: emailResult.success ? 'sent' : 'failed',
      streak,
      error: emailResult.error,
    });
    
    return NextResponse.json({
      success: emailResult.success,
      message: emailResult.success 
        ? `Streak milestone email sent to ${user.displayName}`
        : `Failed to send email: ${emailResult.error}`,
      messageId: emailResult.messageId,
    });
  } catch (error: any) {
    console.error('Error sending streak milestone email:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send streak milestone email',
      },
      { status: 500 }
    );
  }
}
