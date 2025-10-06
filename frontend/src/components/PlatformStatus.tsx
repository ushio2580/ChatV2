import React, { useState, useEffect } from 'react';

interface PlatformStatusProps {
  theme: 'light' | 'dark';
  isConnected: boolean;
  users: Array<{
    id: string;
    username: string;
    isOnline: boolean;
  }>;
  onTestConnection: () => void;
  onViewUsers?: () => void;
}

const PlatformStatus: React.FC<PlatformStatusProps> = ({ 
  theme, 
  isConnected, 
  users,
  onTestConnection,
  onViewUsers
}) => {
  const [lastSeen, setLastSeen] = useState<Date>(new Date());
  const onlineUsers = users.filter(user => user.isOnline);
  const offlineUsers = users.filter(user => !user.isOnline);

  useEffect(() => {
    if (isConnected) {
      setLastSeen(new Date());
    }
  }, [isConnected]);

  const getInitials = (username: string) => {
    return username.length > 1 ? username.substring(0, 2).toUpperCase() : username.toUpperCase();
  };

  const getRandomColor = (username: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-indigo-500', 'bg-red-500', 'bg-yellow-500', 'bg-teal-500'
    ];
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className={`flex items-center space-x-4 px-4 py-3 rounded-xl ${
      theme === 'dark' ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'
    } shadow-sm`}>
      
      {/* Server Status */}
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        } ${isConnected ? 'animate-pulse' : ''}`}></div>
        <span className={`text-sm font-medium ${
          isConnected ? 'text-green-600' : 'text-red-600'
        }`}>
          {isConnected ? '🟢 Server Online' : '🔴 Server Offline'}
        </span>
        {isConnected && (
          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {lastSeen.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Separator */}
      <div className={`w-px h-6 ${
        theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
      }`}></div>

      {/* Users Status */}
      <div className="flex items-center space-x-2">
        <div className="flex -space-x-1">
          {onlineUsers.slice(0, 3).map((user, index) => (
            <div
              key={`online-${user.id || `temp-${index}`}`}
              className={`w-6 h-6 rounded-full border-2 ${
                theme === 'dark' ? 'border-gray-800' : 'border-white'
              } flex items-center justify-center text-xs font-bold ${getRandomColor(user.username)} text-white shadow-sm`}
              style={{ zIndex: 3 - index }}
              title={`${user.username} (Online)`}
            >
              {getInitials(user.username)}
            </div>
          ))}
          {onlineUsers.length > 3 && (
            <div className={`w-6 h-6 rounded-full border-2 ${
              theme === 'dark' ? 'border-gray-800' : 'border-white'
            } flex items-center justify-center text-xs font-bold ${
              theme === 'dark' ? 'bg-green-600' : 'bg-green-500'
            } text-white shadow-sm`} title={`${onlineUsers.length - 3} more online`}>
              +{onlineUsers.length - 3}
            </div>
          )}
        </div>
        <span className={`text-sm font-medium ${
          theme === 'dark' ? 'text-green-400' : 'text-green-600'
        }`}>
          {onlineUsers.length} online
        </span>
      </div>

      {/* Total Users */}
      <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
        ({users.length} total)
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onTestConnection}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            theme === 'dark' 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
          title="Test server connection"
        >
          Test
        </button>
        {onViewUsers && (
          <button
            onClick={onViewUsers}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              theme === 'dark' 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
            title="View all users"
          >
            Users
          </button>
        )}
      </div>
    </div>
  );
};

export default PlatformStatus;
