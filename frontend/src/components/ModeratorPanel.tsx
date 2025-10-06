import React, { useState, useEffect } from 'react';

interface ModeratorPanelProps {
  user: any; // User object from AuthContext
  theme: 'light' | 'dark';
}

interface MutedUser {
  userId: string;
  username: string;
  mutedUntil: string | null; // null para silenciado permanente
  reason: string;
}

export const ModeratorPanel: React.FC<ModeratorPanelProps> = ({ user, theme }) => {
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Verificar si el usuario es moderador o admin
  if (!['MODERATOR', 'ADMIN'].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">Solo moderadores y administradores pueden acceder a este panel.</p>
        </div>
      </div>
    );
  }

  const debugUserInfo = async () => {
    try {
      const authTokens = localStorage.getItem('authTokens');
      const token = authTokens ? JSON.parse(authTokens).accessToken : null;
      
      console.log('Current token:', token);
      
      const response = await fetch('http://localhost:3003/api/debug/user-info', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Debug User Info:', data);
        alert(`Usuario: ${data.user.username}\nRol: ${data.user.role}\nEmail: ${data.user.email}`);
      } else {
        const errorText = await response.text();
        console.log('Debug Error:', errorText);
        
        // Si el token es inválido, limpiar localStorage y sugerir relogin
        if (errorText.includes('Invalid token')) {
          localStorage.removeItem('authTokens');
          alert('Token inválido. Por favor, cierra sesión y vuelve a iniciar sesión.');
        } else {
          alert('Error al obtener información del usuario');
        }
      }
    } catch (error) {
      console.error('Debug error:', error);
      alert('Error de conexión');
    }
  };

  const loadMutedUsers = async () => {
    try {
      // Usar endpoint temporal sin autenticación para pruebas
      const response = await fetch('http://localhost:3003/api/moderator/muted-users-public');
      
      console.log('ModeratorPanel - Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        setMutedUsers(data.mutedUsers || []);
        console.log('ModeratorPanel - Loaded muted users:', data.mutedUsers);
      } else {
        const errorText = await response.text();
        console.log('ModeratorPanel - Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error loading muted users:', error);
      showNotification('error', 'Error loading muted users');
    }
  };

  const muteUser = async (userId: string, duration: number, reason: string) => {
    try {
      setIsLoading(true);
      const authTokens = localStorage.getItem('authTokens');
      const token = authTokens ? JSON.parse(authTokens).accessToken : null;
      
      const response = await fetch(`http://localhost:3003/api/moderator/users/${userId}/mute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ duration, reason })
      });
      
      if (response.ok) {
        showNotification('success', 'User muted successfully');
        loadMutedUsers();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error muting user:', error);
      showNotification('error', 'Error al silenciar usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const unmuteUser = async (userId: string) => {
    try {
      setIsLoading(true);
      
      // Usar endpoint público temporal para pruebas
      const response = await fetch(`http://localhost:3003/api/moderator/users/${userId}/unmute-public`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        showNotification('success', data.message || 'User unmuted successfully');
        loadMutedUsers(); // Recargar la lista
      } else {
        const errorText = await response.text();
        console.log('Unmute error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error unmuting user:', error);
      showNotification('error', 'Error al desilenciar usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  useEffect(() => {
    loadMutedUsers();
  }, []);

  return (
    <div className={`moderator-panel flex flex-col h-full ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">🔇</span>
          </div>
          <div>
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>🔇 Moderation</h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Muted users control</p>
          </div>
        </div>
        <button
          onClick={loadMutedUsers}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          🔄 Refresh
        </button>
        <button
          onClick={debugUserInfo}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          🔍 Debug
        </button>
        <button
          onClick={() => {
            localStorage.removeItem('authTokens');
            alert('Tokens removed. Please reload the page and log in again.');
            window.location.reload();
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          🔄 Relogin
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto bg-white">
        {isLoading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">Muted Users</h3>
            
            {mutedUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔇</div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">No muted users</h3>
                <p className="text-gray-500">All users can send messages normally.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Muted since
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mutedUsers.map((muted) => (
                      <tr key={muted.userId} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-700">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-gray-600 font-medium text-sm">
                                {muted.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{muted.username}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700">
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                            {muted.reason}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700">
                          <span className="text-gray-500">
                            {muted.mutedUntil ? formatDate(muted.mutedUntil) : 'Permanente'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700">
                          <button
                            onClick={() => unmuteUser(muted.userId)}
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
      </div>

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 ${
            notification.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}>
            <div className="text-xl">
              {notification.type === 'success' ? '✅' : '❌'}
            </div>
            <div>
              <p className="font-medium">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-white hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
