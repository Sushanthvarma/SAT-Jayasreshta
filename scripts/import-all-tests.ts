/**
 * Import All Generated Tests into Firestore
 * This script imports all 144 tests and publishes/activates them
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { scanTestFiles } from '@/lib/test-importer/file-scanner';
import { importTestFiles } from '@/lib/test-importer/test-importer';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function importAllTests() {
  console.log('🚀 Importing All Tests into Firestore...\n');

  try {
    // Scan all test files
    console.log('📂 Scanning test files...');
    const scannedFiles = scanTestFiles();
    console.log(`   Found ${scannedFiles.length} test files\n`);

    if (scannedFiles.length === 0) {
      console.log('❌ No test files found!');
      console.log('💡 Run: npm run generate-tests');
      return;
    }

    // Filter to only valid files
    const validFiles = scannedFiles.filter(f => f.isValid);
    console.log(`✅ Valid files: ${validFiles.length}`);
    console.log(`❌ Invalid files: ${scannedFiles.length - validFiles.length}\n`);

    if (validFiles.length === 0) {
      console.log('❌ No valid test files to import!');
      console.log('💡 Run: npm run verify-tests to check for errors');
      return;
    }

    // Import all valid tests
    console.log('📥 Importing tests...');
    console.log('   Options: publish=true, activate=true, overwrite=true\n');

    const result = await importTestFiles(validFiles, 'system-import', {
      publish: true,    // Make tests immediately available
      activate: true,    // Activate for students
      overwrite: true,   // Overwrite if already exists
      skipInvalid: true, // Skip invalid files
    });

    console.log('\n📊 IMPORT RESULTS\n');
    console.log(`   Total Files: ${result.total}`);
    console.log(`   ✅ Imported: ${result.imported}`);
    console.log(`   ❌ Failed: ${result.failed}`);
    console.log(`   📈 Success Rate: ${Math.round((result.imported / result.total) * 100)}%\n`);

    if (result.failed > 0) {
      console.log('❌ Failed Imports:\n');
      result.results
        .filter(r => !r.success)
        .slice(0, 10)
        .forEach(r => {
          console.log(`   - ${r.file}`);
          console.log(`     ${r.message}\n`);
        });
      if (result.failed > 10) {
        console.log(`   ... and ${result.failed - 10} more failures\n`);
      }
    }

    if (result.imported > 0) {
      console.log('✅ Successfully Imported Tests:\n');
      // Group by standard
      const byStandard: { [key: string]: number } = {};
      result.results
        .filter(r => r.success)
        .forEach(r => {
          const standard = r.file.split('/')[0];
          byStandard[standard] = (byStandard[standard] || 0) + 1;
        });

      Object.entries(byStandard).forEach(([standard, count]) => {
        console.log(`   ${standard}: ${count} tests`);
      });
    }

    if (result.imported === result.total) {
      console.log('\n🎉 All tests imported successfully!');
      console.log('\n💡 Next Steps:');
      console.log('   1. Go to /student to see available tests');
      console.log('   2. Tests are now published and active');
      console.log('   3. Students can start taking tests immediately');
    } else if (result.imported > 0) {
      console.log('\n⚠️  Some tests failed to import');
      console.log('   Check the errors above and fix any issues');
      console.log('   You can re-run this script to retry failed imports');
    }
  } catch (error: any) {
    console.error(`\n❌ Import Error: ${error.message}`);
    console.error(`\n💡 Make sure:`);
    console.error(`   1. Firebase Admin credentials are in .env.local`);
    console.error(`   2. Firestore API is enabled in Firebase Console`);
    console.error(`   3. Service account has proper permissions`);
    console.error(`\n   Error details:`, error);
  }
}

importAllTests().catch(console.error);
