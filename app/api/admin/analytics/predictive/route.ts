/**
 * Predictive Analytics API
 * Calculates risk scores and predicts at-risk students
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
    
    // Get all students
    const usersSnapshot = await adminDb.collection('users')
      .where('role', '==', 'student')
      .get();
    
    // Get all results and attempts
    const [resultsSnapshot, attemptsSnapshot] = await Promise.all([
      adminDb.collection('testResults').get(),
      adminDb.collection('testAttempts').get(),
    ]);
    
    const results = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const attempts = attemptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const atRiskStudents: Array<{
      userId: string;
      name: string;
      email: string;
      riskScore: number;
      riskLevel: 'low' | 'medium' | 'high';
      reasons: string[];
      lastActive: string | null;
      avgScore: number;
      trend: 'improving' | 'declining' | 'stable';
    }> = [];
    
    // Calculate risk score for each student
    usersSnapshot.docs.forEach(doc => {
      const user = doc.data();
      const userId = doc.id;
      
      const userResults = results.filter((r: any) => r.userId === userId);
      const userAttempts = attempts.filter((a: any) => a.userId === userId);
      
      // Feature 1: Days since last test
      const lastAttempt = userAttempts
        .map(a => (a.startedAt as any)?.toDate() || new Date(0))
        .sort((a, b) => b.getTime() - a.getTime())[0];
      
      const daysSinceLastTest = lastAttempt 
        ? Math.floor((now.getTime() - lastAttempt.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      
      // Feature 2: Score trend
      let scoreTrend: 'improving' | 'declining' | 'stable' = 'stable';
      let scoreDecline = 0;
      
      if (userResults.length >= 5) {
        const recent = userResults.slice(-5).map((r: any) => r.percentage || 0);
        const older = userResults.slice(-10, -5).map((r: any) => r.percentage || 0);
        
        if (older.length > 0) {
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
          const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
          scoreDecline = olderAvg - recentAvg;
          
          if (scoreDecline > 15) {
            scoreTrend = 'declining';
          } else if (recentAvg > olderAvg + 5) {
            scoreTrend = 'improving';
          }
        }
      }
      
      // Feature 3: Average score
      const avgScore = userResults.length > 0
        ? userResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / userResults.length
        : 0;
      
      // Feature 4: Streak status
      const hasActiveStreak = (user.currentStreak || 0) > 0;
      const brokeStreak = (user.currentStreak || 0) === 0 && (user.longestStreak || 0) > 7;
      
      // Calculate risk score (0-100)
      let riskScore = 0;
      const reasons: string[] = [];
      
      // Days since last test (max 40 points)
      if (daysSinceLastTest >= 7) {
        riskScore += 40;
        reasons.push(`No activity in ${daysSinceLastTest} days`);
      } else if (daysSinceLastTest >= 3) {
        riskScore += 20;
        reasons.push(`No activity in ${daysSinceLastTest} days`);
      }
      
      // Score decline (max 30 points)
      if (scoreDecline > 15) {
        riskScore += 30;
        reasons.push(`Score declining by ${Math.round(scoreDecline)}%`);
      } else if (scoreDecline > 10) {
        riskScore += 15;
        reasons.push(`Score declining by ${Math.round(scoreDecline)}%`);
      }
      
      // Low average score (max 20 points)
      if (avgScore < 50 && userResults.length >= 5) {
        riskScore += 20;
        reasons.push(`Average score is ${Math.round(avgScore)}%`);
      } else if (avgScore < 60 && userResults.length >= 5) {
        riskScore += 10;
        reasons.push(`Average score is ${Math.round(avgScore)}%`);
      }
      
      // Streak broken (max 10 points)
      if (brokeStreak) {
        riskScore += 10;
        reasons.push('Broke a long streak');
      }
      
      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (riskScore >= 60) {
        riskLevel = 'high';
      } else if (riskScore >= 30) {
        riskLevel = 'medium';
      }
      
      // Only include students with some risk
      if (riskScore > 0) {
        atRiskStudents.push({
          userId,
          name: user.displayName || 'Unknown',
          email: user.email || '',
          riskScore: Math.round(riskScore),
          riskLevel,
          reasons,
          lastActive: lastAttempt ? lastAttempt.toISOString() : null,
          avgScore: Math.round(avgScore * 10) / 10,
          trend: scoreTrend,
        });
      }
    });
    
    // Sort by risk score (highest first)
    atRiskStudents.sort((a, b) => b.riskScore - a.riskScore);
    
    // Goal achievement predictions
    const goalPredictions: Array<{
      userId: string;
      name: string;
      currentAvg: number;
      targetScore: number;
      testsRemaining: number;
      requiredScore: number;
      probability: number;
      recommendation: string;
    }> = [];
    
    // Simplified goal prediction (would need actual goal data from user profile)
    usersSnapshot.docs.forEach(doc => {
      const user = doc.data();
      const userId = doc.id;
      const userResults = results.filter((r: any) => r.userId === userId);
      
      if (userResults.length >= 5) {
        const currentAvg = userResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / userResults.length;
        const targetScore = 85; // Default target
        const testsRemaining = 10; // Estimated
        
        // Calculate required score to reach target
        const totalTests = userResults.length + testsRemaining;
        const requiredScore = ((targetScore * totalTests) - (currentAvg * userResults.length)) / testsRemaining;
        
        // Estimate probability based on past performance
        const recentScores = userResults.slice(-5).map((r: any) => r.percentage || 0);
        const scoresAboveRequired = recentScores.filter(s => s >= requiredScore).length;
        const probability = (scoresAboveRequired / recentScores.length) * 100;
        
        if (requiredScore > 0 && requiredScore <= 100) {
          goalPredictions.push({
            userId,
            name: user.displayName || 'Unknown',
            currentAvg: Math.round(currentAvg * 10) / 10,
            targetScore,
            testsRemaining,
            requiredScore: Math.round(requiredScore * 10) / 10,
            probability: Math.round(probability * 10) / 10,
            recommendation: probability >= 70 
              ? 'Goal is achievable!'
              : probability >= 40
              ? 'Goal may be challenging. Consider adjusting target.'
              : 'Goal may be too ambitious. Suggest lower target.',
          });
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      atRiskStudents: atRiskStudents.slice(0, 20), // Top 20
      goalPredictions: goalPredictions.slice(0, 10),
      summary: {
        totalStudents: usersSnapshot.size,
        highRisk: atRiskStudents.filter(s => s.riskLevel === 'high').length,
        mediumRisk: atRiskStudents.filter(s => s.riskLevel === 'medium').length,
        lowRisk: atRiskStudents.filter(s => s.riskLevel === 'low').length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching predictive analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch predictive analytics',
      },
      { status: 500 }
    );
  }
}
