import React from 'react';

interface SystemInfoProps {
  theme: 'light' | 'dark';
  isConnected: boolean;
  error: string | null;
  onTestConnection: () => void;
  onClearError: () => void;
}

const SystemInfo: React.FC<SystemInfoProps> = ({ 
  theme, 
  isConnected, 
  error, 
  onTestConnection, 
  onClearError
}) => {
  const getConnectionStatus = () => {
    if (isConnected) {
      return {
        status: 'Connected',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: '✅'
      };
    } else {
      return {
        status: 'Disconnected',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: '❌'
      };
    }
  };

  const connectionInfo = getConnectionStatus();

  return (
    <div className={`p-6 rounded-lg ${
      theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        System Information
      </h3>

      <div className="space-y-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Connection Status
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{connectionInfo.icon}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${connectionInfo.bgColor} ${connectionInfo.color}`}>
              {connectionInfo.status}
            </span>
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Backend URL
          </label>
          <p className={`text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            http://localhost:3003
          </p>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Frontend URL
          </label>
          <p className={`text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            http://localhost:5173
          </p>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Database
          </label>
          <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            MongoDB Atlas
          </p>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Environment
          </label>
          <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Development
          </p>
        </div>

        {error && (
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Last Error
            </label>
            <div className={`p-3 rounded-lg ${
              theme === 'dark' ? 'bg-red-900 border border-red-700' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-red-200' : 'text-red-600'}`}>
                {error}
              </p>
              <button
                onClick={onClearError}
                className={`mt-2 text-xs ${
                  theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'
                }`}
              >
                Clear Error
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={`mt-6 p-4 rounded-lg ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
      }`}>
        <h3 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Actions
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={onTestConnection}
            className={`px-3 py-1 text-xs rounded ${
              theme === 'dark' 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            Test Connection
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemInfo;
