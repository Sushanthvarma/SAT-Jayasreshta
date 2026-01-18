'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  email: string;
  grade: string | null;
  testsCompleted: number;
  avgScore: number;
  recentTrend: 'up' | 'down' | 'stable';
  streak: number;
  lastActive: string | null;
  riskLevel: 'excellent' | 'good' | 'at-risk';
  photoURL?: string | null;
}

interface StudentMasterTableProps {
  students: Student[];
  onStudentSelect?: (studentId: string) => void;
}

type PerformanceFilter = 'all' | 'excellent' | 'good' | 'needs-support';
type EngagementFilter = 'all' | 'active' | 'inactive' | 'at-risk';
type StreakFilter = 'all' | 'active' | 'none' | 'lost';
type SortField = 'name' | 'grade' | 'tests' | 'score' | 'trend' | 'streak' | 'lastActive' | 'risk';
type SortDirection = 'asc' | 'desc';

export default function StudentMasterTable({ students, onStudentSelect }: StudentMasterTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [performanceFilter, setPerformanceFilter] = useState<PerformanceFilter>('all');
  const [engagementFilter, setEngagementFilter] = useState<EngagementFilter>('all');
  const [streakFilter, setStreakFilter] = useState<StreakFilter>('all');
  const [sortField, setSortField] = useState<SortField>('lastActive');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  const filteredAndSorted = useMemo(() => {
    let filtered = [...students];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        (s.grade && s.grade.toLowerCase().includes(query))
      );
    }

    // Performance filter
    if (performanceFilter === 'excellent') {
      filtered = filtered.filter(s => s.avgScore >= 90);
    } else if (performanceFilter === 'good') {
      filtered = filtered.filter(s => s.avgScore >= 70 && s.avgScore < 90);
    } else if (performanceFilter === 'needs-support') {
      filtered = filtered.filter(s => s.avgScore < 70);
    }

    // Engagement filter
    if (engagementFilter === 'active') {
      filtered = filtered.filter(s => {
        if (!s.lastActive) return false;
        const daysSince = Math.floor((Date.now() - new Date(s.lastActive).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince <= 3;
      });
    } else if (engagementFilter === 'inactive') {
      filtered = filtered.filter(s => {
        if (!s.lastActive) return true;
        const daysSince = Math.floor((Date.now() - new Date(s.lastActive).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince > 3 && daysSince <= 7;
      });
    } else if (engagementFilter === 'at-risk') {
      filtered = filtered.filter(s => {
        if (!s.lastActive) return true;
        const daysSince = Math.floor((Date.now() - new Date(s.lastActive).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince > 7;
      });
    }

    // Streak filter
    if (streakFilter === 'active') {
      filtered = filtered.filter(s => s.streak > 0);
    } else if (streakFilter === 'none') {
      filtered = filtered.filter(s => s.streak === 0);
    } else if (streakFilter === 'lost') {
      // TODO: Implement lost streak detection (had streak, broke it)
      filtered = filtered;
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'grade':
          aVal = a.grade || 'zzz';
          bVal = b.grade || 'zzz';
          break;
        case 'tests':
          aVal = a.testsCompleted;
          bVal = b.testsCompleted;
          break;
        case 'score':
          aVal = a.avgScore;
          bVal = b.avgScore;
          break;
        case 'trend':
          const trendOrder = { up: 1, stable: 0, down: -1 };
          aVal = trendOrder[a.recentTrend];
          bVal = trendOrder[b.recentTrend];
          break;
        case 'streak':
          aVal = a.streak;
          bVal = b.streak;
          break;
        case 'lastActive':
          aVal = a.lastActive ? new Date(a.lastActive).getTime() : 0;
          bVal = b.lastActive ? new Date(b.lastActive).getTime() : 0;
          break;
        case 'risk':
          const riskOrder = { 'excellent': 3, 'good': 2, 'at-risk': 1 };
          aVal = riskOrder[a.riskLevel];
          bVal = riskOrder[b.riskLevel];
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [students, searchQuery, performanceFilter, engagementFilter, streakFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-300';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'at-risk': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'excellent': return '🟢';
      case 'good': return '🟡';
      case 'at-risk': return '🔴';
      default: return '⚪';
    }
  };

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const toggleAll = () => {
    if (selectedStudents.size === filteredAndSorted.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredAndSorted.map(s => s.id)));
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
          </div>
          
          {/* Performance Filter */}
          <select
            value={performanceFilter}
            onChange={(e) => setPerformanceFilter(e.target.value as PerformanceFilter)}
            className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
          >
            <option value="all">All Performance</option>
            <option value="excellent">Excellent (&gt;90%)</option>
            <option value="good">Good (70-89%)</option>
            <option value="needs-support">Needs Support (&lt;70%)</option>
          </select>
          
          {/* Engagement Filter */}
          <select
            value={engagementFilter}
            onChange={(e) => setEngagementFilter(e.target.value as EngagementFilter)}
            className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
          >
            <option value="all">All Engagement</option>
            <option value="active">Active (last 3 days)</option>
            <option value="inactive">Inactive (3-7 days)</option>
            <option value="at-risk">At Risk (&gt;7 days)</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Streak Filter */}
          <select
            value={streakFilter}
            onChange={(e) => setStreakFilter(e.target.value as StreakFilter)}
            className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
          >
            <option value="all">All Streaks</option>
            <option value="active">Active Streak</option>
            <option value="none">No Streak</option>
            <option value="lost">Lost Streak</option>
          </select>
          
          {/* Bulk Actions */}
          {selectedStudents.size > 0 && (
            <div className="md:col-span-2 flex items-center gap-2">
              <span className="text-sm text-gray-600">{selectedStudents.size} selected</span>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm">
                Send Encouragement Email
              </button>
              <button className="px-4 py-2 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors text-sm">
                Export Selected
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left">
                <input
                  type="checkbox"
                  checked={selectedStudents.size === filteredAndSorted.length && filteredAndSorted.length > 0}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('grade')}>
                Grade {sortField === 'grade' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('tests')}>
                Tests {sortField === 'tests' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('score')}>
                Avg Score {sortField === 'score' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('trend')}>
                Trend {sortField === 'trend' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('streak')}>
                Streak {sortField === 'streak' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('lastActive')}>
                Last Active {sortField === 'lastActive' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('risk')}>
                Risk Level {sortField === 'risk' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSorted.map((student) => (
              <tr 
                key={student.id} 
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onStudentSelect && onStudentSelect(student.id)}
              >
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedStudents.has(student.id)}
                    onChange={() => toggleStudent(student.id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {student.photoURL ? (
                      <img src={student.photoURL} alt={student.name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">{student.grade || 'N/A'}</td>
                <td className="px-6 py-4 text-right text-sm font-medium text-gray-700">{student.testsCompleted}</td>
                <td className="px-6 py-4 text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    student.avgScore >= 90 ? 'bg-green-100 text-green-800' :
                    student.avgScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {student.avgScore}%
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {student.recentTrend === 'up' && <span className="text-green-600 font-bold text-lg">↑</span>}
                  {student.recentTrend === 'down' && <span className="text-red-600 font-bold text-lg">↓</span>}
                  {student.recentTrend === 'stable' && <span className="text-gray-600 font-bold text-lg">→</span>}
                </td>
                <td className="px-6 py-4 text-center">
                  {student.streak > 0 ? (
                    <span className="text-orange-600 font-bold">🔥 {student.streak}</span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {student.lastActive 
                    ? (() => {
                        const daysSince = Math.floor((Date.now() - new Date(student.lastActive).getTime()) / (1000 * 60 * 60 * 24));
                        if (daysSince === 0) return 'Today';
                        if (daysSince === 1) return 'Yesterday';
                        if (daysSince < 7) return `${daysSince} days ago`;
                        return new Date(student.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      })()
                    : 'Never'}
                </td>
                <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getRiskColor(student.riskLevel)}`}>
                    {getRiskIcon(student.riskLevel)} {student.riskLevel}
                  </span>
                </td>
                <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={`/admin/students/${student.id}`}
                    className="text-indigo-600 hover:text-indigo-900 font-semibold text-sm"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredAndSorted.length === 0 && (
        <div className="p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-600">No students match your filters</p>
        </div>
      )}
    </div>
  );
}
