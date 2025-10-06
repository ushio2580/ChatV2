import React from 'react';

interface UserStatusIndicatorProps {
  users: Array<{
    id: string;
    username: string;
    isOnline: boolean;
  }>;
  theme: 'light' | 'dark';
  onClick?: () => void;
}

const UserStatusIndicator: React.FC<UserStatusIndicatorProps> = ({ 
  users, 
  theme, 
  onClick 
}) => {
  const onlineUsers = users.filter(user => user.isOnline);
  const offlineUsers = users.filter(user => !user.isOnline);
  const totalUsers = users.length;

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

  return (
    <div 
      className={`flex items-center space-x-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 shadow-md border ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-gray-700/80 to-gray-600/80 border-gray-600 hover:from-gray-700 hover:to-gray-600 hover:shadow-lg' 
          : 'bg-gradient-to-r from-gray-50/80 to-gray-100/80 border-gray-200 hover:from-gray-100 hover:to-gray-200 hover:shadow-lg'
      }`}
      onClick={onClick}
      title={`Click to view all users. Online: ${onlineUsers.map(u => u.username).join(', ')}${offlineUsers.length > 0 ? `. Offline: ${offlineUsers.map(u => u.username).join(', ')}` : ''}`}
    >
      {/* Online Users Section */}
      <div className="flex items-center space-x-3">
        <div className="flex -space-x-2">
          {onlineUsers.slice(0, 3).map((user, index) => (
            <div
              key={`online-${user.id || `temp-${index}`}`}
              className={`w-8 h-8 rounded-full border-2 ${
                theme === 'dark' ? 'border-gray-800' : 'border-white'
              } flex items-center justify-center text-white font-semibold text-xs shadow-md ${getRandomColor(user.username)}`}
              title={user.username}
            >
              {getInitials(user.username)}
            </div>
          ))}
          {onlineUsers.length > 3 && (
            <div className={`w-8 h-8 rounded-full border-2 ${
              theme === 'dark' ? 'border-gray-800 bg-gray-600' : 'border-white bg-gray-400'
            } flex items-center justify-center text-white font-semibold text-xs shadow-md`}>
              +{onlineUsers.length - 3}
            </div>
          )}
        </div>
        
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
              {onlineUsers.length} online
            </span>
          </div>
          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {totalUsers} total users
          </span>
        </div>
      </div>

      {/* Separator */}
      <div className={`w-px h-8 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>

      {/* Offline Users Section */}
      <div className="flex items-center space-x-3">
        <div className="flex -space-x-2">
          {offlineUsers.slice(0, 2).map((user, index) => (
            <div
              key={`offline-${user.id || `temp-${index}`}`}
              className={`w-8 h-8 rounded-full border-2 ${
                theme === 'dark' ? 'border-gray-800' : 'border-white'
              } flex items-center justify-center text-white font-semibold text-xs shadow-md ${getRandomColor(user.username)} opacity-60`}
              title={user.username}
            >
              {getInitials(user.username)}
            </div>
          ))}
          {offlineUsers.length > 2 && (
            <div className={`w-8 h-8 rounded-full border-2 ${
              theme === 'dark' ? 'border-gray-800 bg-gray-600' : 'border-white bg-gray-400'
            } flex items-center justify-center text-white font-semibold text-xs shadow-md opacity-60`}>
              +{offlineUsers.length - 2}
            </div>
          )}
        </div>
        
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {offlineUsers.length} offline
            </span>
          </div>
          <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            Click to manage
          </span>
        </div>
      </div>

      {/* Click indicator */}
      <div className={`ml-auto ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
};

export default UserStatusIndicator;