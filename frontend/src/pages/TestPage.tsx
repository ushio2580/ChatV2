import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const TestPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [backendStatus, setBackendStatus] = useState<string>('Checking...');
  const [groups, setGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [testMessage, setTestMessage] = useState('');
  const [socketStatus, setSocketStatus] = useState<string>('Not connected');

  useEffect(() => {
    testBackendConnection();
  }, []);

  const testBackendConnection = async () => {
    try {
      // Test health endpoint
      const healthResponse = await fetch('http://localhost:3003/health');
      const healthData = await healthResponse.json();
      setBackendStatus(`✅ Backend OK: ${healthData.status}`);

      // Test groups endpoint
      const groupsResponse = await fetch('http://localhost:3003/api/groups');
      const groupsData = await groupsResponse.json();
      setGroups(groupsData.groups || []);

      // Test users endpoint
      const usersResponse = await fetch('http://localhost:3003/api/users');
      const usersData = await usersResponse.json();
      setUsers(usersData.users || []);

      // Test messages endpoint
      const messagesResponse = await fetch('http://localhost:3003/api/groups/general/messages');
      const messagesData = await messagesResponse.json();
      setMessages(messagesData.messages || []);

    } catch (error) {
      console.error('Backend connection error:', error);
      setBackendStatus(`❌ Backend Error: ${error}`);
    }
  };

  const testLogin = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@test.com',
          password: '123456'
        }),
      });
      
      const data = await response.json();
      console.log('Login test result:', data);
      alert(`Login test: ${data.message || data.error}`);
    } catch (error) {
      console.error('Login test error:', error);
      alert(`Login test error: ${error}`);
    }
  };

  const testCreateGroup = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Test Group ${Date.now()}`,
          description: 'Test group created from frontend'
        }),
      });
      
      const data = await response.json();
      console.log('Create group test result:', data);
      alert(`Create group test: ${data.message || data.error}`);
      
      // Refresh groups
      testBackendConnection();
    } catch (error) {
      console.error('Create group test error:', error);
      alert(`Create group test error: ${error}`);
    }
  };

  const testSendMessage = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/messages/group/general', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: testMessage || 'Test message from frontend',
          type: 'TEXT'
        }),
      });
      
      const data = await response.json();
      console.log('Send message test result:', data);
      alert(`Send message test: ${data.message || data.error}`);
      
      // Refresh messages
      testBackendConnection();
    } catch (error) {
      console.error('Send message test error:', error);
      alert(`Send message test error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Chat Platform Test Page</h1>
          
          {/* User Info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">User Information</h2>
            <p><strong>Username:</strong> {user?.username || 'Not logged in'}</p>
            <p><strong>Email:</strong> {user?.email || 'Not logged in'}</p>
            <p><strong>ID:</strong> {user?.id || 'Not logged in'}</p>
            <button
              onClick={logout}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>

          {/* Backend Status */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <h2 className="text-xl font-semibold text-green-900 mb-2">Backend Status</h2>
            <p>{backendStatus}</p>
            <button
              onClick={testBackendConnection}
              className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Test Backend Connection
            </button>
          </div>

          {/* Test Buttons */}
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">API Tests</h2>
            <div className="space-x-4">
              <button
                onClick={testLogin}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Test Login
              </button>
              <button
                onClick={testCreateGroup}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Test Create Group
              </button>
              <button
                onClick={testSendMessage}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Test Send Message
              </button>
            </div>
          </div>

          {/* Test Message Input */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Test Message</h2>
            <div className="flex space-x-2">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter test message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={testSendMessage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send Test Message
              </button>
            </div>
          </div>

          {/* Data Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Groups */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Groups ({groups.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {groups.map((group) => (
                  <div key={group.id} className="p-2 bg-gray-50 rounded text-sm">
                    <p><strong>{group.name}</strong></p>
                    <p className="text-gray-600">{group.description}</p>
                    <p className="text-xs text-gray-500">{group.members?.length || 0} members</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Users */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Users ({users.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {users.slice(0, 5).map((user) => (
                  <div key={user._id} className="p-2 bg-gray-50 rounded text-sm">
                    <p><strong>{user.username}</strong></p>
                    <p className="text-gray-600">{user.email}</p>
                    <p className={`text-xs ${user.isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                      {user.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Messages ({messages.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {messages.slice(0, 5).map((message) => (
                  <div key={message._id} className="p-2 bg-gray-50 rounded text-sm">
                    <p><strong>{message.senderName || 'Unknown'}</strong></p>
                    <p className="text-gray-600">{message.content}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Socket Status */}
          <div className="mt-6 p-4 bg-purple-50 rounded-lg">
            <h2 className="text-xl font-semibold text-purple-900 mb-2">Socket.io Status</h2>
            <p>Status: {socketStatus}</p>
            <p className="text-sm text-gray-600 mt-2">
              Socket.io connection will be tested when you implement the chat functionality.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
