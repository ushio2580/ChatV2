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

interface UserListModalProps {
  users: User[];
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  showOnlineOnly: boolean;
  onUserClick: (userId: string) => void;
  onToggleOnlineOnly: (value: boolean) => void;
}

const UserListModal: React.FC<UserListModalProps> = ({ 
  users, 
  isOpen, 
  onClose, 
  theme, 
  showOnlineOnly, 
  onUserClick, 
  onToggleOnlineOnly 
}) => {
  if (!isOpen) return null;

  const filteredUsers = showOnlineOnly 
    ? users.filter(u => u.isOnline)
    : users;

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
            Users ({filteredUsers.length})
          </h3>
          <div className="flex items-center space-x-2">
            <label className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Online only:
            </label>
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => onToggleOnlineOnly(e.target.checked)}
              className="rounded"
            />
          </div>
        </div>
        
        <div className="max-h-64 overflow-y-auto space-y-2">
          {filteredUsers.map((user, index) => (
            <div
              key={`user-modal-${user.id || `temp-${index}`}`}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
              }`}
              onClick={() => onUserClick(user.id)}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  theme === 'dark' ? 'bg-blue-600' : 'bg-primary-600'
                }`}>
                  <span className="text-white text-sm font-medium">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                    </span>
                    <span className="text-lg">{getRoleIcon(user.role)}</span>
                  </div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    @{user.username}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {user.isOnline ? 'Online' : formatLastSeen(user.lastSeen)}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getRoleColor(user.role)}`}>
                  {user.role.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {filteredUsers.length === 0 && (
          <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>No users found</p>
            {showOnlineOnly && (
              <p className="text-xs mt-1">Try turning off "Online only" filter</p>
            )}
          </div>
        )}

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

export default UserListModal;