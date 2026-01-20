/**
 * CRITICAL: Difficulty Value Migration Script
 * 
 * Run this ONCE to fix all existing test difficulty values
 * This ensures all tests use standard difficulty values: "Easy", "Medium", or "Hard"
 * 
 * Usage:
 * 1. Open browser console on your app
 * 2. Import and run: await migrateDifficultyValues()
 */

import { collection, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { getDbInstance } from '@/lib/firebase';
import { DIFFICULTY_MIGRATION_MAP, DIFFICULTY_LEVELS, normalizeDifficulty } from '@/lib/firebase/testManagement';

/**
 * CRITICAL: Run this ONCE to fix all existing test difficulty values
 * This ensures all tests use standard difficulty values
 */
export async function migrateDifficultyValues() {
  console.log('🔄 Starting difficulty migration...');
  
  try {
    const db = getDbInstance();
    const testsRef = collection(db, 'tests');
    const snapshot = await getDocs(testsRef);
    
    let migratedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;
    
    // Use batch writes for efficiency (max 500 operations per batch)
    const batch = writeBatch(db);
    let batchCount = 0;
    const BATCH_LIMIT = 500;
    
    for (const testDoc of snapshot.docs) {
      const data = testDoc.data();
      const oldDifficulty = data.difficulty;
      
      if (!oldDifficulty) {
        console.warn(`⚠️ Test ${testDoc.id} has no difficulty, setting to Medium`);
        batch.update(doc(db, 'tests', testDoc.id), {
          difficulty: DIFFICULTY_LEVELS.MEDIUM
        });
        migratedCount++;
        batchCount++;
      } else {
        const newDifficulty = normalizeDifficulty(oldDifficulty);
        
        if (oldDifficulty !== newDifficulty) {
          console.log(`📝 Updating ${testDoc.id}: "${oldDifficulty}" → "${newDifficulty}"`);
          batch.update(doc(db, 'tests', testDoc.id), {
            difficulty: newDifficulty
          });
          migratedCount++;
          batchCount++;
        } else {
          unchangedCount++;
        }
      }
      
      // Commit batch if we've reached the limit
      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        console.log(`✅ Committed batch of ${batchCount} updates`);
        batchCount = 0;
      }
    }
    
    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ Committed final batch of ${batchCount} updates`);
    }
    
    console.log(`✅ Migration complete!`);
    console.log(`   - Updated: ${migratedCount} tests`);
    console.log(`   - Unchanged: ${unchangedCount} tests`);
    console.log(`   - Errors: ${errorCount} tests`);
    
    return { migratedCount, unchangedCount, errorCount };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).migrateDifficultyValues = migrateDifficultyValues;
  console.log('✅ Migration function available. Run: await migrateDifficultyValues()');
}
