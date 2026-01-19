import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { scanTestFiles } from '@/lib/test-importer/file-scanner';
import { importTestFiles } from '@/lib/test-importer/test-importer';

export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Check if user is admin
    const userRef = adminDb.collection('users').doc(decodedToken.uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data();
    
    if (userData?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      filePaths, // Optional: specific files to import
      publish = false,
      activate = false,
      overwrite = false,
      skipInvalid = true,
      testsDir = 'tests',
    } = body;

    // Scan test files
    let scannedFiles = scanTestFiles(testsDir);

    // Filter to specific files if provided
    if (filePaths && Array.isArray(filePaths) && filePaths.length > 0) {
      // Normalize paths for comparison (handle both forward and backslashes)
      const normalizedFilePaths = filePaths.map(p => p.replace(/\\/g, '/'));
      scannedFiles = scannedFiles.filter(file => {
        const normalizedRelativePath = file.relativePath.replace(/\\/g, '/');
        return normalizedFilePaths.includes(normalizedRelativePath);
      });
      
      // Log for debugging
      console.log('📋 File path matching:', {
        requested: filePaths.length,
        found: scannedFiles.length,
        sampleRequested: filePaths.slice(0, 3),
        sampleFound: scannedFiles.slice(0, 3).map(f => f.relativePath),
      });
    }

    if (scannedFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No test files found to import. Requested: ${filePaths?.length || 0}, Found: 0`,
      }, { status: 400 });
    }

    // Log import details
    console.log('📥 Import request:', {
      totalFiles: scannedFiles.length,
      validFiles: scannedFiles.filter(f => f.isValid).length,
      invalidFiles: scannedFiles.filter(f => !f.isValid).length,
      filePaths: filePaths?.length || 'all',
      options: { publish, activate, overwrite, skipInvalid },
    });

    // Import files
    const result = await importTestFiles(scannedFiles, decodedToken.uid, {
      publish,
      activate,
      overwrite,
      skipInvalid,
    });

    // Log results
    console.log('📊 Import results:', {
      total: result.total,
      imported: result.imported,
      failed: result.failed,
      firstFewResults: result.results.slice(0, 5),
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error importing test files:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to import test files' },
      { status: 500 }
    );
  }
}
