# Test Difficulty Migration Guide

## Problem
Tests in the database have inconsistent difficulty values:
- "Intermediate", "Advanced", "Basic", "Beginner", "Expert"
- Filter UI uses: "Easy", "Medium", "Hard"
- This causes filters to fail because "Intermediate" !== "Medium"

## Solution
All tests must use standardized difficulty values: **"Easy"**, **"Medium"**, or **"Hard"**

## Migration Steps

### Step 1: Run Migration Script

1. Open your deployed app: https://sat-mock-test.vercel.app
2. Open browser console (F12)
3. Run the migration:

```javascript
// Import the migration function
import { migrateDifficultyValues } from './scripts/migrateDifficulty';

// Run migration
await migrateDifficultyValues();
```

**OR** if the import doesn't work, paste this directly in console:

```javascript
// Get Firebase instance
const { getDbInstance } = await import('/lib/firebase');
const { collection, getDocs, updateDoc, doc, writeBatch } = await import('firebase/firestore');
const { normalizeDifficulty, DIFFICULTY_LEVELS } = await import('/lib/firebase/testManagement');

const db = getDbInstance();
const testsRef = collection(db, 'tests');
const snapshot = await getDocs(testsRef);

let migratedCount = 0;
const batch = writeBatch(db);
let batchCount = 0;

for (const testDoc of snapshot.docs) {
  const data = testDoc.data();
  const oldDifficulty = data.difficulty;
  const newDifficulty = normalizeDifficulty(oldDifficulty);
  
  if (oldDifficulty !== newDifficulty) {
    console.log(`Updating ${testDoc.id}: "${oldDifficulty}" → "${newDifficulty}"`);
    batch.update(doc(db, 'tests', testDoc.id), { difficulty: newDifficulty });
    migratedCount++;
    batchCount++;
    
    if (batchCount >= 500) {
      await batch.commit();
      batchCount = 0;
    }
  }
}

if (batchCount > 0) {
  await batch.commit();
}

console.log(`✅ Migration complete! Updated ${migratedCount} tests`);
```

### Step 2: Verify Migration

Check Firestore console:
1. Go to Firebase Console → Firestore Database
2. Open `tests` collection
3. Verify all tests have difficulty: "Easy", "Medium", or "Hard" ONLY

### Step 3: Test Filters

1. Go to student dashboard
2. Select a grade (e.g., "8th Grade")
3. Test each filter combination:
   - [ ] All + All = shows all tests
   - [ ] Easy + All = shows only Easy tests
   - [ ] Medium + All = shows only Medium tests
   - [ ] Hard + All = shows only Hard tests
   - [ ] Medium + Reading = shows only Medium Reading tests

## What Changed

### Files Modified:
1. **`lib/firebase/testManagement.ts`** - Standard constants and normalization functions
2. **`app/student/page.tsx`** - Fixed filter logic to use normalized values
3. **`scripts/migrateDifficulty.ts`** - Migration script

### Filter Logic Fix:
- **Before:** Filter checked `test.difficulty === "Medium"` (exact match)
- **After:** Filter normalizes test difficulty first, then compares
- **Result:** "Intermediate" → "Medium" → matches filter ✅

## Prevention

All new tests created through admin UI will use standard values:
- Difficulty dropdown: Easy | Medium | Hard
- Subject dropdown: Reading | Writing | Math
- Grade dropdown: 4th-12th Grade

No more free-text fields that can cause inconsistencies!
