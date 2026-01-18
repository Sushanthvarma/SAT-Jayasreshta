/**
 * Email Service
 * Handles all email sending via SendGrid
 */

import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface WeeklyReportData {
  weekStartDate: string;
  weekEndDate: string;
  testsCompleted: number;
  avgScore: number;
  currentStreak: number;
  badgesEarned: string[];
  highlights: string[];
  weeklyTests: Array<{
    date: string;
    testTitle: string;
    score: number;
  }>;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  userId?: string;
  emailType?: string;
  customArgs?: Record<string, string>;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Email not sent.');
    return { success: false, error: 'SendGrid not configured' };
  }

  try {
    const msg = {
      to: options.to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@sat-practice.com',
        name: 'SAT Practice Platform',
      },
      subject: options.subject,
      html: options.html,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
      },
      customArgs: {
        userId: options.userId || '',
        emailType: options.emailType || 'general',
        ...options.customArgs,
      },
    };

    const [response] = await sgMail.send(msg);
    
    return {
      success: true,
      messageId: response.headers['x-message-id'] as string,
    };
  } catch (error: any) {
    console.error('SendGrid error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

export function generateWeeklyReportHTML(userName: string, data: WeeklyReportData): string {
  const improvement = data.avgScore >= 80 ? 'excellent' : data.avgScore >= 70 ? 'good' : 'improving';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">📚 Your Weekly Progress Report</h1>
    <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">${data.weekStartDate} - ${data.weekEndDate}</p>
  </div>

  <!-- Greeting -->
  <div style="background: white; padding: 20px; margin: 0;">
    <h2 style="color: #333; margin-top: 0;">Hi ${userName}! 👋</h2>
    <p style="color: #666; line-height: 1.6;">
      You had an <strong>awesome week</strong>! Here's a summary of your progress.
    </p>
  </div>

  <!-- Key Stats -->
  <div style="background: white; padding: 20px; margin: 0;">
    <table width="100%" cellpadding="10" cellspacing="0">
      <tr>
        <td align="center" style="padding: 15px; background: #e3f2fd; border-radius: 8px;">
          <div style="font-size: 32px; font-weight: bold; color: #1976d2;">${data.testsCompleted}</div>
          <div style="font-size: 14px; color: #666;">Tests Completed</div>
        </td>
        <td width="10"></td>
        <td align="center" style="padding: 15px; background: #e8f5e9; border-radius: 8px;">
          <div style="font-size: 32px; font-weight: bold; color: #388e3c;">${Math.round(data.avgScore)}%</div>
          <div style="font-size: 14px; color: #666;">Avg Score</div>
        </td>
        <td width="10"></td>
        <td align="center" style="padding: 15px; background: #fff3e0; border-radius: 8px;">
          <div style="font-size: 32px; font-weight: bold; color: #f57c00;">🔥 ${data.currentStreak}</div>
          <div style="font-size: 14px; color: #666;">Day Streak</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Highlights -->
  <div style="background: white; padding: 20px; margin: 0;">
    <h3 style="color: #333; margin-top: 0;">🌟 This Week's Highlights</h3>
    <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
      ${data.highlights.map(h => `<li>${h}</li>`).join('')}
    </ul>
  </div>

  <!-- Weekly Tests -->
  ${data.weeklyTests.length > 0 ? `
  <div style="background: white; padding: 20px; margin: 0;">
    <h3 style="color: #333; margin-top: 0;">📊 This Week's Tests</h3>
    <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="text-align: left; padding: 10px; border-bottom: 2px solid #ddd;">Day</th>
          <th style="text-align: left; padding: 10px; border-bottom: 2px solid #ddd;">Test</th>
          <th style="text-align: center; padding: 10px; border-bottom: 2px solid #ddd;">Score</th>
        </tr>
      </thead>
      <tbody>
        ${data.weeklyTests.map(test => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${test.date}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${test.testTitle}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
            <span style="background: ${test.score >= 90 ? '#4caf50' : test.score >= 70 ? '#ff9800' : '#f44336'}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${test.score}%</span>
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- Badges -->
  ${data.badgesEarned.length > 0 ? `
  <div style="background: white; padding: 20px; margin: 0;">
    <h3 style="color: #333; margin-top: 0;">🏆 New Badges Unlocked!</h3>
    <table width="100%" cellpadding="10">
      <tr>
        ${data.badgesEarned.map(badge => `
        <td align="center" style="padding: 10px;">
          <div style="font-size: 48px;">${badge}</div>
        </td>
        `).join('')}
      </tr>
    </table>
  </div>
  ` : ''}

  <!-- CTA -->
  <div style="background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%); padding: 20px; margin: 0; text-align: center; border-radius: 0 0 10px 10px;">
    <h3 style="color: #333; margin-top: 0;">Keep Up the Amazing Work! 🚀</h3>
    <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
      You're doing fantastic! Can you keep your streak going this week?
    </p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sat-practice.com'}/student" 
       style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Start Today's Test →
    </a>
  </div>

  <!-- Footer -->
  <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
    <p>SAT Practice Platform | <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sat-practice.com'}/unsubscribe" style="color: #999;">Unsubscribe</a></p>
    <p>Questions? Reply to this email or contact support@sat-practice.com</p>
  </div>

</body>
</html>
  `;
}

export function getEncouragementMessage(avgScore: number, improvement: number): string {
  if (avgScore >= 90 && improvement > 5) {
    return "You're absolutely crushing it! 🌟 Keep up this incredible momentum!";
  } else if (avgScore >= 80) {
    return "Fantastic work this week! You're making great progress! 🎉";
  } else if (avgScore >= 70 && improvement > 0) {
    return "You're improving steadily! Every test makes you stronger! 💪";
  } else if (avgScore >= 70) {
    return "Solid performance! Keep practicing and you'll see even more improvement! 📚";
  } else if (improvement > 5) {
    return "Great improvement! You're on the right track! 🚀";
  } else {
    return "Every test is a learning opportunity! Keep going, you've got this! 💪";
  }
}
