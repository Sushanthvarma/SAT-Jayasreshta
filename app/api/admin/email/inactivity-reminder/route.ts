/**
 * Inactivity Reminder Email API
 * Sends gentle reminders to students who haven't tested in a while
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email/service';
import { Timestamp } from 'firebase-admin/firestore';

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
    const { daysInactive = 3 } = body; // Default to 3 days
    
    // Get all students
    const usersSnapshot = await adminDb.collection('users')
      .where('role', '==', 'student')
      .get();
    
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - daysInactive * 24 * 60 * 60 * 1000);
    
    const results: Array<{ userId: string; success: boolean; error?: string }> = [];
    
    // Find inactive students
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const userId = userDoc.id;
      
      // Check email preferences
      const emailPrefs = user.emailPreferences || {};
      if (emailPrefs.reminderEmails === false) {
        continue;
      }
      
      // Get last attempt
      const lastAttemptSnapshot = await adminDb.collection('testAttempts')
        .where('userId', '==', userId)
        .orderBy('startedAt', 'desc')
        .limit(1)
        .get();
      
      if (lastAttemptSnapshot.empty) {
        // Never tested - skip for now (could send welcome email)
        continue;
      }
      
      const lastAttempt = lastAttemptSnapshot.docs[0].data();
      const lastActive = (lastAttempt.startedAt as any)?.toDate() || new Date(0);
      
      // Check if inactive
      if (lastActive >= cutoffDate) {
        continue; // Still active
      }
      
      const daysSince = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      
      // Generate appropriate email based on days inactive
      let subject = '';
      let emailHtml = '';
      
      if (daysSince === 3) {
        subject = `${user.displayName || 'Student'}, we saved your spot! 📚`;
        emailHtml = generateDay3Email(user.displayName || 'Student', daysSince);
      } else if (daysSince === 5) {
        subject = `Quick 10-minute challenge? 🎯`;
        emailHtml = generateDay5Email(user.displayName || 'Student', daysSince);
      } else if (daysSince >= 7) {
        subject = `We miss you, ${user.displayName || 'Student'}! Let's get back on track 💪`;
        emailHtml = generateDay7Email(user.displayName || 'Student', daysSince);
      } else {
        continue; // Not at a reminder threshold
      }
      
      // Send email
      const emailResult = await sendEmail({
        to: user.email || '',
        subject,
        html: emailHtml,
        userId,
        emailType: 'inactivity_reminder',
        customArgs: {
          daysInactive: daysSince.toString(),
        },
      });
      
      // Log email
      await adminDb.collection('emailLogs').add({
        userId,
        userEmail: user.email || '',
        emailType: 'inactivity_reminder',
        subject,
        sentAt: Timestamp.now(),
        sendGridId: emailResult.messageId || '',
        status: emailResult.success ? 'sent' : 'failed',
        daysInactive: daysSince,
        error: emailResult.error,
      });
      
      results.push({
        userId,
        success: emailResult.success,
        error: emailResult.error,
      });
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} reminder emails`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount,
      },
    });
  } catch (error: any) {
    console.error('Error sending inactivity reminders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send inactivity reminders',
      },
      { status: 500 }
    );
  }
}

function generateDay3Email(userName: string, daysSince: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
  <div style="background: white; padding: 30px; border-radius: 10px;">
    <h2 style="color: #333;">Hi ${userName}! 👋</h2>
    <p style="color: #666; line-height: 1.6;">
      We noticed you haven't tested in ${daysSince} days. We saved your spot! Ready for today's quick practice?
    </p>
    <p style="color: #666; line-height: 1.6;">
      Just 10 minutes can help you stay on track. Your progress is waiting! 🚀
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sat-practice.com'}/student" 
         style="display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Start Today's Test →
      </a>
    </div>
  </div>
</body>
</html>
  `;
}

function generateDay5Email(userName: string, daysSince: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
  <div style="background: white; padding: 30px; border-radius: 10px;">
    <h2 style="color: #333;">Hey ${userName}! 🎯</h2>
    <p style="color: #666; line-height: 1.6;">
      Quick 10-minute challenge? Your streak is waiting! We know you can do it. 💪
    </p>
    <p style="color: #666; line-height: 1.6;">
      Consistency is key to improvement. Just one test today can get you back on track!
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sat-practice.com'}/student" 
         style="display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Take the Challenge →
      </a>
    </div>
  </div>
</body>
</html>
  `;
}

function generateDay7Email(userName: string, daysSince: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
  <div style="background: white; padding: 30px; border-radius: 10px;">
    <h2 style="color: #333;">We miss you, ${userName}! 💪</h2>
    <p style="color: #666; line-height: 1.6;">
      It's been ${daysSince} days since your last test. We're here to help you get back on track!
    </p>
    <p style="color: #666; line-height: 1.6;">
      Remember: Every test is a step forward. No pressure, just progress. You've got this! 🌟
    </p>
    <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="color: #666; margin: 0;"><strong>💡 Tip:</strong> Start with just one test today. Small steps lead to big improvements!</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sat-practice.com'}/student" 
         style="display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Let's Get Back On Track →
      </a>
    </div>
  </div>
</body>
</html>
  `;
}
