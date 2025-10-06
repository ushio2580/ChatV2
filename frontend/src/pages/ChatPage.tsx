import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { socketService } from '../services/socketService';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: 'TEXT' | 'SYSTEM';
}

const ChatPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Welcome to the chat platform! This is a demo message.',
      senderId: 'system',
      senderName: 'System',
      timestamp: new Date(),
      type: 'SYSTEM'
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.tokens?.accessToken) {
      // Connect to socket
      const socket = socketService.connect(user.tokens.accessToken);
      
      socket.on('connect', () => {
        console.log('Connected to chat server');
        setIsConnected(true);
        
        // Join general group
        socketService.joinGroup('general');
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from chat server');
        setIsConnected(false);
      });

      // Listen for new messages
      socket.on('group-message', (data: any) => {
        const newMsg: Message = {
          id: data.id || Date.now().toString(),
          content: data.content,
          senderId: data.senderId,
          senderName: data.senderName || 'Unknown',
          timestamp: new Date(data.timestamp || Date.now()),
          type: 'TEXT'
        };
        setMessages(prev => [...prev, newMsg]);
      });

      socket.on('error', (error: any) => {
        console.error('Socket error:', error);
      });

      return () => {
        socketService.disconnect();
      };
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !isConnected) return;

    try {
      // Send message via socket
      socketService.sendGroupMessage('general', newMessage.trim(), 'TEXT');
      
      // Add message to local state immediately for better UX
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        content: newMessage.trim(),
        senderId: user?.id || 'unknown',
        senderName: user?.username || 'You',
        timestamp: new Date(),
        type: 'TEXT'
      };
      
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Chat Platform</h1>
            <span className="text-sm text-gray-500">Welcome, {user?.username}</span>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-gray-700">{user?.username}</span>
            </div>
            
            <button
              onClick={logout}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Groups</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
                <h3 className="font-medium text-primary-900">General</h3>
                <p className="text-sm text-primary-600">Welcome to the chat platform!</p>
                <p className="text-xs text-gray-500 mt-1">{messages.length} messages</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">General Chat</h2>
            <p className="text-sm text-gray-500">Welcome to the general discussion</p>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.senderId === user?.id 
                      ? 'bg-primary-600 text-white' 
                      : message.type === 'SYSTEM'
                      ? 'bg-gray-200 text-gray-700'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${
                        message.senderId === user?.id ? 'text-primary-100' : 'text-gray-500'
                      }`}>
                        {message.senderName}
                      </span>
                      <span className={`text-xs ${
                        message.senderId === user?.id ? 'text-primary-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <form onSubmit={handleSendMessage} className="flex space-x-4">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={!isConnected}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || !isConnected}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
