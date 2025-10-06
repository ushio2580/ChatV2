import React from 'react';

interface ChatStatsProps {
  theme: 'light' | 'dark';
  totalMessages: number;
  totalUsers: number;
  totalGroups: number;
  onlineUsers: number;
}

const ChatStats: React.FC<ChatStatsProps> = ({ 
  theme, 
  totalMessages, 
  totalUsers, 
  totalGroups, 
  onlineUsers 
}) => {
  const stats = [
    {
      label: 'Total Messages',
      value: totalMessages,
      icon: '💬',
      color: 'text-blue-600'
    },
    {
      label: 'Total Users',
      value: totalUsers,
      icon: '👥',
      color: 'text-green-600'
    },
    {
      label: 'Online Users',
      value: onlineUsers,
      icon: '🟢',
      color: 'text-green-500'
    },
    {
      label: 'Groups',
      value: totalGroups,
      icon: '🏢',
      color: 'text-purple-600'
    }
  ];

  const getPercentage = (current: number, total: number) => {
    return Math.round((current / total) * 100);
  };

  return (
    <div className={`p-6 rounded-xl ${
      theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
    } shadow-lg`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          📊 Platform Statistics
        </h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'
        }`}>
          Live Data
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className={`p-4 rounded-xl transition-all duration-200 hover:scale-105 ${
            theme === 'dark' ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-white/70 hover:bg-white'
          } shadow-md`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-3xl font-bold ${stat.color}`}>
                  {stat.value.toLocaleString()}
                </p>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {stat.label}
                </p>
              </div>
              <div className={`text-4xl opacity-80 ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
            
            {/* Progress bar for online users */}
            {stat.label === 'Online Users' && (
              <div className="mt-3">
                <div className={`w-full h-2 rounded-full ${
                  theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                }`}>
                  <div 
                    className="h-2 rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                    style={{ width: `${getPercentage(onlineUsers, totalUsers)}%` }}
                  ></div>
                </div>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {getPercentage(onlineUsers, totalUsers)}% online
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Additional insights */}
      <div className={`mt-6 p-4 rounded-xl ${
        theme === 'dark' ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'
      }`}>
        <h4 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
          💡 Quick Insights
        </h4>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Avg messages per user: 
            </span>
            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {Math.round(totalMessages / totalUsers)}
            </span>
          </div>
          <div>
            <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Groups per user: 
            </span>
            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {(totalGroups / totalUsers).toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatStats;
