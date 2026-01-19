import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { scanTestFiles, getOrganizedTestFiles, getTestFileStats } from '@/lib/test-importer/file-scanner';

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'list'; // 'list', 'organized', 'stats'

    if (mode === 'organized') {
      const organized = getOrganizedTestFiles();
      return NextResponse.json({
        success: true,
        organized,
      });
    }

    if (mode === 'stats') {
      const stats = getTestFileStats();
      return NextResponse.json({
        success: true,
        stats,
      });
    }

    // Default: list all files
    const scannedFiles = scanTestFiles();
    return NextResponse.json({
      success: true,
      files: scannedFiles.map(file => ({
        filePath: file.filePath,
        relativePath: file.relativePath,
        standard: file.standard,
        subject: file.subject,
        testNumber: file.testNumber,
        isValid: file.isValid,
        errors: file.errors,
        title: file.testData.metadata?.title,
      })),
    });
  } catch (error: any) {
    console.error('Error scanning test files:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to scan test files' },
      { status: 500 }
    );
  }
}
