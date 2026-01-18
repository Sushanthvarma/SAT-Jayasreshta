/**
 * Automated Test Runner
 * Runs systematic tests on the SAT Mock Test Platform
 * 
 * Note: Some tests require Firebase credentials in .env.local
 * Run with: npm run test
 */

// Only import Firebase Admin if credentials are available
let adminDb: any = null;
let adminAuth: any = null;

try {
  const firebaseAdmin = require('../lib/firebase-admin');
  adminAuth = firebaseAdmin.adminAuth;
  adminDb = firebaseAdmin.adminDb;
} catch (error) {
  console.log('⚠️  Firebase Admin SDK not available (check .env.local)');
  console.log('   Continuing with file structure tests only...\n');
}

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const testResults: TestResult[] = [];

async function runTest(testName: string, testFn: () => Promise<boolean> | boolean): Promise<void> {
  try {
    console.log(`\n🧪 Running: ${testName}`);
    const result = await testFn();
    if (result) {
      console.log(`✅ PASSED: ${testName}`);
      testResults.push({ testName, passed: true });
    } else {
      console.log(`❌ FAILED: ${testName}`);
      testResults.push({ testName, passed: false, error: 'Test returned false' });
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${testName}`);
    console.error(`   Error: ${error.message}`);
    testResults.push({ testName, passed: false, error: error.message });
  }
}

// ============================================================================
// TEST SUITE 1: DATA INTEGRITY
// ============================================================================

async function testDataIntegrity() {
  console.log('\n📊 TEST SUITE 1: DATA INTEGRITY');
  console.log('='.repeat(60));

  if (!adminDb) {
    console.log('   ⏭️  Skipping Firestore tests (credentials not available)');
    return;
  }

  const { doc, getDoc, collection, query, where, getDocs } = require('firebase-admin/firestore');

  // Test 1.1: Firestore Connection
  await runTest('Firestore Connection', async () => {
    try {
      const testDoc = doc(adminDb, 'test', 'connection');
      await getDoc(testDoc);
      return true;
    } catch (error) {
      return false;
    }
  });

  // Test 1.2: Users Collection Structure
  await runTest('Users Collection Exists', async () => {
    try {
      const usersRef = collection(adminDb, 'users');
      const snapshot = await getDocs(query(usersRef, where('__name__', '!=', '')));
      return true; // If we can query, collection exists
    } catch (error: any) {
      if (error.code === 7) {
        // PERMISSION_DENIED - collection might not exist or rules issue
        console.log('   ⚠️  Note: Users collection may not exist yet or Firestore rules need setup');
      }
      return false;
    }
  });

  // Test 1.3: Tests Collection Structure
  await runTest('Tests Collection Exists', async () => {
    try {
      const testsRef = collection(adminDb, 'tests');
      const snapshot = await getDocs(query(testsRef, where('__name__', '!=', '')));
      return true;
    } catch (error: any) {
      if (error.code === 7) {
        console.log('   ⚠️  Note: Tests collection may not exist yet');
      }
      return false;
    }
  });
}

// ============================================================================
// TEST SUITE 2: API ROUTES
// ============================================================================

async function testAPIRoutes() {
  console.log('\n🌐 TEST SUITE 2: API ROUTES');
  console.log('='.repeat(60));

  // Note: These tests require a running server
  // For now, we'll just check if routes exist
  const fs = require('fs');
  const path = require('path');

  const apiRoutes = [
    'app/api/tests/route.ts',
    'app/api/tests/[id]/route.ts',
    'app/api/tests/[id]/start/route.ts',
    'app/api/tests/[id]/submit/route.ts',
    'app/api/auth/google/route.ts',
    'app/api/auth/signout/route.ts',
    'app/api/daily-challenges/route.ts',
    'app/api/skill-mastery/route.ts',
    'app/api/leaderboard/route.ts',
    'app/api/daily-goals/route.ts',
  ];

  for (const route of apiRoutes) {
    await runTest(`API Route Exists: ${route}`, () => {
      return fs.existsSync(path.join(process.cwd(), route));
    });
  }
}

// ============================================================================
// TEST SUITE 3: COMPONENT STRUCTURE
// ============================================================================

async function testComponents() {
  console.log('\n🧩 TEST SUITE 3: COMPONENT STRUCTURE');
  console.log('='.repeat(60));

  const fs = require('fs');
  const path = require('path');

  const requiredComponents = [
    'components/auth/GoogleSignInButton.tsx',
    'components/layout/Header.tsx',
    'components/layout/Footer.tsx',
    'components/layout/UserMenu.tsx',
    'components/test/ReviewModal.tsx',
    'components/dashboard/DailyChallenges.tsx',
    'components/dashboard/SkillTree.tsx',
    'components/gamification/XPProgressBar.tsx',
    'components/gamification/DailyGoalWidget.tsx',
    'components/ui/StatCard.tsx',
    'components/ui/TestCard.tsx',
  ];

  for (const component of requiredComponents) {
    await runTest(`Component Exists: ${component}`, () => {
      return fs.existsSync(path.join(process.cwd(), component));
    });
  }
}

// ============================================================================
// TEST SUITE 4: TYPE DEFINITIONS
// ============================================================================

async function testTypeDefinitions() {
  console.log('\n📝 TEST SUITE 4: TYPE DEFINITIONS');
  console.log('='.repeat(60));

  const fs = require('fs');
  const path = require('path');

  const requiredTypes = [
    'lib/types/test.ts',
    'lib/types/skills.ts',
    'lib/types/profile.ts',
  ];

  for (const typeFile of requiredTypes) {
    await runTest(`Type Definition Exists: ${typeFile}`, () => {
      return fs.existsSync(path.join(process.cwd(), typeFile));
    });
  }
}

// ============================================================================
// TEST SUITE 5: LIBRARY FUNCTIONS
// ============================================================================

async function testLibraryFunctions() {
  console.log('\n📚 TEST SUITE 5: LIBRARY FUNCTIONS');
  console.log('='.repeat(60));

  const fs = require('fs');
  const path = require('path');

  const requiredLibs = [
    'lib/firebase.ts',
    'lib/firebase-admin.ts',
    'lib/firestore/tests-client.ts',
    'lib/firestore/tests-server.ts',
    'lib/scoring/calculator.ts',
    'lib/gamification/badges-enhanced.ts',
    'lib/gamification/streaks.ts',
    'lib/gamification/xp.ts',
    'lib/gamification/daily-challenges.ts',
    'lib/adaptive/learning-engine.ts',
    'lib/adaptive/skill-mastery.ts',
  ];

  for (const lib of requiredLibs) {
    await runTest(`Library Exists: ${lib}`, () => {
      return fs.existsSync(path.join(process.cwd(), lib));
    });
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n🚀 SAT MOCK TEST PLATFORM - AUTOMATED TEST RUNNER');
  console.log('='.repeat(60));
  console.log('Starting comprehensive test suite...\n');

  try {
    await testDataIntegrity();
    await testAPIRoutes();
    await testComponents();
    await testTypeDefinitions();
    await testLibraryFunctions();

    // Print Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;
    const total = testResults.length;

    console.log(`\nTotal Tests: ${total}`);
    console.log(`✅ Passed: ${passed} (${Math.round((passed / total) * 100)}%)`);
    console.log(`❌ Failed: ${failed} (${Math.round((failed / total) * 100)}%)`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      testResults
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`   - ${r.testName}`);
          if (r.error) {
            console.log(`     Error: ${r.error}`);
          }
        });
    }

    console.log('\n' + '='.repeat(60));
    console.log(failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED');
    console.log('='.repeat(60) + '\n');

    process.exit(failed === 0 ? 0 : 1);
  } catch (error: any) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
