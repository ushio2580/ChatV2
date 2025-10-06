import React from 'react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: 'TEXT' | 'SYSTEM';
}

interface MessageInfoModalProps {
  message: Message | null;
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  isOwnMessage: boolean;
}

const MessageInfoModal: React.FC<MessageInfoModalProps> = ({ 
  message, 
  isOpen, 
  onClose, 
  theme, 
  isOwnMessage 
}) => {
  if (!isOpen || !message) return null;

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'text':
        return '💬';
      case 'system':
        return '🔔';
      case 'file':
        return '📁';
      case 'image':
        return '🖼️';
      default:
        return '❓';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`rounded-lg p-6 w-full max-w-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Message Information
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
              theme === 'dark' ? 'bg-blue-600' : 'bg-primary-600'
            }`}>
              <span className="text-white text-lg font-medium">
                {message.senderName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {message.senderName}
              </h4>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {isOwnMessage ? 'You' : 'Other user'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Message Type
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getMessageTypeIcon(message.type)}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>
                  {message.type.toUpperCase()}
                </span>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Content
              </label>
              <div className={`p-3 rounded-lg ${
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {message.content}
                </p>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Timestamp
              </label>
              <div className="space-y-1">
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {message.timestamp.toLocaleString()}
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {formatTimestamp(message.timestamp)}
                </p>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Message ID
              </label>
              <p className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {message.id}
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
            <button className={`px-3 py-1 text-xs rounded ${
              theme === 'dark' 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}>
              Reply
            </button>
            <button className={`px-3 py-1 text-xs rounded ${
              theme === 'dark' 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}>
              Copy Text
            </button>
            <button className={`px-3 py-1 text-xs rounded ${
              theme === 'dark' 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}>
              Share
            </button>
            {isOwnMessage && (
              <button className={`px-3 py-1 text-xs rounded ${
                theme === 'dark' 
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}>
                Edit
              </button>
            )}
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

export default MessageInfoModal;
