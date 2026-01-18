'use client';

import { useState } from 'react';

interface ImportResult {
  file: string;
  success: boolean;
  message: string;
  testId?: string;
}

interface ImportErrorDisplayProps {
  results: ImportResult[];
  failed: number;
}

export default function ImportErrorDisplay({ results, failed }: ImportErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const failedResults = results.filter(r => !r.success);

  if (failed === 0) return null;

  // Group errors by message
  const errorGroups: { [key: string]: { count: number; files: string[] } } = {};
  failedResults.forEach((r) => {
    const msg = r.message || 'Unknown error';
    if (!errorGroups[msg]) {
      errorGroups[msg] = { count: 0, files: [] };
    }
    errorGroups[msg].count++;
    errorGroups[msg].files.push(r.file);
  });

  const sortedErrors = Object.entries(errorGroups)
    .sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-red-900">
          ❌ {failed} Import(s) Failed
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {sortedErrors.map(([errorMsg, { count, files }], idx) => (
            <div key={idx} className="bg-white rounded-lg p-4 border border-red-200">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-red-800">
                  {errorMsg}
                </p>
                <span className="text-sm text-red-600 bg-red-100 px-2 py-1 rounded">
                  {count} file{count !== 1 ? 's' : ''}
                </span>
              </div>
              {files.length <= 5 ? (
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  {files.map((file, fileIdx) => (
                    <li key={fileIdx} className="list-disc">{file}</li>
                  ))}
                </ul>
              ) : (
                <details className="text-sm text-gray-600">
                  <summary className="cursor-pointer text-red-600 hover:text-red-800">
                    Show {files.length} files
                  </summary>
                  <ul className="space-y-1 ml-4 mt-2 max-h-40 overflow-y-auto">
                    {files.map((file, fileIdx) => (
                      <li key={fileIdx} className="list-disc">{file}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
