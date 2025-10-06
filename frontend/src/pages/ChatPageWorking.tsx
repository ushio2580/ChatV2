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

const ChatPageWorking: React.FC = () => {
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('general');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial data
  useEffect(() => {
    loadGroups();
    loadUsers();
    loadMessages();
  }, []);

  // Socket connection
  useEffect(() => {
    if (user?.tokens?.accessToken) {
      console.log('Connecting to socket with token:', user.tokens.accessToken);
      
      const socket = socketService.connect(user.tokens.accessToken);
      
      socket.on('connect', () => {
        console.log('✅ Connected to chat server');
        setIsConnected(true);
        setError(null);
        socketService.joinGroup('general');
      });

      socket.on('disconnect', () => {
        console.log('❌ Disconnected from chat server');
        setIsConnected(false);
      });

      // Listen for new messages
      socket.on('group-message', (data: any) => {
        console.log('📨 Received group message:', data);
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

      // Listen for private messages
      socket.on('private-message-received', (data: any) => {
        console.log('📨 Received private message:', data);
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

      // Listen for typing indicators
      socket.on('user-typing', (data: any) => {
        console.log('⌨️ User typing:', data);
        setTypingUsers(prev => {
          if (!prev.includes(data.userId)) {
            return [...prev, data.userId];
          }
          return prev;
        });
      });

      socket.on('user-stopped-typing', (data: any) => {
        console.log('⌨️ User stopped typing:', data);
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      });

      socket.on('error', (error: any) => {
        console.error('❌ Socket error:', error);
        setError(error.message || 'Socket connection error');
      });

      return () => {
        console.log('🔌 Disconnecting socket');
        socketService.disconnect();
      };
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadGroups = async () => {
    try {
      console.log('📋 Loading groups...');
      const response = await fetch('http://localhost:3003/api/groups');
      const data = await response.json();
      console.log('📋 Groups loaded:', data);
      setGroups(data.groups || []);
    } catch (error) {
      console.error('❌ Error loading groups:', error);
      setError('Failed to load groups');
    }
  };

  const loadUsers = async () => {
    try {
      console.log('👥 Loading users...');
      const response = await fetch('http://localhost:3003/api/users');
      const data = await response.json();
      console.log('👥 Users loaded:', data);
      setUsers(data.users || []);
    } catch (error) {
      console.error('❌ Error loading users:', error);
      setError('Failed to load users');
    }
  };

  const loadMessages = async () => {
    try {
      console.log('💬 Loading messages for group:', selectedGroup);
      const response = await fetch(`http://localhost:3003/api/groups/${selectedGroup}/messages`);
      const data = await response.json();
      console.log('💬 Messages loaded:', data);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      setError('Failed to load messages');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !isConnected) {
      console.log('❌ Cannot send message:', { newMessage: newMessage.trim(), isConnected });
      return;
    }

    try {
      console.log('📤 Sending message:', { selectedGroup, selectedUser, content: newMessage.trim() });
      
      if (selectedUser) {
        // Send private message
        socketService.sendPrivateMessage(selectedUser, newMessage.trim(), 'TEXT');
      } else {
        // Send group message
        socketService.sendGroupMessage(selectedGroup, newMessage.trim(), 'TEXT');
      }
      
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
      
      // Stop typing indicator
      setIsTyping(false);
      socketService.stopTyping(selectedGroup, selectedUser);
      
      console.log('✅ Message sent successfully');
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

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Start typing indicator
    if (!isTyping) {
      setIsTyping(true);
      socketService.startTyping(selectedGroup, selectedUser);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.stopTyping(selectedGroup, selectedUser);
    }, 1000);
  };

  const createGroup = async (groupData: { name: string; description?: string }) => {
    try {
      console.log('📝 Creating group:', groupData);
      const response = await fetch('http://localhost:3003/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      });
      
      if (response.ok) {
        console.log('✅ Group created successfully');
        await loadGroups();
        setShowCreateGroup(false);
      } else {
        const errorData = await response.json();
        console.error('❌ Error creating group:', errorData);
        setError(errorData.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('❌ Error creating group:', error);
      setError('Failed to create group');
    }
  };

  const joinGroup = async (groupId: string) => {
    try {
      console.log('🚪 Joining group:', groupId);
      const response = await fetch(`http://localhost:3003/api/groups/${groupId}/join`, {
        method: 'POST',
      });
      
      if (response.ok) {
        console.log('✅ Joined group successfully');
        await loadGroups();
      } else {
        const errorData = await response.json();
        console.error('❌ Error joining group:', errorData);
        setError(errorData.error || 'Failed to join group');
      }
    } catch (error) {
      console.error('❌ Error joining group:', error);
      setError('Failed to join group');
    }
  };

  const startPrivateChat = (userId: string) => {
    console.log('💬 Starting private chat with:', userId);
    setSelectedUser(userId);
    setSelectedGroup('');
    setMessages([]);
    setShowUserList(false);
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
            <button
              onClick={() => setShowCreateGroup(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Create Group
            </button>
            <button
              onClick={() => setShowUserList(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              Private Chat
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
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Groups</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {/* General Group */}
              <div 
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedGroup === 'general' ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  setSelectedGroup('general');
                  setSelectedUser(null);
                  loadMessages();
                }}
              >
                <h3 className="font-medium text-gray-900">General</h3>
                <p className="text-sm text-gray-600">Welcome to the chat platform!</p>
                <p className="text-xs text-gray-500 mt-1">{messages.length} messages</p>
              </div>

              {/* Other Groups */}
              {groups.map((group) => (
                <div 
                  key={group.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedGroup === group.id ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedGroup(group.id);
                    setSelectedUser(null);
                    loadMessages();
                  }}
                >
                  <h3 className="font-medium text-gray-900">{group.name}</h3>
                  <p className="text-sm text-gray-600">{group.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{group.members.length} members</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedUser ? `Private Chat with ${users.find(u => u.id === selectedUser)?.username}` : 
               selectedGroup === 'general' ? 'General Chat' : 
               groups.find(g => g.id === selectedGroup)?.name || 'Chat'}
            </h2>
            <p className="text-sm text-gray-500">
              {selectedUser ? 'Private conversation' : 'Welcome to the discussion'}
            </p>
            {typingUsers.length > 0 && (
              <p className="text-xs text-blue-500 mt-1">
                {typingUsers.length} user{typingUsers.length > 1 ? 's' : ''} typing...
              </p>
            )}
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
                onChange={handleTyping}
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

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Group</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              createGroup({
                name: formData.get('name') as string,
                description: formData.get('description') as string,
              });
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User List Modal */}
      {showUserList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Start Private Chat</h3>
            <div className="max-h-64 overflow-y-auto">
              {users.filter(u => u.id !== user?.id).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                  onClick={() => startPrivateChat(user.id)}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-sm font-medium">{user.username}</span>
                  </div>
                  <span className="text-xs text-gray-500">{user.isOnline ? 'Online' : 'Offline'}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowUserList(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPageWorking;
