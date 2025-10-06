import React from 'react';

interface UserProfileProps {
  user: {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
  theme: 'light' | 'dark';
  onChangePassword?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, theme, onChangePassword }) => {
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

  return (
    <div className={`p-6 rounded-lg ${
      theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <div className="flex items-center space-x-4 mb-6">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
          theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
        }`}>
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
          </h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            @{user.username}
          </p>
        </div>
      </div>

      <div className="space-y-4">
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
            User ID
          </label>
          <p className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {user.id}
          </p>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Account Status
          </label>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className={`text-sm ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
              Active
            </span>
          </div>
        </div>
      </div>

      <div className={`mt-6 p-4 rounded-lg ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
      }`}>
        <h3 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Quick Actions
        </h3>
        <div className="flex space-x-2">
          <button 
            onClick={onChangePassword}
            className={`px-3 py-1 text-xs rounded ${
              theme === 'dark' 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            Change Password
          </button>
        </div>
      </div>

    </div>
  );
};

export default UserProfile;
