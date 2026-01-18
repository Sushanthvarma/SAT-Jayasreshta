'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  displayName: string;
  grade: string | null;
  totalTestsCompleted: number;
  currentStreak: number;
  xp: number;
  level: number;
}

interface UserSearchProps {
  onUserSelect: (userId: string) => void;
  selectedUserId: string | null;
  authToken: string;
}

export default function UserSearch({ onUserSelect, selectedUserId, authToken }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/admin/users?q=${encodeURIComponent(searchQuery)}&limit=10`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });
        const data = await response.json();
        if (data.success) {
          setUsers(data.users || []);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, authToken]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search users by name, email, or grade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowDropdown(users.length > 0)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {showDropdown && users.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-96 overflow-y-auto">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => {
                onUserSelect(user.id);
                setSearchQuery(user.displayName);
                setShowDropdown(false);
              }}
              className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                selectedUserId === user.id ? 'bg-indigo-100' : ''
              }`}
            >
              <div className="font-semibold text-gray-900">{user.displayName}</div>
              <div className="text-sm text-gray-600">{user.email}</div>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                {user.grade && <span>Grade: {user.grade}</span>}
                <span>Tests: {user.totalTestsCompleted}</span>
                <span>Level: {user.level}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
