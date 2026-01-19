/**
 * API Route: GET /api/student/insights
 * Returns comprehensive insights and analytics for the authenticated student
 * Optimized for Blaze plan - fetches all data for detailed analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
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

    // Fetch all user data in parallel for comprehensive insights
    const [userDoc, resultsSnapshot, attemptsSnapshot, skillMasteryDoc] = await Promise.all([
      adminDb.collection('users').doc(userId).get(),
      adminDb.collection('testResults').where('userId', '==', userId).get(),
      adminDb.collection('testAttempts').where('userId', '==', userId).get(),
      adminDb.collection('skillMastery').doc(userId).get(),
    ]);

    const userData = userDoc.data();
    const results = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const attempts = attemptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const skillMastery = skillMasteryDoc.exists ? skillMasteryDoc.data() : null;

    // Calculate comprehensive insights
    const insights = {
      // Overall Performance
      overall: {
        totalTests: results.length,
        totalAttempts: attempts.length,
        completionRate: attempts.length > 0 ? (results.length / attempts.length) * 100 : 0,
        averageScore: results.length > 0
          ? results.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) / results.length
          : 0,
        bestScore: results.length > 0
          ? Math.max(...results.map((r: any) => r.percentage || 0))
          : 0,
        improvement: results.length >= 2
          ? results[0].percentage - results[results.length - 1].percentage
          : 0,
      },

      // Subject Performance
      subjects: {
        reading: calculateSubjectStats(results, 'reading'),
        writing: calculateSubjectStats(results, 'writing'),
        math: calculateSubjectStats(results, 'math'),
      },

      // Time Analysis
      timeAnalysis: {
        totalTimeSpent: results.reduce((sum: number, r: any) => sum + (r.totalTimeSpent || 0), 0),
        averageTimePerTest: results.length > 0
          ? results.reduce((sum: number, r: any) => sum + (r.totalTimeSpent || 0), 0) / results.length
          : 0,
        averageTimePerQuestion: results.length > 0
          ? results.reduce((sum: number, r: any) => sum + (r.averageTimePerQuestion || 0), 0) / results.length
          : 0,
        timeEfficiency: results.length > 0
          ? results.reduce((sum: number, r: any) => sum + (r.timeEfficiency || 0), 0) / results.length
          : 0,
      },

      // Trend Analysis
      trends: {
        recentPerformance: calculateRecentTrend(results, 5),
        weeklyProgress: calculateWeeklyProgress(results),
        monthlyProgress: calculateMonthlyProgress(results),
        scoreDistribution: calculateScoreDistribution(results),
      },

      // Strengths & Weaknesses
      performance: {
        strengths: extractStrengths(results),
        weaknesses: extractWeaknesses(results),
        recommendations: generateRecommendations(results, skillMastery),
      },

      // Engagement Metrics
      engagement: {
        activeDays: calculateActiveDays(attempts),
        averageTestsPerWeek: calculateTestsPerWeek(attempts),
        longestStreak: userData?.longestStreak || 0,
        currentStreak: userData?.currentStreak || 0,
        lastActiveDate: userData?.lastTestDate || null,
      },

      // Skill Mastery
      skills: skillMastery?.skills || {},

      // Goal Progress
      goals: {
        targetScore: userData?.targetSATScore || null,
        currentAverage: results.length > 0
          ? results.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) / results.length
          : 0,
        progressToGoal: userData?.targetSATScore
          ? ((results.length > 0
              ? results.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) / results.length
              : 0) / userData.targetSATScore) * 100
          : null,
      },
    };

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (error: any) {
    console.error('Error fetching student insights:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateSubjectStats(results: any[], subject: string) {
  const subjectResults = results.flatMap((r: any) =>
    (r.sectionScores || []).filter((s: any) => s.subject === subject || s.subject?.includes(subject))
  );

  if (subjectResults.length === 0) {
    return {
      average: 0,
      best: 0,
      testsCount: 0,
      trend: 0,
    };
  }

  const scores = subjectResults.map((s: any) => s.percentage || 0);
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const best = Math.max(...scores);
  const recent = scores.slice(0, 5);
  const older = scores.slice(5, 10);
  const trend = recent.length > 0 && older.length > 0
    ? (recent.reduce((a, b) => a + b, 0) / recent.length) - (older.reduce((a, b) => a + b, 0) / older.length)
    : 0;

  return {
    average: Math.round(average),
    best: Math.round(best),
    testsCount: subjectResults.length,
    trend: Math.round(trend),
  };
}

function calculateRecentTrend(results: any[], count: number) {
  if (results.length < 2) return { direction: 'stable', change: 0 };
  
  const recent = results.slice(0, count).map((r: any) => r.percentage || 0);
  const previous = results.slice(count, count * 2).map((r: any) => r.percentage || 0);
  
  if (previous.length === 0) return { direction: 'stable', change: 0 };
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
  const change = recentAvg - previousAvg;
  
  return {
    direction: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
    change: Math.round(change),
  };
}

function calculateWeeklyProgress(results: any[]) {
  const now = new Date();
  const weeks: { [key: string]: { count: number; avgScore: number } } = {};
  
  results.forEach((result: any) => {
    const date = result.completedAt?.toDate ? result.completedAt.toDate() : new Date(result.completedAt);
    const weekKey = `${date.getFullYear()}-W${getWeekNumber(date)}`;
    
    if (!weeks[weekKey]) {
      weeks[weekKey] = { count: 0, avgScore: 0 };
    }
    
    weeks[weekKey].count++;
    weeks[weekKey].avgScore += result.percentage || 0;
  });
  
  return Object.entries(weeks).map(([week, data]) => ({
    week,
    testsCount: data.count,
    averageScore: Math.round(data.avgScore / data.count),
  })).sort((a, b) => a.week.localeCompare(b.week));
}

function calculateMonthlyProgress(results: any[]) {
  const months: { [key: string]: { count: number; avgScore: number } } = {};
  
  results.forEach((result: any) => {
    const date = result.completedAt?.toDate ? result.completedAt.toDate() : new Date(result.completedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!months[monthKey]) {
      months[monthKey] = { count: 0, avgScore: 0 };
    }
    
    months[monthKey].count++;
    months[monthKey].avgScore += result.percentage || 0;
  });
  
  return Object.entries(months).map(([month, data]) => ({
    month,
    testsCount: data.count,
    averageScore: Math.round(data.avgScore / data.count),
  })).sort((a, b) => a.month.localeCompare(b.month));
}

function calculateScoreDistribution(results: any[]) {
  const distribution = {
    excellent: 0, // 90-100
    good: 0,      // 70-89
    average: 0,   // 50-69
    needsImprovement: 0, // <50
  };
  
  results.forEach((result: any) => {
    const score = result.percentage || 0;
    if (score >= 90) distribution.excellent++;
    else if (score >= 70) distribution.good++;
    else if (score >= 50) distribution.average++;
    else distribution.needsImprovement++;
  });
  
  return distribution;
}

function extractStrengths(results: any[]): string[] {
  const topicPerformance: { [key: string]: number[] } = {};
  
  results.forEach((result: any) => {
    (result.topicPerformance || []).forEach((tp: any) => {
      if (!topicPerformance[tp.topic]) {
        topicPerformance[tp.topic] = [];
      }
      topicPerformance[tp.topic].push(tp.percentage || 0);
    });
  });
  
  const strengths = Object.entries(topicPerformance)
    .map(([topic, scores]) => ({
      topic,
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))
    .filter(item => item.average >= 80)
    .sort((a, b) => b.average - a.average)
    .slice(0, 5)
    .map(item => item.topic);
  
  return strengths;
}

function extractWeaknesses(results: any[]): string[] {
  const topicPerformance: { [key: string]: number[] } = {};
  
  results.forEach((result: any) => {
    (result.topicPerformance || []).forEach((tp: any) => {
      if (!topicPerformance[tp.topic]) {
        topicPerformance[tp.topic] = [];
      }
      topicPerformance[tp.topic].push(tp.percentage || 0);
    });
  });
  
  const weaknesses = Object.entries(topicPerformance)
    .map(([topic, scores]) => ({
      topic,
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))
    .filter(item => item.average < 60)
    .sort((a, b) => a.average - b.average)
    .slice(0, 5)
    .map(item => item.topic);
  
  return weaknesses;
}

function generateRecommendations(results: any[], skillMastery: any): string[] {
  const recommendations: string[] = [];
  
  if (results.length === 0) {
    return ['Complete your first test to get personalized recommendations!'];
  }
  
  const avgScore = results.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) / results.length;
  
  if (avgScore < 60) {
    recommendations.push('Focus on fundamental concepts and practice regularly');
    recommendations.push('Review basic concepts before attempting advanced topics');
  } else if (avgScore < 80) {
    recommendations.push('Continue practicing to improve consistency');
    recommendations.push('Focus on time management during tests');
  } else {
    recommendations.push('Great job! Challenge yourself with more difficult tests');
    recommendations.push('Maintain your performance with regular practice');
  }
  
  const weaknesses = extractWeaknesses(results);
  if (weaknesses.length > 0) {
    recommendations.push(`Focus on improving: ${weaknesses.slice(0, 3).join(', ')}`);
  }
  
  return recommendations;
}

function calculateActiveDays(attempts: any[]): number {
  const days = new Set();
  attempts.forEach((attempt: any) => {
    const date = attempt.startedAt?.toDate ? attempt.startedAt.toDate() : new Date(attempt.startedAt);
    days.add(date.toDateString());
  });
  return days.size;
}

function calculateTestsPerWeek(attempts: any[]): number {
  if (attempts.length === 0) return 0;
  
  const firstDate = attempts[attempts.length - 1].startedAt?.toDate 
    ? attempts[attempts.length - 1].startedAt.toDate() 
    : new Date(attempts[attempts.length - 1].startedAt);
  const lastDate = attempts[0].startedAt?.toDate 
    ? attempts[0].startedAt.toDate() 
    : new Date(attempts[0].startedAt);
  
  const weeks = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
  return Math.round((attempts.length / weeks) * 10) / 10;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
