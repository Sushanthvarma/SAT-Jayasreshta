/**
 * Test Email API
 * Send a test email to verify email system is working
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sendEmail, generateWeeklyReportHTML } from '@/lib/email/service';
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
    const { to, emailType = 'weekly_report' } = body;
    
    if (!to || !to.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email address required' },
        { status: 400 }
      );
    }
    
    // Generate test email data
    const today = new Date();
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay() - 7);
    const thisSunday = new Date(today);
    thisSunday.setDate(today.getDate() - today.getDay());
    
    const weekStart = lastSunday.toISOString().split('T')[0];
    const weekEnd = thisSunday.toISOString().split('T')[0];
    
    const testEmailData = {
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      testsCompleted: 5,
      avgScore: 85,
      currentStreak: 7,
      badgesEarned: ['🏆', '🔥', '💯'],
      highlights: [
        '✅ You\'re on a <strong>7-day streak!</strong> Keep it going!',
        '📈 You completed <strong>5 tests</strong> this week!',
        '💯 You scored an average of <strong>85%</strong> - Excellent work!',
        '⚡ Fastest time this week: <strong>9 minutes</strong> on Friday\'s test',
      ],
      weeklyTests: [
        { date: '2025-01-15', testTitle: 'Week 1 Day 1 - Reading', score: 90 },
        { date: '2025-01-16', testTitle: 'Week 1 Day 2 - Math', score: 85 },
        { date: '2025-01-17', testTitle: 'Week 1 Day 3 - Writing', score: 88 },
        { date: '2025-01-18', testTitle: 'Week 1 Day 4 - Reading', score: 82 },
        { date: '2025-01-19', testTitle: 'Week 1 Day 5 - Math', score: 80 },
      ],
    };
    
    let emailHtml: string;
    let subject: string;
    
    if (emailType === 'weekly_report') {
      emailHtml = generateWeeklyReportHTML('Test Student', testEmailData);
      subject = '🧪 TEST: Weekly Progress Report - SAT Practice Platform';
    } else if (emailType === 'streak_milestone') {
      emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 40px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
    <div style="font-size: 64px; margin-bottom: 10px;">🔥</div>
    <h1 style="margin: 0; font-size: 32px;">TEST: 10-Day Streak!</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">This is a test email</p>
  </div>
  <div style="background: white; padding: 30px; margin: 0;">
    <h2 style="color: #333; margin-top: 0;">🧪 Test Email</h2>
    <p style="color: #666; line-height: 1.6;">This is a test of the streak milestone email template.</p>
  </div>
</body>
</html>
      `;
      subject = '🧪 TEST: Streak Milestone Email';
    } else {
      emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
  <div style="background: white; padding: 30px; border-radius: 10px;">
    <h2 style="color: #333;">🧪 Test Email</h2>
    <p style="color: #666; line-height: 1.6;">This is a test email from the SAT Practice Platform email system.</p>
    <p style="color: #666; line-height: 1.6;">If you received this email, the email system is working correctly!</p>
    <p style="color: #999; font-size: 12px; margin-top: 30px;">Sent at: ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
      `;
      subject = '🧪 TEST: SAT Practice Platform Email System';
    }
    
    // Send test email
    const emailResult = await sendEmail({
      to,
      subject,
      html: emailHtml,
      userId: decodedToken.uid,
      emailType: 'test',
      customArgs: {
        testEmail: 'true',
        emailType,
      },
    });
    
    // Log test email
    await adminDb.collection('emailLogs').add({
      userId: decodedToken.uid,
      userEmail: to,
      emailType: 'test',
      subject,
      sentAt: Timestamp.now(),
      sendGridId: emailResult.messageId || '',
      status: emailResult.success ? 'sent' : 'failed',
      error: emailResult.error,
      testEmail: true,
    });
    
    return NextResponse.json({
      success: emailResult.success,
      message: emailResult.success
        ? `Test email sent successfully to ${to}! Check your inbox.`
        : `Failed to send test email: ${emailResult.error}`,
      messageId: emailResult.messageId,
      emailType,
    });
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send test email',
      },
      { status: 500 }
    );
  }
}
