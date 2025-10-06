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

interface GroupListProps {
  groups: Group[];
  theme: 'light' | 'dark';
  selectedGroup: string;
  onGroupSelect: (groupId: string) => void;
  onGroupInfo: (group: Group) => void;
}

const GroupList: React.FC<GroupListProps> = ({ 
  groups, 
  theme, 
  selectedGroup, 
  onGroupSelect, 
  onGroupInfo 
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
      <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Groups ({groups.length})
      </h3>
      
      <div className="space-y-2">
        {/* Groups */}
        {groups.map((group, index) => (
          <div 
            key={`group-list-${group.id || `temp-${index}`}`}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${
              selectedGroup === group.id 
                ? (theme === 'dark' ? 'bg-blue-900 border border-blue-700' : 'bg-primary-50 border border-primary-200')
                : (theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
            }`}
            onClick={() => onGroupSelect(group.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {group.name}
                </h4>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {group.description || 'No description available'}
                </p>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {group.members.length} members • {group.admins.length} admins
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getTypeIcon(group.type)}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(group.type)}`}>
                  {group.type.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGroupInfo(group);
                }}
                className={`px-2 py-1 text-xs rounded ${
                  theme === 'dark' 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Info
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {groups.length === 0 && (
        <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>No groups found</p>
          <p className="text-xs mt-1">Create a new group to get started</p>
        </div>
      )}
    </div>
  );
};

export default GroupList;
