const API_BASE_URL = 'http://localhost:3003/api';

export interface FileUploadResponse {
  message: string;
  file: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedBy: string;
    uploadedAt: string;
    roomId?: string;
    isPublic: boolean;
    metadata?: {
      description?: string;
      tags?: string[];
      category?: string;
    };
  };
}

export interface FileInfo {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  roomId?: string;
  isPublic: boolean;
  metadata?: {
    description?: string;
    tags?: string[];
    category?: string;
  };
}

export interface FileListResponse {
  files: FileInfo[];
}

class FileService {
  private getAuthHeaders() {
    const authTokens = localStorage.getItem('authTokens');
    if (authTokens) {
      const tokens = JSON.parse(authTokens);
      return {
        'Authorization': `Bearer ${tokens.accessToken}`,
      };
    }
    return {};
  }

  // Upload file
  async uploadFile(
    file: File, 
    roomId?: string, 
    uploadedBy?: string,
    isPublic: boolean = false,
    description?: string,
    tags?: string[],
    category?: string
  ): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadedBy', uploadedBy || 'current-user');
    if (roomId) formData.append('roomId', roomId);
    formData.append('isPublic', isPublic.toString());
    if (description) formData.append('description', description);
    if (tags) formData.append('tags', tags.join(','));
    if (category) formData.append('category', category);

    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      body: formData,
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Download file
  async downloadFile(filename: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/files/download/${filename}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Get file info
  async getFileInfo(fileId: string): Promise<{ file: FileInfo }> {
    const response = await fetch(`${API_BASE_URL}/files/info/${fileId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get file info: ${response.statusText}`);
    }

    return response.json();
  }

  // Get files by room
  async getFilesByRoom(roomId: string): Promise<FileListResponse> {
    console.log('🔍 FileService.getFilesByRoom called with roomId:', roomId);
    const authTokens = localStorage.getItem('authTokens');
    console.log('🔍 Token from localStorage:', authTokens ? 'Present' : 'Missing');
    
    const response = await fetch(`${API_BASE_URL}/files/room/${roomId}`, {
      headers: this.getAuthHeaders(),
    });

    console.log('🔍 Response status:', response.status);
    console.log('🔍 Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 Error response:', errorText);
      throw new Error(`Failed to get room files: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('🔍 Response data:', data);
    return data;
  }

  // Get user files
  async getUserFiles(userId: string): Promise<FileListResponse> {
    const response = await fetch(`${API_BASE_URL}/files/user/${userId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get user files: ${response.statusText}`);
    }

    return response.json();
  }

  // Get all files
  async getAllFiles(): Promise<FileListResponse> {
    const response = await fetch(`${API_BASE_URL}/files`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get files: ${response.statusText}`);
    }

    return response.json();
  }

  // Delete file
  async deleteFile(fileId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: 'current-user' }), // In production, get from auth context
    });

    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }

    return response.json();
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file icon based on mime type
  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📈';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    if (mimeType.includes('text/')) return '📄';
    return '📁';
  }
}

export const fileService = new FileService();

