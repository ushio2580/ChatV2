import React from 'react';

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

interface UserListProps {
  users: User[];
  theme: 'light' | 'dark';
  showOnlineOnly: boolean;
  onUserClick: (userId: string) => void;
  onToggleOnlineOnly: (value: boolean) => void;
}

const UserList: React.FC<UserListProps> = ({ 
  users, 
  theme, 
  showOnlineOnly, 
  onUserClick, 
  onToggleOnlineOnly 
}) => {
  const filteredUsers = showOnlineOnly 
    ? users.filter(u => u.isOnline)
    : users;

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

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
      {/* WhatsApp-style Header */}
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
              {filteredUsers.length} {showOnlineOnly ? 'online' : 'total'} users
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="onlineOnly"
              checked={showOnlineOnly}
              onChange={(e) => onToggleOnlineOnly(e.target.checked)}
              className="rounded"
            />
            <label 
              htmlFor="onlineOnly" 
              className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Online only
            </label>
          </div>
        </div>
      </div>

      {/* WhatsApp-style User List */}
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
              {showOnlineOnly ? 'No users are currently online' : 'No users available'}
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
    </div>
  );
};

export default UserList;