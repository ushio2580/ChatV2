import React from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isOnline: boolean;
  lastSeen: Date;
}

interface UserInfoModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onStartChat?: () => void;
}

const UserInfoModal: React.FC<UserInfoModalProps> = ({ 
  user, 
  isOpen, 
  onClose, 
  theme, 
  onStartChat 
}) => {
  if (!isOpen || !user) return null;

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'text-red-600 bg-red-100';
      case 'moderator':
        return 'text-yellow-600 bg-yellow-100';
      case 'user':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
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
        return '❓';
    }
  };

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`rounded-lg p-6 w-full max-w-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            User Information
          </h3>
          <button
            onClick={onClose}
            className={`text-gray-400 hover:text-gray-600 ${theme === 'dark' ? 'hover:text-gray-200' : ''}`}
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              theme === 'dark' ? 'bg-blue-600' : 'bg-primary-600'
            }`}>
              <span className="text-white text-2xl font-bold">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h4 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
              </h4>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                @{user.username}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Email Address
              </label>
              <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {user.email}
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Role
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getRoleIcon(user.role)}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                  {user.role.toUpperCase()}
                </span>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Status
              </label>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {user.isOnline ? 'Online' : 'Offline'}
                </span>
                {!user.isOnline && (
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    ({formatLastSeen(user.lastSeen)})
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                User ID
              </label>
              <p className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {user.id}
              </p>
            </div>
          </div>
        </div>

        <div className={`mt-6 p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <h3 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Actions
          </h3>
          <div className="flex space-x-2">
            {onStartChat && (
              <button
                onClick={onStartChat}
                className={`px-3 py-1 text-xs rounded ${
                  theme === 'dark' 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                Start Chat
              </button>
            )}
            <button className={`px-3 py-1 text-xs rounded ${
              theme === 'dark' 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}>
              View Profile
            </button>
            <button className={`px-3 py-1 text-xs rounded ${
              theme === 'dark' 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}>
              Block User
            </button>
            <button className={`px-3 py-1 text-xs rounded ${
              theme === 'dark' 
                ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            }`}>
              Report
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg ${
              theme === 'dark' 
                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserInfoModal;
