/**
 * Cohort Analytics API
 * Comparative analytics for student groups
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

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
    
    // Get all users
    const usersSnapshot = await adminDb.collection('users')
      .where('role', '==', 'student')
      .get();
    
    // Get all results
    const resultsSnapshot = await adminDb.collection('testResults').get();
    const results = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Group by grade
    const gradeGroups: Record<string, any> = {};
    
    usersSnapshot.docs.forEach(doc => {
      const user = doc.data();
      const grade = user.grade || 'Unknown';
      
      if (!gradeGroups[grade]) {
        gradeGroups[grade] = {
          grade,
          students: [],
          totalStudents: 0,
          totalAttempts: 0,
          totalResults: 0,
          totalTimeSpent: 0,
          scores: [] as number[],
        };
      }
      
      gradeGroups[grade].students.push({
        id: doc.id,
        name: user.displayName || 'Unknown',
        email: user.email || '',
      });
      gradeGroups[grade].totalStudents++;
    });
    
    // Calculate stats for each grade
    Object.keys(gradeGroups).forEach(grade => {
      const group = gradeGroups[grade];
      const studentIds = group.students.map((s: any) => s.id);
      
      const gradeResults = results.filter((r: any) => studentIds.includes(r.userId));
      group.totalResults = gradeResults.length;
      
      const gradeScores = gradeResults.map((r: any) => r.percentage || 0);
      group.scores = gradeScores;
      
      if (gradeScores.length > 0) {
        const sorted = [...gradeScores].sort((a, b) => a - b);
        group.avgScore = gradeScores.reduce((a, b) => a + b, 0) / gradeScores.length;
        group.medianScore = sorted[Math.floor(sorted.length / 2)];
        group.minScore = sorted[0];
        group.maxScore = sorted[sorted.length - 1];
        group.q1 = sorted[Math.floor(sorted.length * 0.25)];
        group.q3 = sorted[Math.floor(sorted.length * 0.75)];
      } else {
        group.avgScore = 0;
        group.medianScore = 0;
        group.minScore = 0;
        group.maxScore = 0;
        group.q1 = 0;
        group.q3 = 0;
      }
      
      const gradeTimes = gradeResults.map((r: any) => r.totalTimeSpent || 0).filter(t => t > 0);
      group.totalTimeSpent = gradeTimes.reduce((a, b) => a + b, 0);
      group.avgTimePerTest = gradeTimes.length > 0 ? gradeTimes.reduce((a, b) => a + b, 0) / gradeTimes.length : 0;
    });
    
    // Calculate improvement leaderboard (top 10 by improvement rate)
    const improvementData: Array<{ userId: string; name: string; improvement: number; recentAvg: number; olderAvg: number }> = [];
    
    usersSnapshot.docs.forEach(doc => {
      const user = doc.data();
      const userId = doc.id;
      const userResults = results.filter((r: any) => r.userId === userId);
      
      if (userResults.length >= 8) {
        const recent = userResults.slice(-4).map((r: any) => r.percentage || 0);
        const older = userResults.slice(-8, -4).map((r: any) => r.percentage || 0);
        
        if (recent.length > 0 && older.length > 0) {
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
          const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
          const improvement = recentAvg - olderAvg;
          
          if (improvement > 0) {
            improvementData.push({
              userId,
              name: user.displayName || 'Unknown',
              improvement: Math.round(improvement * 10) / 10,
              recentAvg: Math.round(recentAvg * 10) / 10,
              olderAvg: Math.round(olderAvg * 10) / 10,
            });
          }
        }
      }
    });
    
    improvementData.sort((a, b) => b.improvement - a.improvement);
    
    // Engagement heatmap data (by day of week)
    const engagementByDay: Record<string, number> = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };
    
    results.forEach((result: any) => {
      if (result.completedAt) {
        const date = (result.completedAt as any)?.toDate() || new Date();
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        if (engagementByDay[dayName] !== undefined) {
          engagementByDay[dayName]++;
        }
      }
    });
    
    // Subject breakdown by grade
    const subjectBreakdown: Record<string, Record<string, { total: number; correct: number; avgScore: number }>> = {};
    
    Object.keys(gradeGroups).forEach(grade => {
      subjectBreakdown[grade] = {
        reading: { total: 0, correct: 0, avgScore: 0 },
        math: { total: 0, correct: 0, avgScore: 0 },
        writing: { total: 0, correct: 0, avgScore: 0 },
      };
      
      const studentIds = gradeGroups[grade].students.map((s: any) => s.id);
      const gradeResults = results.filter((r: any) => studentIds.includes(r.userId));
      
      gradeResults.forEach((result: any) => {
        if (result.sectionScores) {
          result.sectionScores.forEach((section: any) => {
            const subject = section.subject || 'unknown';
            if (subject.includes('reading') || subject.includes('Reading')) {
              subjectBreakdown[grade].reading.total += section.questionsAnswered || 0;
              subjectBreakdown[grade].reading.correct += section.questionsCorrect || 0;
            } else if (subject.includes('math') || subject.includes('Math')) {
              subjectBreakdown[grade].math.total += section.questionsAnswered || 0;
              subjectBreakdown[grade].math.correct += section.questionsCorrect || 0;
            } else if (subject.includes('writing') || subject.includes('Writing')) {
              subjectBreakdown[grade].writing.total += section.questionsAnswered || 0;
              subjectBreakdown[grade].writing.correct += section.questionsCorrect || 0;
            }
          });
        }
      });
      
      // Calculate averages
      Object.keys(subjectBreakdown[grade]).forEach(subject => {
        const data = subjectBreakdown[grade][subject];
        if (data.total > 0) {
          data.avgScore = Math.round((data.correct / data.total) * 100 * 10) / 10;
        }
      });
    });
    
    return NextResponse.json({
      success: true,
      gradeGroups: Object.values(gradeGroups),
      improvementLeaderboard: improvementData.slice(0, 10),
      engagementByDay,
      subjectBreakdown,
    });
  } catch (error: any) {
    console.error('Error fetching cohort analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch cohort analytics',
      },
      { status: 500 }
    );
  }
}
