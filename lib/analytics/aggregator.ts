/**
 * Unified Analytics Aggregation System
 * Single source of truth for all analytics calculations
 * 
 * This should be updated via Cloud Functions on every test completion
 * For now, we'll calculate on-demand but ensure consistency
 */

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface AnalyticsSummary {
  lastUpdated: Date;
  totalUsers: number;
  activeUsers: number; // Active in last 30 days
  totalTestsTaken: number;
  gradeStats: Record<string, {
    userCount: number;
    attemptCount: number;
    totalTimeSpent: number; // in minutes
    avgTimePerAttempt: number;
    completedAttempts: number;
  }>;
  contentStats: Record<string, {
    attemptCount: number;
    avgScore: number;
    totalXPAwarded: number;
  }>;
}

/**
 * Calculate unified analytics from all data sources
 * CRITICAL: This is the ONLY function that calculates analytics
 * All admin pages must use this function
 */
export async function calculateUnifiedAnalytics(): Promise<AnalyticsSummary> {
  try {
    console.log('📊 [ANALYTICS] Calculating unified analytics...');
    
    // Get all data in parallel
    const [usersSnapshot, attemptsSnapshot, resultsSnapshot] = await Promise.all([
      adminDb.collection('users').get(),
      adminDb.collection('testAttempts').get(),
      adminDb.collection('testResults').get(),
    ]);
    
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Initialize stats
    const totalUsers = usersSnapshot.size;
    const activeUsers = new Set<string>();
    let totalTestsTaken = 0;
    
    const gradeStats: AnalyticsSummary['gradeStats'] = {};
    const contentStats: AnalyticsSummary['contentStats'] = {};
    
    // User grade map
    const userGradeMap: Record<string, string> = {};
    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      const grade = userData.grade || 'Unknown';
      userGradeMap[doc.id] = grade;
      
      // Initialize grade stats
      if (!gradeStats[grade]) {
        gradeStats[grade] = {
          userCount: 0,
          attemptCount: 0,
          totalTimeSpent: 0,
          avgTimePerAttempt: 0,
          completedAttempts: 0,
        };
      }
      gradeStats[grade].userCount += 1;
    });
    
    // Process attempts
    attemptsSnapshot.docs.forEach(doc => {
      const attempt = doc.data();
      const userId = attempt.userId;
      const grade = userGradeMap[userId] || 'Unknown';
      const timeSpent = Math.round((attempt.totalTimeSpent || 0) / 60); // Convert to minutes
      const isCompleted = attempt.status === 'submitted' || attempt.status === 'completed';
      
      if (isCompleted) {
        totalTestsTaken += 1;
        
        // Track active users
        if (attempt.startedAt) {
          const startedAt = (attempt.startedAt as any)?.toDate() || new Date();
          if (startedAt >= last30Days) {
            activeUsers.add(userId);
          }
        }
        
        // Update grade stats
        if (gradeStats[grade]) {
          gradeStats[grade].attemptCount += 1;
          gradeStats[grade].totalTimeSpent += timeSpent;
          gradeStats[grade].completedAttempts += 1;
        }
        
        // Update content stats (from test metadata or category)
        const category = attempt.testMetadata?.category || 
                        attempt.category || 
                        'Unknown';
        
        if (!contentStats[category]) {
          contentStats[category] = {
            attemptCount: 0,
            avgScore: 0,
            totalXPAwarded: 0,
          };
        }
        
        contentStats[category].attemptCount += 1;
        contentStats[category].totalXPAwarded += (attempt.xpEarned || 0);
      }
    });
    
    // Process results for average scores
    const categoryScores: Record<string, number[]> = {};
    resultsSnapshot.docs.forEach(doc => {
      const result = doc.data();
      const category = result.category || result.testMetadata?.category || 'Unknown';
      
      if (!categoryScores[category]) {
        categoryScores[category] = [];
      }
      
      if (result.percentage !== undefined && result.percentage !== null) {
        categoryScores[category].push(result.percentage);
      }
    });
    
    // Calculate average scores
    Object.keys(categoryScores).forEach(category => {
      const scores = categoryScores[category];
      if (scores.length > 0) {
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        if (contentStats[category]) {
          contentStats[category].avgScore = Math.round(avgScore);
        }
      }
    });
    
    // Calculate averages for grade stats
    Object.keys(gradeStats).forEach(grade => {
      const stats = gradeStats[grade];
      stats.avgTimePerAttempt = stats.completedAttempts > 0
        ? Math.round(stats.totalTimeSpent / stats.completedAttempts)
        : 0;
    });
    
    const summary: AnalyticsSummary = {
      lastUpdated: new Date(),
      totalUsers,
      activeUsers: activeUsers.size,
      totalTestsTaken,
      gradeStats,
      contentStats,
    };
    
    console.log('✅ [ANALYTICS] Unified analytics calculated:', {
      totalUsers,
      activeUsers: activeUsers.size,
      totalTestsTaken,
      grades: Object.keys(gradeStats).length,
      categories: Object.keys(contentStats).length,
    });
    
    return summary;
    
  } catch (error: any) {
    console.error('❌ [ANALYTICS] Failed to calculate unified analytics:', error);
    throw error;
  }
}

/**
 * Update analytics aggregation document
 * Should be called by Cloud Function on test completion
 */
export async function updateAnalyticsAggregation(): Promise<void> {
  try {
    const summary = await calculateUnifiedAnalytics();
    
    const analyticsRef = adminDb.collection('analytics').doc('summary');
    
    await analyticsRef.set({
      ...summary,
      lastUpdated: Timestamp.now(),
    }, { merge: true });
    
    console.log('✅ [ANALYTICS] Aggregation document updated');
    
  } catch (error: any) {
    console.error('❌ [ANALYTICS] Failed to update aggregation:', error);
    throw error;
  }
}

/**
 * Get analytics summary (from aggregation document or calculate on-demand)
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  try {
    // Try to get from aggregation document first
    const analyticsRef = adminDb.collection('analytics').doc('summary');
    const analyticsDoc = await analyticsRef.get();
    
    if (analyticsDoc.exists) {
      const data = analyticsDoc.data()!;
      return {
        ...data,
        lastUpdated: (data.lastUpdated as any)?.toDate() || new Date(),
      } as AnalyticsSummary;
    }
    
    // If aggregation doesn't exist, calculate on-demand
    console.log('⚠️ [ANALYTICS] Aggregation document not found, calculating on-demand...');
    return await calculateUnifiedAnalytics();
    
  } catch (error: any) {
    console.error('❌ [ANALYTICS] Failed to get analytics summary:', error);
    throw error;
  }
}
