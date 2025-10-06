import React from 'react';

interface GroupInfoProps {
  group: {
    id: string;
    name: string;
    description?: string;
    type: string;
    ownerId: string;
    members: string[];
    admins: string[];
    settings: {
      maxMembers: number;
      allowFileUpload: boolean;
      allowAnonymous: boolean;
    };
    createdAt: Date;
  };
  theme: 'light' | 'dark';
  onJoin?: () => void;
  onLeave?: () => void;
  isMember?: boolean;
}

const GroupInfo: React.FC<GroupInfoProps> = ({ 
  group, 
  theme, 
  onJoin, 
  onLeave, 
  isMember = false 
}) => {
  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'public':
        return 'text-green-600 bg-green-100';
      case 'private':
        return 'text-red-600 bg-red-100';
      case 'group':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'public':
        return '🌐';
      case 'private':
        return '🔒';
      case 'group':
        return '👥';
      default:
        return '❓';
    }
  };

  return (
    <div className={`p-6 rounded-lg ${
      theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <div className="flex items-center space-x-4 mb-6">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${
          theme === 'dark' ? 'bg-purple-600' : 'bg-purple-500'
        }`}>
          <span className="text-white">
            {group.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {group.name}
          </h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            {group.description || 'No description available'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Group Type
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getTypeIcon(group.type)}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(group.type)}`}>
              {group.type.toUpperCase()}
            </span>
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Members
          </label>
          <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {group.members.length} / {group.settings.maxMembers}
          </p>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Admins
          </label>
          <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {group.admins.length} admin{group.admins.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Settings
          </label>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`text-xs ${group.settings.allowFileUpload ? 'text-green-600' : 'text-red-600'}`}>
                {group.settings.allowFileUpload ? '✅' : '❌'}
              </span>
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                File Upload
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-xs ${group.settings.allowAnonymous ? 'text-green-600' : 'text-red-600'}`}>
                {group.settings.allowAnonymous ? '✅' : '❌'}
              </span>
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Anonymous Access
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Created
          </label>
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {new Date(group.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className={`mt-6 p-4 rounded-lg ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
      }`}>
        <h3 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Actions
        </h3>
        <div className="flex space-x-2">
          {!isMember && onJoin && (
            <button
              onClick={onJoin}
              className={`px-3 py-1 text-xs rounded ${
                theme === 'dark' 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              Join Group
            </button>
          )}
          {isMember && onLeave && (
            <button
              onClick={onLeave}
              className={`px-3 py-1 text-xs rounded ${
                theme === 'dark' 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              Leave Group
            </button>
          )}
          <button className={`px-3 py-1 text-xs rounded ${
            theme === 'dark' 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}>
            View Members
          </button>
          <button className={`px-3 py-1 text-xs rounded ${
            theme === 'dark' 
              ? 'bg-purple-600 text-white hover:bg-purple-700' 
              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
          }`}>
            Group Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupInfo;
