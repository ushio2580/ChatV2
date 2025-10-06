import React from 'react';

interface Group {
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
}

interface GroupInfoModalProps {
  group: Group | null;
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onJoin?: () => void;
  onLeave?: () => void;
  isMember?: boolean;
}

const GroupInfoModal: React.FC<GroupInfoModalProps> = ({ 
  group, 
  isOpen, 
  onClose, 
  theme, 
  onJoin, 
  onLeave, 
  isMember = false 
}) => {
  if (!isOpen || !group) return null;

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`rounded-lg p-6 w-full max-w-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Group Information
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
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              theme === 'dark' ? 'bg-purple-600' : 'bg-purple-500'
            }`}>
              <span className="text-white text-lg font-medium">
                {group.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {group.name}
              </h4>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {group.description || 'No description available'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
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

export default GroupInfoModal;
