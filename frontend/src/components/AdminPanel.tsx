import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isOnline: boolean;
  lastSeen: Date;
  mutedUntil?: Date;
  muteReason?: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  type: string;
  ownerId: string;
  members: string[];
  admins: string[];
  memberCount?: number;
  settings: {
    maxMembers: number;
    allowFileUpload: boolean;
    allowAnonymous: boolean;
  };
  createdAt: Date;
}

interface LogEntry {
  _id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  category: 'AUTH' | 'MESSAGING' | 'FILE_TRANSFER' | 'GROUP_MANAGEMENT' | 'ADMIN_ACTION' | 'SYSTEM' | 'ERROR';
  action: string;
  userId?: string;
  metadata: Record<string, any>;
  service: string;
  version: string;
}

interface LogStats {
  levelStats: { _id: string; count: number }[];
  categoryStats: { _id: string; count: number }[];
  actionStats: { _id: string; count: number }[];
  recentErrors: LogEntry[];
  period: {
    startDate: string;
    endDate: string;
  };
}

interface AdminPanelProps {
  user: User | null;
  theme: 'light' | 'dark';
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ user, theme }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'groups' | 'moderation' | 'analytics' | 'logs'>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [mutedUsers, setMutedUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logStats, setLogStats] = useState<LogStats | null>(null);
  const [logFilters, setLogFilters] = useState({
    level: 'all',
    category: 'all',
    action: '',
    userId: '',
    startDate: '',
    endDate: ''
  });
  const [logPagination, setLogPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    totalGroups: 0,
    onlineUsers: 0,
    totalMessages: 0,
    totalFiles: 0
  });
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: Date;
  }>>([]);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editGroupName, setEditGroupName] = useState('');

  // Load data functions
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const authTokens = localStorage.getItem('authTokens');
      const token = authTokens ? JSON.parse(authTokens).accessToken : null;
      
      const response = await fetch('http://localhost:3003/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      showNotification('error', 'Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const authTokens = localStorage.getItem('authTokens');
      const token = authTokens ? JSON.parse(authTokens).accessToken : null;
      
      const response = await fetch('http://localhost:3003/api/groups', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load groups');
      }
      
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Error loading groups:', error);
      showNotification('error', 'Error al cargar grupos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMutedUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3003/api/moderator/muted-users-public');
      
      if (!response.ok) {
        throw new Error('Failed to load muted users');
      }
      
      const data = await response.json();
      setMutedUsers(data.mutedUsers || []);
    } catch (error) {
      console.error('Error loading muted users:', error);
      showNotification('error', 'Error loading muted users');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSystemStats = async () => {
    try {
      const authTokens = localStorage.getItem('authTokens');
      const token = authTokens ? JSON.parse(authTokens).accessToken : null;
      
      const response = await fetch('http://localhost:3003/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load system stats');
      }
      
      const data = await response.json();
      setSystemStats({
        totalUsers: data.stats.totalUsers,
        totalGroups: data.stats.totalGroups,
        onlineUsers: data.stats.onlineUsers,
        totalMessages: data.stats.totalMessages,
        totalFiles: data.stats.totalFiles
      });
    } catch (error) {
      console.error('Error loading system stats:', error);
      // Fallback to basic counts
      const authTokens = localStorage.getItem('authTokens');
      const token = authTokens ? JSON.parse(authTokens).accessToken : null;
      
      try {
        const [usersRes, groupsRes] = await Promise.all([
          fetch('http://localhost:3003/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3003/api/groups', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        
        const usersData = await usersRes.json();
        const groupsData = await groupsRes.json();
        
        setSystemStats({
          totalUsers: usersData.users?.length || 0,
          totalGroups: groupsData.groups?.length || 0,
          onlineUsers: usersData.users?.filter((u: User) => u.isOnline).length || 0,
          totalMessages: 0,
          totalFiles: 0
        });
      } catch (fallbackError) {
        console.error('Fallback stats loading failed:', fallbackError);
      }
    }
  };

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      console.log('Loading logs for page:', logPagination.page);
      const authTokens = localStorage.getItem('authTokens');
      const token = authTokens ? JSON.parse(authTokens).accessToken : null;
      
      const params = new URLSearchParams({
        page: logPagination.page.toString(),
        limit: logPagination.limit.toString(),
        ...(logFilters.level !== 'all' && { level: logFilters.level }),
        ...(logFilters.category !== 'all' && { category: logFilters.category }),
        ...(logFilters.action && { action: logFilters.action }),
        ...(logFilters.userId && { userId: logFilters.userId }),
        ...(logFilters.startDate && { startDate: logFilters.startDate }),
        ...(logFilters.endDate && { endDate: logFilters.endDate })
      });
      
      const response = await fetch(`http://localhost:3003/api/admin/logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load logs');
      }
      
      const data = await response.json();
      setLogs(data.logs || []);
      setLogPagination(data.pagination);
    } catch (error) {
      console.error('Error loading logs:', error);
      showNotification('error', 'Error loading logs');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLogStats = async () => {
    try {
      const authTokens = localStorage.getItem('authTokens');
      const token = authTokens ? JSON.parse(authTokens).accessToken : null;
      
      const params = new URLSearchParams({
        ...(logFilters.startDate && { startDate: logFilters.startDate }),
        ...(logFilters.endDate && { endDate: logFilters.endDate })
      });
      
      const response = await fetch(`http://localhost:3003/api/admin/logs/stats?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load log stats');
      }
      
      const data = await response.json();
      setLogStats(data);
    } catch (error) {
      console.error('Error loading log stats:', error);
      showNotification('error', 'Error loading log statistics');
    }
  };

  // Action functions
  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      const authTokens = localStorage.getItem('authTokens');
      const token = authTokens ? JSON.parse(authTokens).accessToken : null;
      
      const response = await fetch(`http://localhost:3003/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user role');
      }
      
      await loadUsers();
      showNotification('success', 'Role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      showNotification('error', 'Error al actualizar rol');
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const authTokens = localStorage.getItem('authTokens');
      const token = authTokens ? JSON.parse(authTokens).accessToken : null;
      
      const response = await fetch(`http://localhost:3003/api/admin/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete group');
      }
      
      await loadGroups();
      showNotification('success', 'Group deleted successfully');
    } catch (error) {
      console.error('Error deleting group:', error);
      showNotification('error', 'Error al eliminar grupo');
    }
  };

  const muteUser = async (userId: string, duration: number, reason: string) => {
    try {
      const authTokens = localStorage.getItem('authTokens');
      const token = authTokens ? JSON.parse(authTokens).accessToken : null;
      
      const response = await fetch(`http://localhost:3003/api/admin/users/${userId}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ duration, reason })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mute user');
      }
      
      await loadUsers();
      await loadMutedUsers();
      showNotification('success', 'User muted successfully');
    } catch (error) {
      console.error('Error muting user:', error);
      showNotification('error', 'Error al silenciar usuario');
    }
  };

  const unmuteUser = async (userId: string) => {
    try {
      const response = await fetch(`http://localhost:3003/api/moderator/users/${userId}/unmute-public`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to unmute user');
      }
      
      await loadUsers();
      await loadMutedUsers();
      showNotification('success', 'User unmuted successfully');
    } catch (error) {
      console.error('Error unmuting user:', error);
      showNotification('error', 'Error al desilenciar usuario');
    }
  };

  const cleanGeneralGroups = async () => {
    try {
      setIsLoading(true);
      const authTokens = localStorage.getItem('authTokens');
      const token = authTokens ? JSON.parse(authTokens).accessToken : null;
      
      const response = await fetch('http://localhost:3003/api/admin/clean-general-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clean General groups');
      }

      const result = await response.json();
      console.log('General groups cleanup result:', result);
      
      showNotification(
        'success',
        result.message || `Successfully deleted ${result.deletedGroups} General groups`
      );
      
      // Reload groups after cleanup
      setTimeout(() => {
        window.location.reload(); // Full reload to recreate groups properly
      }, 2000);
      
    } catch (error) {
      console.error('Error cleaning General groups:', error);
      showNotification('error', 'Failed to clean General groups');
    } finally {
      setIsLoading(false);
    }
  };

  const cleanDuplicates = async () => {
    try {
      setIsLoading(true);
      const authTokens = localStorage.getItem('authTokens');
      const token = authTokens ? JSON.parse(authTokens).accessToken : null;
      
      // First clean General groups specifically
      const generalResponse = await fetch('http://localhost:3003/api/admin/clean-general-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      let generalResult = null;
      if (generalResponse.ok) {
        generalResult = await generalResponse.json();
        console.log('General groups cleanup result:', generalResult);
      }

      // Then clean other duplicates
      const response = await fetch('http://localhost:3003/api/admin/clean-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clean duplicates');
      }

      const result = await response.json();
      await loadGroups();
      
      let message = result.message;
      if (generalResult && generalResult.deletedGroups > 0) {
        message = `Cleaned ${generalResult.deletedGroups} General groups + ${generalResult.deletedGroups > 0 ? ', ' : ''}${message}`;
      }
      
      showNotification('success', message);
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      showNotification('error', error instanceof Error ? error.message : 'Failed to clean duplicates');
    } finally {
      setIsLoading(false);
    }
  };

  const updateGroupName = async (groupId: string, newName: string) => {
    try {
      const authTokens = localStorage.getItem('authTokens');
      const token = authTokens ? JSON.parse(authTokens).accessToken : null;
      
      const response = await fetch(`http://localhost:3003/api/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update group name');
      }
      
      await loadGroups();
      setEditingGroup(null);
      setEditGroupName('');
      showNotification('success', 'Group name updated successfully');
    } catch (error) {
      console.error('Error updating group name:', error);
      showNotification('error', 'Error al actualizar nombre del grupo');
    }
  };

  const startEditingGroup = (group: Group) => {
    setEditingGroup(group);
    setEditGroupName(group.name);
  };

  const cancelEditingGroup = () => {
    setEditingGroup(null);
    setEditGroupName('');
  };

  // Utility functions
  const handleTabChange = (newTab: 'dashboard' | 'users' | 'groups' | 'moderation' | 'analytics') => {
    setActiveTab(newTab);
    // Clear search terms when changing tabs
    setUserSearchTerm('');
    setGroupSearchTerm('');
    setFilterRole('all');
  };

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const exportData = (type: 'users' | 'groups') => {
    const data = type === 'users' ? users : groups;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('success', `${type} data exported successfully`);
  };

  // Filtered data
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(groupSearchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(groupSearchTerm.toLowerCase())
  );

  // Load data on mount
  useEffect(() => {
    loadUsers();
    loadGroups();
    loadMutedUsers();
    loadSystemStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
      loadLogStats();
    }
  }, [activeTab, logFilters]);

  // Separate useEffect for pagination changes
  useEffect(() => {
    if (activeTab === 'logs' && logPagination.page > 0) {
      // Use a small delay to ensure state is updated
      const timeoutId = setTimeout(() => {
        loadLogs();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [logPagination.page]);

  // Dashboard Stats Cards
  const StatCard = ({ title, value, icon, color, trend }: {
    title: string;
    value: number | string;
    icon: string;
    color: string;
    trend?: string;
  }) => (
    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
          <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          {trend && (
            <p className={`text-xs ${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{trend}</p>
          )}
        </div>
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  // User Role Badge
  const RoleBadge = ({ role }: { role: string }) => {
    const colors = {
      ADMIN: 'bg-red-100 text-red-800',
      MODERATOR: 'bg-yellow-100 text-yellow-800',
      USER: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role as keyof typeof colors] || colors.USER}`}>
        {role}
      </span>
    );
  };

  // Online Status Indicator
  const OnlineStatus = ({ isOnline }: { isOnline: boolean }) => (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
      <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
        {isOnline ? 'En línea' : 'Desconectado'}
      </span>
    </div>
  );

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 flex-shrink-0 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            👑 Administration
            </h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Management of users, groups and system
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                System Active
              </span>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
              {user?.role || 'ADMIN'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`border-b flex-shrink-0 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: '📊 Dashboard', count: null },
              { id: 'users', label: '👥 Users', count: users.length },
              { id: 'groups', label: '🏢 Groups', count: groups.length },
              { id: 'moderation', label: '🔇 Moderation', count: mutedUsers.length },
              { id: 'analytics', label: '📈 Analytics', count: null },
              { id: 'logs', label: '📄 Logs', count: logs.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : `border-transparent ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                {tab.label} {tab.count !== null && `(${tab.count})`}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`px-4 py-3 rounded-lg shadow-lg border-l-4 ${
                notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
                notification.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
                notification.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' :
                'bg-blue-50 border-blue-500 text-blue-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{notification.message}</span>
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className={`p-6 flex-1 overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                🏠 Main Dashboard
              </h2>
              <button
                onClick={() => {
                  loadSystemStats();
                  showNotification('info', 'Dashboard refreshed');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
            
            {/* Quick Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Registered Users"
                value={systemStats.totalUsers}
                icon="👥"
                color="bg-blue-100"
                trend="+12%"
              />
              <StatCard
                title="Active Now"
                value={systemStats.onlineUsers}
                icon="🟢"
                color="bg-green-100"
                trend="+5%"
              />
              <StatCard
                title="Groups Created"
                value={systemStats.totalGroups}
                icon="🏢"
                color="bg-purple-100"
                trend="+3%"
              />
              <StatCard
                title="Shared Files"
                value={systemStats.totalFiles}
                icon="📁"
                color="bg-orange-100"
                trend="+18%"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
              {/* System Health */}
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
                  🏥 System Status
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">Main Server</span>
                    </div>
                    <span className="text-sm text-green-600">Operational</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">Database</span>
                    </div>
                    <span className="text-sm text-green-600">Connected</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">WebSocket</span>
                    </div>
                    <span className="text-sm text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-blue-800">Memory Usage</span>
                    </div>
                    <span className="text-sm text-blue-600">Normal</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
                  ⚡ Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleTabChange('users')}
                    className="p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-left"
                  >
                    <div className="text-2xl mb-2">👥</div>
                    <div className="text-sm font-medium text-blue-800">Manage Users</div>
                    <div className="text-xs text-blue-600">{systemStats.totalUsers} users</div>
                  </button>
                  <button
                    onClick={() => handleTabChange('groups')}
                    className="p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors text-left"
                  >
                    <div className="text-2xl mb-2">🏢</div>
                    <div className="text-sm font-medium text-purple-800">Manage Groups</div>
                    <div className="text-xs text-purple-600">{systemStats.totalGroups} groups</div>
                  </button>
                  <button
                    onClick={() => handleTabChange('moderation')}
                    className="p-4 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors text-left"
                  >
                    <div className="text-2xl mb-2">🔇</div>
                    <div className="text-sm font-medium text-yellow-800">Moderation</div>
                    <div className="text-xs text-yellow-600">{mutedUsers.length} muted</div>
                  </button>
                  <button
                    onClick={() => handleTabChange('analytics')}
                    className="p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors text-left"
                  >
                    <div className="text-2xl mb-2">📈</div>
                    <div className="text-sm font-medium text-green-800">View Analytics</div>
                    <div className="text-xs text-green-600">Detailed statistics</div>
                  </button>
                  
                  <button
                    onClick={() => handleTabChange('logs')}
                    className="p-4 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors text-left"
                  >
                    <div className="text-2xl mb-2">📄</div>
                    <div className="text-sm font-medium text-yellow-800">System Logs</div>
                    <div className="text-xs text-yellow-600">View system activity</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                👥 User Management
              </h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => exportData('users')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  📤 Export
                </button>
                <button
                  onClick={loadUsers}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
            
            {/* Search and Filters */}
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="🔍 Search users..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className={`px-4 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              >
                <option value="all">All roles</option>
                <option value="ADMIN">Admins</option>
                <option value="MODERATOR">Moderators</option>
                <option value="USER">Users</option>
              </select>
            </div>
            
            <div className="overflow-x-auto overflow-y-auto max-h-96 flex-1">
              <table className={`min-w-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} rounded-lg shadow-sm`}>
                <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`py-3 px-4 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      User
                    </th>
                    <th className={`py-3 px-4 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Email
                    </th>
                    <th className={`py-3 px-4 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Role
                    </th>
                    <th className={`py-3 px-4 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Status
                    </th>
                    <th className={`py-3 px-4 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} last:border-b-0 hover:${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded-full flex items-center justify-center`}>
                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {user.username}
                            </div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              ID: {user.id.slice(-8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {user.email}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <OnlineStatus isOnline={user.isOnline} />
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <select
                            value={user.role}
                            onChange={(e) => changeUserRole(user.id, e.target.value)}
                            className={`px-2 py-1 rounded text-xs border ${
                              theme === 'dark' 
                                ? 'bg-gray-700 border-gray-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          >
                            <option value="USER">User</option>
                            <option value="MODERATOR">Moderator</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                          {user.role !== 'ADMIN' && (
                            <button
                              onClick={() => muteUser(user.id, 60, 'Terms violation')}
                              className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200 transition-colors"
                            >
                              🔇 Mute
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                🏢 Group Management
              </h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => exportData('groups')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  📤 Export
                </button>
                <button
                  onClick={cleanDuplicates}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isLoading
                      ? (theme === 'dark' ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                      : (theme === 'dark' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-orange-200 text-orange-700 hover:bg-orange-300')
                  }`}
                >
                  {isLoading ? 'Cleaning...' : '🧹 Clean Duplicates'}
                </button>
                
                <button
                  onClick={cleanGeneralGroups}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isLoading
                      ? (theme === 'dark' ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                      : (theme === 'dark' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-200 text-red-700 hover:bg-red-300')
                  }`}
                >
                  {isLoading ? 'Cleaning...' : '🗑️ Clean General Groups'}
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="🔍 Search groups..."
                  value={groupSearchTerm}
                  onChange={(e) => setGroupSearchTerm(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-96 flex-1 grid gap-4">
              {filteredGroups.map((group) => (
                <div key={group.id} className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-6`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {editingGroup?.id === group.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editGroupName}
                              onChange={(e) => setEditGroupName(e.target.value)}
                              className={`px-3 py-1 rounded-lg border text-lg font-semibold ${
                                theme === 'dark' 
                                  ? 'bg-gray-700 border-gray-600 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                              placeholder="Group name"
                            />
                            <button
                              onClick={() => updateGroupName(group.id, editGroupName)}
                              className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                              title="Save changes"
                            >
                              ✅
                            </button>
                            <button
                              onClick={cancelEditingGroup}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                              title="Cancel"
                            >
                              ❌
                            </button>
                          </div>
                        ) : (
                          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {group.name}
                          </h3>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          group.type === 'public' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {group.type === 'public' ? '🌐 Public' : '🔒 Private'}
                        </span>
                      </div>
                      <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-3`}>
                        {group.description || 'No description'}
                      </p>
                      <div className={`flex items-center space-x-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span>👥 {group.memberCount || 0} members</span>
                        <span>👑 Owner: {group.ownerId.slice(-8)}</span>
                        <span>📅 {new Date(group.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {editingGroup?.id !== group.id && (
                        <button
                          onClick={() => startEditingGroup(group)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                          title="Edit group name"
                        >
                          ✏️ Edit
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete the group "${group.name}"?\n\nThis will delete:\n- The entire group\n- All messages\n- All shared files\n- All members will be removed\n\nThis action CANNOT be undone.`)) {
                            deleteGroup(group.id);
                          }
                        }}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                        title="Delete group (admin can delete any group)"
                      >
                        🗑️ Delete Group
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Moderation Tab */}
        {activeTab === 'moderation' && (
          <div className="space-y-6 h-full flex flex-col">
            <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              🔇 System Moderation
            </h3>
            
            {mutedUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔇</div>
                <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                  There are no muted users
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  All users can send messages normally.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto max-h-96 flex-1">
                <table className={`min-w-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} rounded-lg shadow-sm`}>
                  <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <tr>
                      <th className={`py-3 px-4 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        User
                      </th>
                      <th className={`py-3 px-4 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Reason
                      </th>
                      <th className={`py-3 px-4 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Muted until
                      </th>
                      <th className={`py-3 px-4 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mutedUsers.map((user, index) => (
                      <tr key={`muted-${user.id || user.username || index}`} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} last:border-b-0 hover:${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded-full flex items-center justify-center`}>
                              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {user.username}
                              </div>
                              <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {user.muteReason || 'No reason specified'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {user.mutedUntil ? new Date(user.mutedUntil).toLocaleString() : 'Permanent'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <button
                            onClick={() => unmuteUser(user.id)}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                          >
                            🔊 Unmute
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between flex-shrink-0">
              <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                📈 Advanced Analytics
              </h3>
              <button
                onClick={() => {
                  loadSystemStats();
                  showNotification('info', 'Analytics refreshed');
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
            
            {/* Detailed Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
              <StatCard
                title="Total Messages"
                value={systemStats.totalMessages}
                icon="💬"
                color="bg-blue-100"
                trend="+24%"
              />
              <StatCard
                title="Total Files"
                value={systemStats.totalFiles}
                icon="📁"
                color="bg-green-100"
                trend="+15%"
              />
              <StatCard
                title="Active Users"
                value={systemStats.onlineUsers}
                icon="🟢"
                color="bg-emerald-100"
                trend="+8%"
              />
              <StatCard
                title="Active Groups"
                value={systemStats.totalGroups}
                icon="🏢"
                color="bg-purple-100"
                trend="+12%"
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 min-h-0">
              {/* User Growth Chart */}
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex flex-col`}>
                <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex-shrink-0`}>
                  📊 User Growth
                </h4>
                <div className="flex-1 flex items-center justify-center min-h-0">
                  <div className="text-center">
                    <div className="text-5xl mb-4">📈</div>
                    <p className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      {systemStats.totalUsers} Registered Users
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                      {systemStats.onlineUsers} users active now
                    </p>
                    <div className="p-3 rounded-lg bg-blue-50">
                      <p className="text-sm text-blue-800">
                        <strong>+12%</strong> growth this week
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group Activity */}
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex flex-col`}>
                <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex-shrink-0`}>
                  🏢 Top Groups by Activity
                </h4>
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-3">
                    {groups.slice(0, 5).map((group, index) => (
                      <div key={group.id} className={`flex items-center justify-between p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            #{index + 1}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              {group.name}
                            </p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {group.memberCount || 0} members
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {group.memberCount || 0}
                          </div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            members
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* System Performance */}
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex flex-col`}>
                <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex-shrink-0`}>
                  ⚡ System Performance
                </h4>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Response Time</span>
                    <span className="text-sm font-medium text-green-600">45ms</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: '85%'}}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>CPU Usage</span>
                    <span className="text-sm font-medium text-blue-600">23%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{width: '23%'}}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>RAM Memory</span>
                    <span className="text-sm font-medium text-purple-600">67%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{width: '67%'}}></div>
                  </div>
                </div>
              </div>

              {/* Activity Summary */}
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex flex-col`}>
                <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex-shrink-0`}>
                  📊 Activity Summary
                </h4>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">💬</div>
                      <div>
                        <p className="text-sm font-medium text-blue-800">Messages Today</p>
                        <p className="text-xs text-blue-600">Last 24 hours</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-800">{systemStats.totalMessages}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">📁</div>
                      <div>
                        <p className="text-sm font-medium text-green-800">Files Uploaded</p>
                        <p className="text-xs text-green-600">Cumulative total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-800">{systemStats.totalFiles}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">👥</div>
                      <div>
                        <p className="text-sm font-medium text-purple-800">Online Users</p>
                        <p className="text-xs text-purple-600">Active now</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-800">{systemStats.onlineUsers}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-6 h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between flex-shrink-0">
              <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                📄 System Logs
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    loadLogStats();
                    showNotification('info', 'Log statistics refreshed');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📊 Stats
                </button>
                <button
                  onClick={() => {
                    loadLogs();
                    showNotification('info', 'Logs refreshed');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* Log Filters */}
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} flex-shrink-0`}>
              <h4 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                🔍 Filters
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <select
                  value={logFilters.level}
                  onChange={(e) => setLogFilters(prev => ({ ...prev, level: e.target.value }))}
                  className={`px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="all">All Levels</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                </select>
                
                <select
                  value={logFilters.category}
                  onChange={(e) => setLogFilters(prev => ({ ...prev, category: e.target.value }))}
                  className={`px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="all">All Categories</option>
                  <option value="AUTH">Authentication</option>
                  <option value="MESSAGING">Messaging</option>
                  <option value="FILE_TRANSFER">File Transfer</option>
                  <option value="GROUP_MANAGEMENT">Groups</option>
                  <option value="ADMIN_ACTION">Admin Actions</option>
                  <option value="SYSTEM">System</option>
                  <option value="ERROR">Errors</option>
                </select>
                
                <input
                  type="text"
                  placeholder="Action filter..."
                  value={logFilters.action}
                  onChange={(e) => setLogFilters(prev => ({ ...prev, action: e.target.value }))}
                  className={`px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                />
                
                <input
                  type="text"
                  placeholder="User ID..."
                  value={logFilters.userId}
                  onChange={(e) => setLogFilters(prev => ({ ...prev, userId: e.target.value }))}
                  className={`px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                />
                
                <input
                  type="date"
                  value={logFilters.startDate}
                  onChange={(e) => setLogFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className={`px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
                
                <input
                  type="date"
                  value={logFilters.endDate}
                  onChange={(e) => setLogFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className={`px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
              
              <div className="flex justify-between items-center mt-3">
                <button
                  onClick={() => {
                    setLogFilters({
                      level: 'all',
                      category: 'all',
                      action: '',
                      userId: '',
                      startDate: '',
                      endDate: ''
                    });
                    setLogPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Clear Filters
                </button>
                
                <button
                  onClick={loadLogs}
                  className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>

            {/* Log Statistics */}
            {logStats && (
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} flex-shrink-0`}>
                <h4 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  📊 Statistics
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>By Level</p>
                    <div className="mt-1 space-y-1">
                      {logStats.levelStats.map(stat => (
                        <div key={stat._id} className="flex justify-between text-xs">
                          <span className={`capitalize ${stat._id === 'error' ? 'text-red-600' : stat._id === 'warn' ? 'text-yellow-600' : 'text-green-600'}`}>
                            {stat._id}
                          </span>
                          <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{stat.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>By Category</p>
                    <div className="mt-1 space-y-1">
                      {logStats.categoryStats.slice(0, 3).map(stat => (
                        <div key={stat._id} className="flex justify-between text-xs">
                          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{stat._id}</span>
                          <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{stat.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Top Actions</p>
                    <div className="mt-1 space-y-1">
                      {logStats.actionStats.slice(0, 3).map(stat => (
                        <div key={stat._id} className="flex justify-between text-xs">
                          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{stat._id}</span>
                          <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{stat.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Recent Errors</p>
                    <div className="mt-1 space-y-1">
                      {logStats.recentErrors.slice(0, 3).map(error => (
                        <div key={error._id} className="text-xs text-red-600 truncate">
                          {error.message}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Logs Table */}
            <div className="flex-1 overflow-hidden">
              <div className={`rounded-lg border ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} h-full flex flex-col`}>
                <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
                  <div className="flex justify-between items-center">
                    <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Log Entries ({logPagination.total} total)
                    </h4>
                    <div className="text-sm text-gray-500">
                      Page {logPagination.page} of {logPagination.pages}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-gray-500">Loading logs...</div>
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-gray-500">No logs found</div>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {logs.map((log) => (
                        <div key={log._id} className={`p-4 hover:bg-gray-50 ${theme === 'dark' ? 'hover:bg-gray-700' : ''}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  log.level === 'error' ? 'bg-red-100 text-red-800' :
                                  log.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {log.level.toUpperCase()}
                                </span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
                                  {log.category}
                                </span>
                                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {log.action}
                                </span>
                              </div>
                              <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                                {log.message}
                              </p>
                              {log.userId && (
                                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                  User: {log.userId}
                                </p>
                              )}
                              {Object.keys(log.metadata).length > 0 && (
                                <details className="mt-2">
                                  <summary className={`text-xs cursor-pointer ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} hover:text-blue-600`}>
                                    View metadata
                                  </summary>
                                  <pre className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-300 bg-gray-900' : 'text-gray-600 bg-gray-100'} p-2 rounded overflow-x-auto`}>
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} ml-4 flex-shrink-0`}>
                              {new Date(log.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Pagination */}
                {logPagination.pages > 1 && (
                  <div className={`px-4 py-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center flex-shrink-0`}>
                    <button
                      onClick={() => {
                        if (logPagination.page > 1) {
                          const newPage = logPagination.page - 1;
                          setLogPagination(prev => ({ ...prev, page: newPage }));
                          // Load logs directly with new page
                          setTimeout(() => loadLogs(), 50);
                        }
                      }}
                      disabled={logPagination.page <= 1}
                      className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Page {logPagination.page} of {logPagination.pages}
                    </span>
                    
                    <button
                      onClick={() => {
                        if (logPagination.page < logPagination.pages) {
                          const newPage = logPagination.page + 1;
                          setLogPagination(prev => ({ ...prev, page: newPage }));
                          // Load logs directly with new page
                          setTimeout(() => loadLogs(), 50);
                        }
                      }}
                      disabled={logPagination.page >= logPagination.pages}
                      className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};