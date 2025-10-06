import React, { useState, useEffect } from 'react';

interface ConnectionStatusProps {
  theme: 'light' | 'dark';
  isConnected: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  theme, 
  isConnected
}) => {
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastSeen, setLastSeen] = useState<Date>(new Date());

  useEffect(() => {
    if (isConnected) {
      setSocketStatus('connected');
      setLastSeen(new Date());
    } else {
      setSocketStatus('disconnected');
    }
  }, [isConnected]);

  const getStatusInfo = () => {
    switch (socketStatus) {
      case 'connected':
        return {
          icon: '🟢',
          text: 'Connected',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          description: 'Real-time chat active'
        };
      case 'connecting':
        return {
          icon: '🟡',
          text: 'Connecting...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          description: 'Establishing connection'
        };
      case 'disconnected':
        return {
          icon: '🔴',
          text: 'Disconnected',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          description: 'Connection lost'
        };
    }
  };

  const status = getStatusInfo();

  return (
    <div className={`flex items-center space-x-3 px-4 py-2 rounded-xl shadow-sm ${
      theme === 'dark' ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'
    }`}>
      {/* Status Indicator */}
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${
          socketStatus === 'connected' ? 'bg-green-500' : 
          socketStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
        } ${socketStatus === 'connected' ? 'animate-pulse' : ''}`}></div>
        <span className={`text-sm font-medium ${status.color}`}>
          {status.icon} {status.text}
        </span>
      </div>

      {/* Connection Details */}
      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        {status.description}
      </div>

      {/* Last Seen */}
      {socketStatus === 'connected' && (
        <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          Last seen: {lastSeen.toLocaleTimeString()}
        </div>
      )}

    </div>
  );
};

export default ConnectionStatus;
