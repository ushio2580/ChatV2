import React from 'react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: 'TEXT' | 'SYSTEM';
}

interface MessageListProps {
  messages: Message[];
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
  currentUserId?: string;
  onMessageClick?: (message: Message) => void;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  theme, 
  fontSize, 
  currentUserId,
  onMessageClick 
}) => {
  const fontSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

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
    <div className="space-y-4">
      {messages.map((message, index) => (
        <div 
          key={`message-${message.id || `temp-${index}`}`} 
          className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
        >
          <div 
            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${fontSizeClasses[fontSize]} ${
              message.senderId === currentUserId 
                ? 'bg-primary-600 text-white' 
                : message.type === 'SYSTEM'
                ? (theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700')
                : (theme === 'dark' ? 'bg-gray-700 border border-gray-600 text-gray-100' : 'bg-white border border-gray-200 text-gray-900')
            }`}
            onClick={() => onMessageClick?.(message)}
          >
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs">{getMessageTypeIcon(message.type)}</span>
              <span className={`text-xs ${
                message.senderId === currentUserId ? 'text-primary-100' : (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')
              }`}>
                {message.senderName}
              </span>
            </div>
            <p className="text-sm">{message.content}</p>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-xs ${
                message.senderId === currentUserId ? 'text-primary-100' : (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')
              }`}>
                {formatTimestamp(message.timestamp)}
              </span>
              <span className={`text-xs ${
                message.senderId === currentUserId ? 'text-primary-100' : (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;
