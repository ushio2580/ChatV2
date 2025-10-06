import React, { useState } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isOnline: boolean;
  lastSeen: Date | string;
}

interface UnifiedUserPanelProps {
  users: User[];
  theme: 'light' | 'dark';
  onUserClick: (userId: string) => void;
  onClose: () => void;
}

const UnifiedUserPanel: React.FC<UnifiedUserPanelProps> = ({ 
  users, 
  theme, 
  onUserClick, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'online' | 'all' | 'recent'>('online');
  const [searchQuery, setSearchQuery] = useState('');

  const onlineUsers = users.filter(u => u.isOnline);
  const offlineUsers = users.filter(u => !u.isOnline);
  const totalUsers = users.length;

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'moderator':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'user':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return '👑';
      case 'moderator':
        return '🛡️';
      case 'user':
        return '👤';
      default:
        return '👤';
    }
  };

  const getInitials = (username: string) => {
    return username.length > 1 ? username.substring(0, 2).toUpperCase() : username.toUpperCase();
  };

  const getRandomColor = (username: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-indigo-500', 'bg-red-500', 'bg-yellow-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-violet-500'
    ];
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatLastSeen = (lastSeen: Date | string) => {
    if (!lastSeen) return 'Never';
    
    const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
    if (isNaN(date.getTime())) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  const getFilteredUsers = () => {
    let filtered = users;
    
    // Filter by tab
    switch (activeTab) {
      case 'online':
        filtered = onlineUsers;
        break;
      case 'all':
        filtered = users;
        break;
      case 'recent':
        // Sort by lastSeen and take most recent
        filtered = [...users].sort((a, b) => {
          const aTime = typeof a.lastSeen === 'string' ? new Date(a.lastSeen).getTime() : a.lastSeen.getTime();
          const bTime = typeof b.lastSeen === 'string' ? new Date(b.lastSeen).getTime() : b.lastSeen.getTime();
          return bTime - aTime;
        }).slice(0, 10);
        break;
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.firstName && user.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.lastName && user.lastName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <span className="text-lg">👥</span>
          </div>
          <div>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Users
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {filteredUsers.length} {activeTab === 'online' ? 'online' : activeTab === 'recent' ? 'recent' : 'total'} users
            </p>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className={`p-2 rounded-lg transition-colors ${
            theme === 'dark' 
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          ✕
        </button>
      </div>

      {/* Stats Bar */}
      <div className={`p-3 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className={`${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                {onlineUsers.length} online
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {offlineUsers.length} offline
              </span>
            </div>
          </div>
          <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            {totalUsers} total
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full px-4 py-2 pl-10 rounded-lg border transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
            }`}
          />
          <div className="absolute left-3 top-2.5">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        {[
          { key: 'online', label: 'Online', count: onlineUsers.length },
          { key: 'all', label: 'All Users', count: totalUsers },
          { key: 'recent', label: 'Recent', count: Math.min(10, totalUsers) }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? theme === 'dark'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                  : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
            }`}>
              <span className="text-2xl">👥</span>
            </div>
            <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              No users found
            </h3>
            <p className={`text-sm text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {searchQuery ? 'Try adjusting your search' : 'No users available'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => onUserClick(user.id)}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150 ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md ${getRandomColor(user.username)}`}>
                      {getInitials(user.username)}
                    </div>
                    {/* Online indicator */}
                    {user.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                    )}
                  </div>
                  
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {user.username}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)} {user.role}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {user.email}
                      </p>
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        •
                      </span>
                      <p className={`text-xs ${user.isOnline ? 'text-green-600' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {user.isOnline ? 'Online' : `Last seen ${formatLastSeen(user.lastSeen)}`}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action indicator */}
                  <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Click on a user to start a private chat</span>
          <span>{filteredUsers.length} users shown</span>
        </div>
      </div>
    </div>
  );
};

export default UnifiedUserPanel;
