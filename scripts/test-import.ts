/**
 * Test Import System
 * Imports a sample of generated tests to verify the import system works
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { scanTestFiles } from '@/lib/test-importer/file-scanner';
import { importTestFiles } from '@/lib/test-importer/test-importer';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testImport() {
  console.log('🧪 Testing Import System...\n');

  // Scan test files
  console.log('📂 Scanning test files...');
  const scannedFiles = scanTestFiles();
  console.log(`   Found ${scannedFiles.length} test files\n`);

  if (scannedFiles.length === 0) {
    console.log('❌ No test files found!');
    console.log('💡 Run: npm run generate-tests');
    return;
  }

  // Test importing a sample (first 6 tests from different standards/subjects)
  const testFiles = [
    'tests/9th/week-1/reading/test.json',
    'tests/9th/week-1/writing/test.json',
    'tests/9th/week-1/math/test.json',
    'tests/10th/week-1/reading/test.json',
    'tests/11th/week-1/writing/test.json',
    'tests/12th/week-1/math/test.json',
  ];

  const filesToImport = scannedFiles.filter(file => 
    testFiles.some(tf => file.relativePath.includes(tf.replace('tests/', '')))
  );

  console.log(`📥 Importing ${filesToImport.length} sample tests...\n`);

  try {
    const result = await importTestFiles(filesToImport, 'test-script', {
      publish: true,
      activate: true,
      overwrite: true,
      skipInvalid: true,
    });

    console.log(`\n📊 IMPORT RESULTS:`);
    console.log(`   Total: ${result.total}`);
    console.log(`   ✅ Successful: ${result.imported}`);
    console.log(`   ❌ Failed: ${result.failed}`);
    console.log(`   📈 Success Rate: ${Math.round((result.imported / result.total) * 100)}%`);

    if (result.failed > 0) {
      console.log(`\n❌ Failed Imports:`);
      result.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.file}: ${r.message}`);
        });
    }

    if (result.imported > 0) {
      console.log(`\n✅ Successful Imports:`);
      result.results
        .filter(r => r.success)
        .slice(0, 6)
        .forEach(r => {
          console.log(`   - ${r.file} → Test ID: ${r.testId}`);
        });
    }

    if (result.imported === result.total) {
      console.log(`\n🎉 All test imports successful!`);
      console.log(`\n💡 Next Steps:`);
      console.log(`   1. Go to /admin/tests to scan and import all ${scannedFiles.length} tests`);
      console.log(`   2. Tests will be available in the student dashboard`);
      console.log(`   3. Students can take tests and see results`);
    }
  } catch (error: any) {
    console.error(`\n❌ Import Error: ${error.message}`);
    console.error(`\n💡 Make sure:`);
    console.error(`   1. Firebase Admin credentials are in .env.local`);
    console.error(`   2. Firestore API is enabled in Firebase Console`);
    console.error(`   3. Service account has proper permissions`);
  }
}

testImport().catch(console.error);
