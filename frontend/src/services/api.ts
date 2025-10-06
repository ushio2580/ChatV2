// API Base URL
const API_BASE_URL = 'http://localhost:3003/api';

// Auth API
export const authAPI = {
  register: async (data: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  login: async (data: { email: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  refreshToken: async (refreshToken: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    return response.json();
  },

  logout: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getCurrentUser: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },
};

// Users API
export const usersAPI = {
  getAllUsers: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getUserById: async (id: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  updateUser: async (id: string, data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  getOnlineUsers: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/users/online/list`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  searchUsers: async (query: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/users/search/${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },
};

// Groups API
export const groupsAPI = {
  createGroup: async (data: {
    name: string;
    description?: string;
    type: string;
    avatar?: string;
  }, token: string) => {
    const response = await fetch(`${API_BASE_URL}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  getAllGroups: async (token: string, page = 1, limit = 20) => {
    const response = await fetch(`${API_BASE_URL}/groups?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getGroupById: async (id: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/groups/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  updateGroup: async (id: string, data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/groups/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  deleteGroup: async (id: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/groups/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  joinGroup: async (id: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/groups/${id}/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  leaveGroup: async (id: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/groups/${id}/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getGroupMembers: async (id: string, token: string, page = 1, limit = 50) => {
    const response = await fetch(`${API_BASE_URL}/groups/${id}/members?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getGroupMessages: async (id: string, token: string, page = 1, limit = 50) => {
    const response = await fetch(`${API_BASE_URL}/groups/${id}/messages?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },
};

// Messages API
export const messagesAPI = {
  sendGroupMessage: async (groupId: string, data: {
    content: string;
    type?: string;
  }, token: string) => {
    const response = await fetch(`${API_BASE_URL}/messages/group/${groupId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  sendPrivateMessage: async (data: {
    receiverId: string;
    content: string;
    type?: string;
  }, token: string) => {
    const response = await fetch(`${API_BASE_URL}/messages/private`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  getGroupMessages: async (groupId: string, token: string, page = 1, limit = 50) => {
    const response = await fetch(`${API_BASE_URL}/messages/group/${groupId}?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getPrivateMessages: async (userId: string, token: string, page = 1, limit = 50) => {
    const response = await fetch(`${API_BASE_URL}/messages/private/${userId}?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getMessageById: async (id: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/messages/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  editMessage: async (id: string, data: { content: string }, token: string) => {
    const response = await fetch(`${API_BASE_URL}/messages/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  deleteMessage: async (id: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/messages/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  addReaction: async (id: string, data: { emoji: string }, token: string) => {
    const response = await fetch(`${API_BASE_URL}/messages/${id}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  removeReaction: async (id: string, emoji: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/messages/${id}/reactions/${emoji}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  searchMessages: async (query: string, token: string, page = 1, limit = 20) => {
    const response = await fetch(`${API_BASE_URL}/messages/search/${encodeURIComponent(query)}?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },
};

// Files API
export const filesAPI = {
  uploadFile: async (file: File, data: {
    groupId?: string;
    isPublic?: boolean;
  }, token: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (data.groupId) formData.append('groupId', data.groupId);
    if (data.isPublic !== undefined) formData.append('isPublic', data.isPublic.toString());

    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    return response.json();
  },

  getFileById: async (id: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/files/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  downloadFile: async (id: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/files/${id}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response;
  },

  getUserFiles: async (userId: string, token: string, page = 1, limit = 50) => {
    const response = await fetch(`${API_BASE_URL}/files/user/${userId}?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getGroupFiles: async (groupId: string, token: string, page = 1, limit = 50) => {
    const response = await fetch(`${API_BASE_URL}/files/group/${groupId}?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getPublicFiles: async (token: string, page = 1, limit = 50) => {
    const response = await fetch(`${API_BASE_URL}/files/public/list?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  updateFile: async (id: string, data: { isPublic?: boolean }, token: string) => {
    const response = await fetch(`${API_BASE_URL}/files/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  deleteFile: async (id: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/files/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  searchFiles: async (query: string, token: string, page = 1, limit = 20) => {
    const response = await fetch(`${API_BASE_URL}/files/search/${encodeURIComponent(query)}?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },
};

// Documents API
export const documentsAPI = {
  createDocument: async (data: {
    title: string;
    groupId: string;
    content?: string;
  }, token: string) => {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  getDocumentById: async (id: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  updateDocument: async (id: string, data: {
    title?: string;
    content?: string;
  }, token: string) => {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  deleteDocument: async (id: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getGroupDocuments: async (groupId: string, token: string, page = 1, limit = 50) => {
    const response = await fetch(`${API_BASE_URL}/documents/group/${groupId}?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getDocumentHistory: async (id: string, token: string, page = 1, limit = 50) => {
    const response = await fetch(`${API_BASE_URL}/documents/${id}/history?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  restoreDocumentVersion: async (id: string, version: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/documents/${id}/restore/${version}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  compareDocumentVersions: async (id: string, version1: number, version2: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/documents/${id}/compare/${version1}/${version2}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getDocumentCollaborators: async (id: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/documents/${id}/collaborators`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  searchDocuments: async (query: string, token: string, page = 1, limit = 20) => {
    const response = await fetch(`${API_BASE_URL}/documents/search/${encodeURIComponent(query)}?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },
};
