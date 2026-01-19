import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { scanTestFiles } from '@/lib/test-importer/file-scanner';

/**
 * Generate test ID from metadata (same logic as test-importer)
 */
function generateTestId(metadata: { standard: string; week: string; subject: string }): string {
  return `${metadata.standard}-${metadata.week}-${metadata.subject}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

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

    // Scan all test files
    const scannedFiles = scanTestFiles();
    
    // Get all existing test IDs from Firestore
    const testsSnapshot = await adminDb.collection('tests').get();
    const existingTestIds = new Set(testsSnapshot.docs.map(doc => doc.id));
    
    // Check status for each scanned file
    const statusMap: { [relativePath: string]: {
      testId: string;
      status: 'new' | 'imported' | 'updated';
      exists: boolean;
      isPublished?: boolean;
      isActive?: boolean;
      publishedAt?: Date;
      createdAt?: Date;
    } } = {};

    for (const file of scannedFiles) {
      if (!file.isValid) continue;
      
      const testId = generateTestId(file.testData.metadata);
      const exists = existingTestIds.has(testId);
      
      if (exists) {
        // Get test details
        const testDoc = await adminDb.collection('tests').doc(testId).get();
        const testData = testDoc.data();
        
        // Check if file was updated (compare metadata version or timestamp)
        const fileVersion = file.testData.metadata.version || '1.0.0';
        const dbVersion = testData?.version || '1.0.0';
        const isUpdated = fileVersion !== dbVersion;
        
        statusMap[file.relativePath] = {
          testId,
          status: isUpdated ? 'updated' : 'imported',
          exists: true,
          isPublished: testData?.status === 'published',
          isActive: testData?.isActive === true,
          publishedAt: testData?.publishedAt?.toDate(),
          createdAt: testData?.createdAt?.toDate(),
        };
      } else {
        statusMap[file.relativePath] = {
          testId,
          status: 'new',
          exists: false,
        };
      }
    }

    return NextResponse.json({
      success: true,
      statusMap,
      stats: {
        total: scannedFiles.length,
        valid: scannedFiles.filter(f => f.isValid).length,
        invalid: scannedFiles.filter(f => !f.isValid).length,
        new: Object.values(statusMap).filter(s => s.status === 'new').length,
        imported: Object.values(statusMap).filter(s => s.status === 'imported').length,
        updated: Object.values(statusMap).filter(s => s.status === 'updated').length,
      },
    });
  } catch (error: any) {
    console.error('Error checking test status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check test status' },
      { status: 500 }
    );
  }
}
