/**
 * File Scanner - Scans tests/ directory for test files
 * Plug-and-play: Just add files and they're automatically detected
 * 
 * NOTE: This only works server-side (Node.js environment)
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestFile, validateTestFile } from './test-file-schema';

// Ensure this only runs server-side
if (typeof window !== 'undefined') {
  throw new Error('File scanner can only be used server-side');
}

export interface ScannedTestFile {
  filePath: string;
  relativePath: string;
  standard: string;
  week: string;
  subject: string;
  testData: TestFile;
  isValid: boolean;
  errors: string[];
}

/**
 * Scan tests directory for all test files
 */
export function scanTestFiles(testsDir: string = 'tests'): ScannedTestFile[] {
  const scannedFiles: ScannedTestFile[] = [];
  const fullPath = path.join(process.cwd(), testsDir);

  // Check if tests directory exists
  if (!fs.existsSync(fullPath)) {
    console.warn(`Tests directory not found: ${fullPath}`);
    return scannedFiles;
  }

  // Recursively scan for test.json files
  function scanDirectory(dir: string, relativePath: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullEntryPath = path.join(dir, entry.name);
      const entryRelativePath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        scanDirectory(fullEntryPath, entryRelativePath);
      } else if (entry.isFile() && entry.name === 'test.json') {
        // Found a test file
        try {
          const fileContent = fs.readFileSync(fullEntryPath, 'utf-8');
          const testData = JSON.parse(fileContent) as TestFile;

          // Extract standard, week, subject from path
          // Path format: tests/{standard}/{week}/{subject}/test.json
          const pathParts = entryRelativePath.split(path.sep);
          const standard = pathParts[0] || '';
          const week = pathParts[1] || '';
          const subject = pathParts[2] || '';

          // Validate test file
          const validation = validateTestFile(testData);

          // Override metadata from path if needed
          if (standard && !testData.metadata.standard) {
            testData.metadata.standard = standard;
          }
          if (week && !testData.metadata.week) {
            testData.metadata.week = week;
          }
          if (subject && !testData.metadata.subject) {
            testData.metadata.subject = subject;
          }

          scannedFiles.push({
            filePath: fullEntryPath,
            relativePath: entryRelativePath,
            standard,
            week,
            subject,
            testData,
            isValid: validation.valid,
            errors: validation.errors,
          });
        } catch (error: any) {
          console.error(`Error reading test file ${fullEntryPath}:`, error.message);
          scannedFiles.push({
            filePath: fullEntryPath,
            relativePath: entryRelativePath,
            standard: '',
            week: '',
            subject: '',
            testData: {} as TestFile,
            isValid: false,
            errors: [`Failed to parse JSON: ${error.message}`],
          });
        }
      }
    }
  }

  scanDirectory(fullPath);
  return scannedFiles;
}

/**
 * Get test files organized by standard/week/subject
 */
export function getOrganizedTestFiles(testsDir: string = 'tests'): {
  [standard: string]: {
    [week: string]: {
      [subject: string]: ScannedTestFile[];
    };
  };
} {
  const scannedFiles = scanTestFiles(testsDir);
  const organized: {
    [standard: string]: {
      [week: string]: {
        [subject: string]: ScannedTestFile[];
      };
    };
  } = {};

  scannedFiles.forEach((file) => {
    if (!file.isValid) return; // Skip invalid files

    const { standard, week, subject } = file;

    if (!organized[standard]) {
      organized[standard] = {};
    }
    if (!organized[standard][week]) {
      organized[standard][week] = {};
    }
    if (!organized[standard][week][subject]) {
      organized[standard][week][subject] = [];
    }

    organized[standard][week][subject].push(file);
  });

  return organized;
}

/**
 * Get statistics about test files
 */
export function getTestFileStats(testsDir: string = 'tests'): {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  byStandard: { [standard: string]: number };
  byWeek: { [week: string]: number };
  bySubject: { [subject: string]: number };
} {
  const scannedFiles = scanTestFiles(testsDir);
  
  const stats = {
    totalFiles: scannedFiles.length,
    validFiles: scannedFiles.filter(f => f.isValid).length,
    invalidFiles: scannedFiles.filter(f => !f.isValid).length,
    byStandard: {} as { [standard: string]: number },
    byWeek: {} as { [week: string]: number },
    bySubject: {} as { [subject: string]: number },
  };

  scannedFiles.forEach((file) => {
    if (file.standard) {
      stats.byStandard[file.standard] = (stats.byStandard[file.standard] || 0) + 1;
    }
    if (file.week) {
      stats.byWeek[file.week] = (stats.byWeek[file.week] || 0) + 1;
    }
    if (file.subject) {
      stats.bySubject[file.subject] = (stats.bySubject[file.subject] || 0) + 1;
    }
  });

  return stats;
}
