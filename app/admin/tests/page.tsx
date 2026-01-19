'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAuthInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';
import RefreshRoleButton from '@/components/admin/RefreshRoleButton';
import { playSound } from '@/lib/audio';

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

interface ImportStatus {
  testId: string;
  status: 'new' | 'imported' | 'updated';
  exists: boolean;
  isPublished?: boolean;
  isActive?: boolean;
  publishedAt?: string;
  createdAt?: string;
}

interface OrganizedTests {
  [standard: string]: {
    [week: string]: {
      [subject: string]: ScannedFile[];
    };
  };
}

type Tab = 'overview' | 'files' | 'organized' | 'invalid';

export default function AdminTestManagement() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([]);
  const [organized, setOrganized] = useState<OrganizedTests>({});
  const [importStatus, setImportStatus] = useState<{ [key: string]: ImportStatus }>({});
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [statusCheckEnabled, setStatusCheckEnabled] = useState(false);
  const [importOptions, setImportOptions] = useState({
    publish: true,
    activate: true,
    overwrite: false,
    skipInvalid: true,
  });
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [lastImportResults, setLastImportResults] = useState<any>(null);
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && userData && userData.role !== 'admin') {
      router.push('/student');
    }
  }, [user, userData, authLoading, router]);

  useEffect(() => {
    if (user && userData?.role === 'admin') {
      loadAllData();
    }
  }, [user, userData]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setScanning(true);
      const auth = getAuthInstance();
      const idToken = await getIdToken(auth.currentUser!);
      
      // Load all data in parallel
      // Load scan data first (doesn't require Firestore)
      const [organizedRes, listRes, statsRes] = await Promise.all([
        fetch('/api/admin/tests/scan?mode=organized', {
          headers: { 'Authorization': `Bearer ${idToken}` },
        }),
        fetch('/api/admin/tests/scan?mode=list', {
          headers: { 'Authorization': `Bearer ${idToken}` },
        }),
        fetch('/api/admin/tests/scan?mode=stats', {
          headers: { 'Authorization': `Bearer ${idToken}` },
        }),
      ]);

      const [organizedData, listData, statsData] = await Promise.all([
        organizedRes.json(),
        listRes.json(),
        statsRes.json(),
      ]);

      if (organizedData.success) {
        setOrganized(organizedData.organized || {});
      }
      if (listData.success) {
        setScannedFiles(listData.files || []);
      }
      if (statsData.success) {
        setStats(statsData.stats || null);
      }

      // With Blaze plan, we can check status automatically
      // Load status check automatically (no quota concerns)
      try {
        const statusRes = await fetch('/api/admin/tests/status', {
          headers: { 'Authorization': `Bearer ${idToken}` },
        });
        const statusData = await statusRes.json();
        
        if (statusData.success) {
          setImportStatus(statusData.statusMap || {});
          if (statusData.stats) {
            setStats((prev: any) => ({ ...prev, ...statusData.stats }));
          }
        } else {
          console.error('Status check failed:', statusData.error);
          // Fallback: set all as new
          const defaultStatus: { [key: string]: any } = {};
          listData.files?.forEach((file: ScannedFile) => {
            if (file.isValid) {
              defaultStatus[file.relativePath] = {
                testId: `${file.standard}-${file.week}-${file.subject}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                status: 'new',
                exists: false,
              };
            }
          });
          setImportStatus(defaultStatus);
        }
      } catch (error) {
        console.error('Error checking status:', error);
        // Fallback: set all as new
        const defaultStatus: { [key: string]: any } = {};
        listData.files?.forEach((file: ScannedFile) => {
          if (file.isValid) {
            defaultStatus[file.relativePath] = {
              testId: `${file.standard}-${file.week}-${file.subject}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
              status: 'new',
              exists: false,
            };
          }
        });
        setImportStatus(defaultStatus);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load test data');
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  const handleImport = async (filePaths?: string[]) => {
    try {
      setImporting(true);
      playSound('click');
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
      setLastImportResults(data);
      
      if (data.success) {
        if (data.imported > 0) {
          playSound('success');
          toast.success(`✅ Imported ${data.imported} test(s) successfully!`);
        } else {
          playSound('error');
          toast.error(`No tests were imported. ${data.failed || 0} failed.`);
        }
        
        if (data.failed > 0) {
          const failedResults = data.results?.filter((r: any) => !r.success) || [];
          if (failedResults.length > 0) {
            const errorMsg = failedResults[0].message || 'Unknown error';
            toast.error(`${data.failed} failed. First error: "${errorMsg}"`, { duration: 8000 });
          }
        }
        
        await loadAllData();
        setSelectedFiles(new Set());
      } else {
        playSound('error');
        toast.error(data.error || 'Failed to import tests');
      }
    } catch (error) {
      console.error('Error importing tests:', error);
      playSound('error');
      toast.error('Failed to import tests');
    } finally {
      setImporting(false);
    }
  };

  const toggleFileSelection = (filePath: string) => {
    playSound('click');
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    setSelectedFiles(newSelected);
  };

  // Filtered files based on search and filters
  const filteredFiles = useMemo(() => {
    return scannedFiles.filter(file => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          file.title?.toLowerCase().includes(query) ||
          file.relativePath.toLowerCase().includes(query) ||
          file.standard.toLowerCase().includes(query) ||
          file.week.toLowerCase().includes(query) ||
          file.subject.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Grade filter
      if (filterGrade !== 'all' && file.standard !== filterGrade) return false;

      // Subject filter
      if (filterSubject !== 'all' && file.subject !== filterSubject) return false;

      // Status filter
      if (filterStatus !== 'all') {
        const status = importStatus[file.relativePath]?.status || (file.isValid ? 'new' : 'invalid');
        if (filterStatus === 'valid' && !file.isValid) return false;
        if (filterStatus === 'invalid' && file.isValid) return false;
        if (filterStatus === 'new' && status !== 'new') return false;
        if (filterStatus === 'imported' && status !== 'imported') return false;
        if (filterStatus === 'updated' && status !== 'updated') return false;
      }

      return true;
    });
  }, [scannedFiles, searchQuery, filterGrade, filterSubject, filterStatus, importStatus]);

  // Get unique values for filters
  const uniqueGrades = useMemo(() => {
    const grades = new Set(scannedFiles.map(f => f.standard).filter(Boolean));
    return Array.from(grades).sort();
  }, [scannedFiles]);

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set(scannedFiles.map(f => f.subject).filter(Boolean));
    return Array.from(subjects).sort();
  }, [scannedFiles]);

  const selectAllFiltered = () => {
    playSound('click');
    const validFiltered = filteredFiles.filter(f => f.isValid).map(f => f.relativePath);
    setSelectedFiles(new Set(validFiltered));
  };

  const selectByStatus = (status: 'new' | 'imported' | 'updated') => {
    playSound('click');
    const matching = filteredFiles.filter(f => {
      if (!f.isValid) return false;
      const fileStatus = importStatus[f.relativePath]?.status || 'new';
      return fileStatus === status;
    }).map(f => f.relativePath);
    setSelectedFiles(new Set(matching));
  };

  const clearSelection = () => {
    playSound('click');
    setSelectedFiles(new Set());
  };

  const checkImportStatus = async () => {
    try {
      setCheckingStatus(true);
      playSound('click');
      const auth = getAuthInstance();
      const idToken = await getIdToken(auth.currentUser!);
      
      const statusRes = await fetch('/api/admin/tests/status', {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      const statusData = await statusRes.json();
      
      if (statusData.success) {
        playSound('success');
        setImportStatus(statusData.statusMap || {});
        if (statusData.stats) {
          setStats((prev: any) => ({ ...prev, ...statusData.stats }));
        }
        toast.success('✅ Import status updated!');
        setStatusCheckEnabled(true);
      } else if (statusData.error?.includes('quota') || statusRes.status === 429) {
        playSound('error');
        toast.error('⚠️ Firestore quota exceeded. Status check unavailable. You can still import tests.', { duration: 8000 });
      } else {
        playSound('error');
        toast.error(statusData.error || 'Could not check import status.');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      playSound('error');
      toast.error('Failed to check import status.');
    } finally {
      setCheckingStatus(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading test management...</p>
        </div>
      </div>
    );
  }

  if (!user || userData?.role !== 'admin') {
    return null;
  }

  const validFiles = scannedFiles.filter(f => f.isValid);
  const invalidFiles = scannedFiles.filter(f => !f.isValid);
  const newFiles = validFiles.filter(f => importStatus[f.relativePath]?.status === 'new');
  const importedFiles = validFiles.filter(f => importStatus[f.relativePath]?.status === 'imported');
  const updatedFiles = validFiles.filter(f => importStatus[f.relativePath]?.status === 'updated');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Test Management</h1>
              <p className="text-base sm:text-lg text-gray-600">Import and manage test files from the tests/ directory</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {userData?.role !== 'admin' && <RefreshRoleButton />}
              <button
                onClick={checkImportStatus}
                disabled={checkingStatus}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 min-h-[44px] flex items-center gap-2"
                title="Check which tests are already imported (may hit Firestore quota)"
              >
                {checkingStatus ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Checking...
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    Check Status
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  playSound('click');
                  loadAllData();
                }}
                disabled={scanning}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px] flex items-center gap-2"
              >
                {scanning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Scanning...
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    Rescan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Dashboard */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.total || scannedFiles.length}</div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">Total Files</div>
            </div>
            <div className="bg-green-50 rounded-xl shadow-md border border-green-200 p-4">
              <div className="text-2xl font-bold text-green-700">{stats.valid || validFiles.length}</div>
              <div className="text-xs sm:text-sm text-green-600 mt-1">Valid</div>
            </div>
            <div className="bg-red-50 rounded-xl shadow-md border border-red-200 p-4">
              <div className="text-2xl font-bold text-red-700">{stats.invalid || invalidFiles.length}</div>
              <div className="text-xs sm:text-sm text-red-600 mt-1">Invalid</div>
            </div>
            <div className="bg-blue-50 rounded-xl shadow-md border border-blue-200 p-4">
              <div className="text-2xl font-bold text-blue-700">{stats.new || newFiles.length}</div>
              <div className="text-xs sm:text-sm text-blue-600 mt-1">New</div>
            </div>
            <div className="bg-purple-50 rounded-xl shadow-md border border-purple-200 p-4">
              <div className="text-2xl font-bold text-purple-700">{stats.imported || importedFiles.length}</div>
              <div className="text-xs sm:text-sm text-purple-600 mt-1">Imported</div>
            </div>
            <div className="bg-orange-50 rounded-xl shadow-md border border-orange-200 p-4">
              <div className="text-2xl font-bold text-orange-700">{stats.updated || updatedFiles.length}</div>
              <div className="text-xs sm:text-sm text-orange-600 mt-1">Updated</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto -mb-px">
              {(['overview', 'files', 'organized', 'invalid'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    playSound('click');
                    setActiveTab(tab);
                  }}
                  className={`px-4 sm:px-6 py-3 text-sm sm:text-base font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'invalid' && invalidFiles.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                      {invalidFiles.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Actions - Compact */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => {
                        playSound('click');
                        selectByStatus('new');
                        setActiveTab('files');
                      }}
                      className="px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors min-h-[44px]"
                    >
                      Select All New ({newFiles.length})
                    </button>
                    <button
                      onClick={() => {
                        playSound('click');
                        selectByStatus('updated');
                        setActiveTab('files');
                      }}
                      className="px-4 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors min-h-[44px]"
                    >
                      Select Updated ({updatedFiles.length})
                    </button>
                    <button
                      onClick={() => {
                        playSound('click');
                        selectAllFiltered();
                        setActiveTab('files');
                      }}
                      className="px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors min-h-[44px]"
                    >
                      Select All Valid ({validFiles.length})
                    </button>
                    <button
                      onClick={() => {
                        playSound('click');
                        handleImport();
                      }}
                      disabled={importing || selectedFiles.size === 0}
                      className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                    >
                      {importing ? 'Importing...' : `Import Selected (${selectedFiles.size})`}
                    </button>
                  </div>
                </div>

                {/* Import Options - Compact */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="text-base font-bold text-gray-900 mb-3">Import Options</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'publish', label: 'Publish', desc: 'Make tests immediately available' },
                      { key: 'activate', label: 'Activate', desc: 'Enable tests for students' },
                      { key: 'overwrite', label: 'Overwrite', desc: 'Replace existing tests' },
                      { key: 'skipInvalid', label: 'Skip Invalid', desc: 'Skip files with errors' },
                    ].map((option) => (
                      <label key={option.key} className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={importOptions[option.key as keyof typeof importOptions]}
                          onChange={(e) => {
                            playSound('click');
                            setImportOptions({ ...importOptions, [option.key]: e.target.checked });
                          }}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <div>
                          <div className="font-medium text-sm text-gray-900">{option.label}</div>
                          <div className="text-xs text-gray-600">{option.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                    <h4 className="text-lg font-bold text-blue-900 mb-2">New Tests</h4>
                    <p className="text-3xl font-bold text-blue-700 mb-2">{newFiles.length}</p>
                    <p className="text-sm text-blue-600">Ready to import</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                    <h4 className="text-lg font-bold text-purple-900 mb-2">Imported Tests</h4>
                    <p className="text-3xl font-bold text-purple-700 mb-2">{importedFiles.length}</p>
                    <p className="text-sm text-purple-600">Already in database</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                    <h4 className="text-lg font-bold text-orange-900 mb-2">Updated Tests</h4>
                    <p className="text-3xl font-bold text-orange-700 mb-2">{updatedFiles.length}</p>
                    <p className="text-sm text-orange-600">Need re-import</p>
                  </div>
                </div>
              </div>
            )}

            {/* Files Tab */}
            {activeTab === 'files' && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Search tests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px]"
                    />
                    <select
                      value={filterGrade}
                      onChange={(e) => setFilterGrade(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px]"
                    >
                      <option value="all">All Grades</option>
                      {uniqueGrades.map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                    <select
                      value={filterSubject}
                      onChange={(e) => setFilterSubject(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px]"
                    >
                      <option value="all">All Subjects</option>
                      {uniqueSubjects.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px]"
                    >
                      <option value="all">All Status</option>
                      <option value="new">New</option>
                      <option value="imported">Imported</option>
                      <option value="updated">Updated</option>
                      <option value="valid">Valid</option>
                      <option value="invalid">Invalid</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={selectAllFiltered}
                      className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors min-h-[36px]"
                    >
                      Select All Filtered
                    </button>
                    <button
                      onClick={clearSelection}
                      className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors min-h-[36px]"
                    >
                      Clear
                    </button>
                    <div className="flex-1"></div>
                    <span className="text-sm text-gray-600">
                      Showing {filteredFiles.length} of {scannedFiles.length} files
                    </span>
                  </div>
                </div>

                {/* File List - Compact with Pagination */}
                <div className="space-y-2">
                  {filteredFiles.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                      <p className="text-gray-600">No files match your filters</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredFiles.slice(0, 20).map((file) => {
                      const status = importStatus[file.relativePath];
                      const isSelected = selectedFiles.has(file.relativePath);
                      
                      return (
                        <div
                          key={file.relativePath}
                          className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                            !file.isValid
                              ? 'bg-red-50 border-red-200'
                              : isSelected
                              ? 'bg-indigo-50 border-indigo-500'
                              : status?.status === 'new'
                              ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                              : status?.status === 'updated'
                              ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
                              : 'bg-green-50 border-green-200 hover:border-green-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFileSelection(file.relativePath)}
                            disabled={!file.isValid}
                            className="w-5 h-5 text-indigo-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <span className="font-medium text-sm text-gray-900 truncate">{file.title || file.relativePath}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                file.standard === '4th' || file.standard === '5th' || file.standard === '6th'
                                  ? 'bg-blue-100 text-blue-700'
                                  : file.standard === '7th' || file.standard === '8th'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-indigo-100 text-indigo-700'
                              }`}>
                                {file.standard}
                              </span>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                                {file.week}
                              </span>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold capitalize">
                                {file.subject}
                              </span>
                              {status && (
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  status.status === 'new'
                                    ? 'bg-blue-100 text-blue-700'
                                    : status.status === 'updated'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {status.status === 'new' ? '🆕 New' : status.status === 'updated' ? '🔄 Updated' : '✅ Imported'}
                                </span>
                              )}
                            </div>
                            {!file.isValid && file.errors.length > 0 && (
                              <div className="text-xs text-red-600 truncate">
                                {file.errors[0]}
                              </div>
                            )}
                          </div>
                          {file.isValid && (
                            <button
                              onClick={() => handleImport([file.relativePath])}
                              disabled={importing}
                              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[32px] whitespace-nowrap"
                            >
                              Import
                            </button>
                          )}
                        </div>
                      );
                      })}
                      {filteredFiles.length > 20 && (
                        <div className="text-center py-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-600">
                            Showing 20 of {filteredFiles.length} files. Use filters to narrow results.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Organized Tab - Compact Collapsible */}
            {activeTab === 'organized' && (
              <div className="space-y-2">
                {Object.keys(organized).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No organized tests found</p>
                  </div>
                ) : (
                  Object.entries(organized).map(([standard, weeks]) => {
                    const isExpanded = expandedGrades.has(standard);
                    const totalFiles = Object.values(weeks).reduce((sum, subjects) => 
                      sum + Object.values(subjects).reduce((s, files) => s + files.length, 0), 0
                    );
                    
                    return (
                      <div key={standard} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <button
                          onClick={() => {
                            playSound('click');
                            const newExpanded = new Set(expandedGrades);
                            if (isExpanded) {
                              newExpanded.delete(standard);
                            } else {
                              newExpanded.add(standard);
                            }
                            setExpandedGrades(newExpanded);
                          }}
                          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{standard} Grade</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {totalFiles} files
                            </span>
                          </div>
                          <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                        </button>
                        
                        {isExpanded && (
                          <div className="border-t border-gray-200 p-3 space-y-2 max-h-[400px] overflow-y-auto">
                            {Object.entries(weeks).map(([week, subjects]) => (
                              <div key={week} className="bg-gray-50 rounded p-2">
                                <div className="text-sm font-semibold text-gray-700 mb-2">{week.replace('week-', 'Week ')}</div>
                                <div className="space-y-1">
                                  {Object.entries(subjects).map(([subject, files]) => (
                                    <div key={subject} className="flex items-center gap-2">
                                      <span className="text-xs text-gray-600 capitalize w-20">{subject}:</span>
                                      <div className="flex-1 flex flex-wrap gap-1">
                                        {files.map((file) => {
                                          const status = importStatus[file.relativePath];
                                          const isSelected = selectedFiles.has(file.relativePath);
                                          
                                          return (
                                            <button
                                              key={file.relativePath}
                                              onClick={() => toggleFileSelection(file.relativePath)}
                                              className={`px-2 py-1 rounded text-xs border transition-all ${
                                                !file.isValid
                                                  ? 'bg-red-50 border-red-200 text-red-700'
                                                  : isSelected
                                                  ? 'bg-indigo-100 border-indigo-400 text-indigo-700'
                                                  : status?.status === 'new'
                                                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                                              }`}
                                            >
                                              {file.title || file.relativePath.split('/').pop()}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Invalid Tab - Compact */}
            {activeTab === 'invalid' && (
              <div className="space-y-1.5">
                {invalidFiles.length === 0 ? (
                  <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-green-700 font-semibold">✅ All files are valid!</p>
                  </div>
                ) : (
                  invalidFiles.slice(0, 20).map((file) => (
                    <div key={file.relativePath} className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-start gap-2">
                        <span className="text-red-600 font-bold text-sm">✗</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">{file.relativePath}</div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {file.standard} • {file.week} • {file.subject}
                          </div>
                          <div className="text-xs text-red-600 mt-1">
                            {file.errors[0]}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {invalidFiles.length > 20 && (
                  <div className="text-center py-2 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600">
                      Showing 20 of {invalidFiles.length} invalid files
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Import Results */}
        {lastImportResults && lastImportResults.failed > 0 && (
          <div className="bg-red-50 rounded-xl shadow-md border border-red-200 p-6 mt-6">
            <h3 className="text-lg font-bold text-red-900 mb-3">Import Errors</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {lastImportResults.results
                ?.filter((r: any) => !r.success)
                .slice(0, 10)
                .map((result: any, idx: number) => (
                  <div key={idx} className="text-sm text-red-700">
                    <strong>{result.file}:</strong> {result.message}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
