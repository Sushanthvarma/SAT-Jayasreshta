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
    
    // Get all existing tests from Firestore - only fetch IDs to minimize reads
    // Use select() to only get document IDs, not full documents
    let testsMap: Map<string, { version?: string; status?: string; isActive?: boolean }> = new Map();
    try {
      // First, try to get just the document IDs with minimal data
      // Use a more efficient approach: only fetch what we need
      const testsSnapshot = await adminDb.collection('tests')
        .select('version', 'status', 'isActive', 'publishedAt', 'createdAt')
        .limit(500) // Reduced limit to avoid quota
        .get();
      
      testsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        testsMap.set(doc.id, {
          version: data.version,
          status: data.status,
          isActive: data.isActive,
        });
      });
    } catch (error: any) {
      // If select() doesn't work or quota exceeded, try minimal approach
      if (error.message?.includes('select') || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('quota')) {
        console.warn('⚠️ Could not fetch tests from Firestore (quota/select issue):', error.message);
        
        // Try fetching only IDs without data
        try {
          const testsSnapshot = await adminDb.collection('tests').limit(200).get();
          testsSnapshot.docs.forEach(doc => {
            testsMap.set(doc.id, {}); // Just mark as exists
          });
        } catch (fallbackError: any) {
          // If even that fails, return error
          return NextResponse.json({
            success: false,
            error: 'Firestore quota exceeded. Status check unavailable. You can still import tests - they will be checked during import.',
            partial: true,
            statusMap: {},
            stats: {
              total: scannedFiles.length,
              valid: scannedFiles.filter(f => f.isValid).length,
              invalid: scannedFiles.filter(f => !f.isValid).length,
              new: scannedFiles.filter(f => f.isValid).length,
              imported: 0,
              updated: 0,
            },
          }, { status: 429 });
        }
      } else {
        throw error;
      }
    }
    
    // Check status for each scanned file using the cached data
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
      const testData = testsMap.get(testId);
      const exists = !!testData;
      
      if (exists) {
        // Check if file was updated (compare metadata version)
        const fileVersion = file.testData.metadata.version || '1.0.0';
        const dbVersion = testData?.version || '1.0.0';
        const isUpdated = fileVersion !== dbVersion;
        
        statusMap[file.relativePath] = {
          testId,
          status: isUpdated ? 'updated' : 'imported',
          exists: true,
          isPublished: testData?.status === 'published',
          isActive: testData?.isActive === true,
          // Don't include dates if we don't have them (minimal fetch)
          publishedAt: undefined,
          createdAt: undefined,
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
