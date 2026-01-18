'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';
import RefreshRoleButton from '@/components/admin/RefreshRoleButton';
import ImportErrorDisplay from '@/components/admin/ImportErrorDisplay';

interface ScannedFile {
  filePath: string;
  relativePath: string;
  standard: string;
  week: string;
  subject: string;
  isValid: boolean;
  errors: string[];
  title?: string;
}

interface OrganizedTests {
  [standard: string]: {
    [week: string]: {
      [subject: string]: ScannedFile[];
    };
  };
}

export default function AdminTestManagement() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([]);
  const [organized, setOrganized] = useState<OrganizedTests>({});
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importOptions, setImportOptions] = useState({
    publish: false,
    activate: false,
    overwrite: false,
    skipInvalid: true,
  });
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [lastImportResults, setLastImportResults] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && userData && userData.role !== 'admin') {
      router.push('/student');
    }
  }, [user, userData, authLoading, router]);

  useEffect(() => {
    if (user && userData?.role === 'admin') {
      scanTestFiles();
    }
  }, [user, userData]);

  const scanTestFiles = async () => {
    try {
      setScanning(true);
      const auth = getAuthInstance();
      const idToken = await getIdToken(auth.currentUser!);
      
      // Get organized view
      const organizedResponse = await fetch('/api/admin/tests/scan?mode=organized', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });
      const organizedData = await organizedResponse.json();
      
      if (organizedData.success) {
        setOrganized(organizedData.organized || {});
      }

      // Get list view
      const listResponse = await fetch('/api/admin/tests/scan?mode=list', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });
      const listData = await listResponse.json();
      
      if (listData.success) {
        setScannedFiles(listData.files || []);
      }
    } catch (error) {
      console.error('Error scanning test files:', error);
      toast.error('Failed to scan test files');
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  const handleImport = async (filePaths?: string[]) => {
    try {
      setImporting(true);
      const auth = getAuthInstance();
      const idToken = await getIdToken(auth.currentUser!);
      
      const response = await fetch('/api/admin/tests/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: filePaths || Array.from(selectedFiles),
          ...importOptions,
        }),
      });

      const data = await response.json();
      
      // Store results for error display
      setLastImportResults(data);
      
      if (data.success) {
        if (data.imported > 0) {
          toast.success(`Imported ${data.imported} test(s) successfully!`);
        } else {
          toast.error(`No tests were imported. ${data.failed || 0} failed.`);
        }
        
        if (data.failed > 0) {
          const failedResults = data.results?.filter((r: any) => !r.success) || [];
          console.error('❌ Failed imports:', failedResults);
          
          // Group errors by message to find common issues
          const errorGroups: { [key: string]: number } = {};
          failedResults.forEach((r: any) => {
            const msg = r.message || 'Unknown error';
            errorGroups[msg] = (errorGroups[msg] || 0) + 1;
          });
          
          console.error('📊 Error breakdown:', errorGroups);
          
          // Show most common error
          const mostCommonError = Object.entries(errorGroups)
            .sort((a, b) => b[1] - a[1])[0];
          
          if (mostCommonError) {
            const [errorMsg, count] = mostCommonError;
            toast.error(
              `${data.failed} failed. Most common: "${errorMsg}" (${count} times). See details below.`,
              { duration: 10000 }
            );
            
            // Show first 10 detailed errors in console
            console.error('📋 First 10 detailed errors:');
            failedResults.slice(0, 10).forEach((r: any, idx: number) => {
              console.error(`   ${idx + 1}. ${r.file}: ${r.message}`);
            });
          } else {
            toast.error(`${data.failed} test(s) failed to import`);
          }
        }
        
        // Refresh scan
        await scanTestFiles();
        setSelectedFiles(new Set());
      } else {
        console.error('Import API error:', data);
        toast.error(data.error || 'Failed to import tests');
      }
    } catch (error) {
      console.error('Error importing tests:', error);
      toast.error('Failed to import tests');
    } finally {
      setImporting(false);
    }
  };

  const toggleFileSelection = (filePath: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    setSelectedFiles(newSelected);
  };

  const selectAllValid = () => {
    const validFiles = scannedFiles.filter(f => f.isValid).map(f => f.relativePath);
    setSelectedFiles(new Set(validFiles));
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || userData?.role !== 'admin') {
    return null;
  }

  const validFiles = scannedFiles.filter(f => f.isValid);
  const invalidFiles = scannedFiles.filter(f => !f.isValid);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Test Management</h1>
              <p className="text-lg text-gray-600">Import tests from files organized by Standard/Week/Subject</p>
            </div>
            <div className="flex items-center gap-4">
              {userData?.role !== 'admin' && (
                <div className="text-right">
                  <p className="text-sm text-red-600 font-semibold mb-1">Current Role: {userData?.role || 'student'}</p>
                  <p className="text-xs text-gray-500">Updated role in Firestore? Refresh below</p>
                </div>
              )}
              <RefreshRoleButton />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Options</h2>
              <p className="text-sm text-gray-600">Configure how tests are imported</p>
            </div>
            <button
              onClick={scanTestFiles}
              disabled={scanning}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {scanning ? 'Scanning...' : '🔄 Rescan Files'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={importOptions.publish}
                onChange={(e) => setImportOptions({ ...importOptions, publish: e.target.checked })}
                className="w-5 h-5 text-indigo-600"
              />
              <div>
                <div className="font-semibold text-gray-900">Publish</div>
                <div className="text-xs text-gray-600">Make tests immediately available</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={importOptions.activate}
                onChange={(e) => setImportOptions({ ...importOptions, activate: e.target.checked })}
                className="w-5 h-5 text-indigo-600"
              />
              <div>
                <div className="font-semibold text-gray-900">Activate</div>
                <div className="text-xs text-gray-600">Enable tests for students</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={importOptions.overwrite}
                onChange={(e) => setImportOptions({ ...importOptions, overwrite: e.target.checked })}
                className="w-5 h-5 text-indigo-600"
              />
              <div>
                <div className="font-semibold text-gray-900">Overwrite</div>
                <div className="text-xs text-gray-600">Replace existing tests</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={importOptions.skipInvalid}
                onChange={(e) => setImportOptions({ ...importOptions, skipInvalid: e.target.checked })}
                className="w-5 h-5 text-indigo-600"
              />
              <div>
                <div className="font-semibold text-gray-900">Skip Invalid</div>
                <div className="text-xs text-gray-600">Skip files with errors</div>
              </div>
            </label>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={selectAllValid}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Select All Valid
            </button>
            <button
              onClick={clearSelection}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Clear Selection
            </button>
            <div className="flex-1"></div>
            <button
              onClick={() => handleImport()}
              disabled={importing || selectedFiles.size === 0}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {importing ? 'Importing...' : `Import Selected (${selectedFiles.size})`}
            </button>
          </div>
          
          {/* Error Display */}
          {lastImportResults && lastImportResults.failed > 0 && (
            <ImportErrorDisplay
              results={lastImportResults.results || []}
              failed={lastImportResults.failed}
            />
          )}
        </div>

        {/* Organized View */}
        {Object.keys(organized).length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Tests by Standard/Week/Subject</h2>
            <div className="space-y-6">
              {Object.entries(organized).map(([standard, weeks]) => (
                <div key={standard} className="border-l-4 border-indigo-500 pl-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{standard} Grade</h3>
                  {Object.entries(weeks).map(([week, subjects]) => (
                    <div key={week} className="ml-4 mb-4">
                      <h4 className="text-lg font-semibold text-gray-700 mb-3">{week.replace('week-', 'Week ')}</h4>
                      {Object.entries(subjects).map(([subject, files]) => (
                        <div key={subject} className="ml-4 mb-3">
                          <h5 className="text-md font-medium text-gray-600 mb-2 capitalize">{subject}</h5>
                          <div className="space-y-2">
                            {files.map((file) => (
                              <div
                                key={file.relativePath}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                                  file.isValid
                                    ? selectedFiles.has(file.relativePath)
                                      ? 'border-indigo-600 bg-indigo-50'
                                      : 'border-green-200 bg-green-50 hover:border-green-300'
                                    : 'border-red-200 bg-red-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedFiles.has(file.relativePath)}
                                  onChange={() => toggleFileSelection(file.relativePath)}
                                  disabled={!file.isValid}
                                  className="w-5 h-5 text-indigo-600"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{file.title || file.relativePath}</div>
                                  <div className="text-xs text-gray-600">{file.relativePath}</div>
                                  {!file.isValid && file.errors.length > 0 && (
                                    <div className="text-xs text-red-600 mt-1">
                                      Errors: {file.errors.join(', ')}
                                    </div>
                                  )}
                                </div>
                                {file.isValid ? (
                                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                    ✓ Valid
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                    ✗ Invalid
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File List View */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">All Test Files</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {validFiles.length} valid, {invalidFiles.length} invalid
                </p>
              </div>
            </div>
          </div>

          {scannedFiles.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Test Files Found</h3>
              <p className="text-gray-600 mb-4">
                Create test files in the <code className="bg-gray-100 px-2 py-1 rounded">tests/</code> directory
              </p>
              <p className="text-sm text-gray-500">
                Structure: <code className="bg-gray-100 px-2 py-1 rounded">tests/&#123;standard&#125;/&#123;week&#125;/&#123;subject&#125;/test.json</code>
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {scannedFiles.map((file) => (
                <div
                  key={file.relativePath}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !file.isValid ? 'bg-red-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.relativePath)}
                      onChange={() => toggleFileSelection(file.relativePath)}
                      disabled={!file.isValid}
                      className="w-5 h-5 text-indigo-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-gray-900">{file.title || file.relativePath}</span>
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                          {file.standard}
                        </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                          {file.week}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold capitalize">
                          {file.subject}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">{file.relativePath}</div>
                      {!file.isValid && file.errors.length > 0 && (
                        <div className="mt-2 text-sm text-red-600">
                          <strong>Errors:</strong> {file.errors.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {file.isValid ? (
                        <>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            ✓ Valid
                          </span>
                          <button
                            onClick={() => handleImport([file.relativePath])}
                            disabled={importing}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                          >
                            Import
                          </button>
                        </>
                      ) : (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          ✗ Invalid
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
