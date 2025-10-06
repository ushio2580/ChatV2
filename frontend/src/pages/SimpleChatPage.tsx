import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: 'TEXT' | 'SYSTEM';
}

const SimpleChatPage: React.FC = () => {
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
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      return;
    }

    try {
      console.log('📤 Sending message:', newMessage.trim());
      
      // Send message via API
      const response = await fetch('http://localhost:3003/api/messages/group/general', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          type: 'TEXT'
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Message sent successfully:', data);
        
        // Add message to local state
        const tempMessage: Message = {
          id: data.messageData?.id || `temp-${Date.now()}`,
          content: newMessage.trim(),
          senderId: user?.id || 'unknown',
          senderName: user?.username || 'You',
          timestamp: new Date(),
          type: 'TEXT'
        };
        
        setMessages(prev => [...prev, tempMessage]);
        setNewMessage('');
        setError(null);
      } else {
        const errorData = await response.json();
        console.error('❌ Error sending message:', errorData);
        setError(errorData.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setError('Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const loadMessages = async () => {
    try {
      console.log('💬 Loading messages...');
      const response = await fetch('http://localhost:3003/api/groups/general/messages');
      const data = await response.json();
      console.log('💬 Messages loaded:', data);
      
      if (data.messages) {
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg._id,
          content: msg.content,
          senderId: msg.senderId,
          senderName: msg.senderName || 'Unknown',
          timestamp: new Date(msg.timestamp),
          type: 'TEXT'
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      setError('Failed to load messages');
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch('http://localhost:3003/health');
      const data = await response.json();
      console.log('✅ Backend connection test:', data);
      setIsConnected(true);
      setError(null);
    } catch (error) {
      console.error('❌ Backend connection test failed:', error);
      setIsConnected(false);
      setError('Backend connection failed');
    }
  };

  useEffect(() => {
    testConnection();
    loadMessages();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Simple Chat Platform</h1>
            <span className="text-sm text-gray-500">Welcome, {user?.username}</span>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={testConnection}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Test Connection
            </button>
            <button
              onClick={loadMessages}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              Load Messages
            </button>
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 mx-6 mt-4 rounded-lg flex items-center">
          <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
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
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
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

export default SimpleChatPage;
