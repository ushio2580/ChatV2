import { documentsAPI } from './api';

export interface Document {
  id: string;
  title: string;
  content: string;
  createdBy: {
    _id: string;
    username: string;
    email: string;
  };
  roomId?: string;
  isPublic: boolean;
  collaborators: Array<{
    _id: string;
    username: string;
    email: string;
  }>;
  version: number;
  lastModified: string;
  metadata: {
    language: string;
    wordCount: number;
    characterCount: number;
  };
}

export interface CreateDocumentData {
  title: string;
  roomId?: string;
  isPublic?: boolean;
}

export interface DocumentOperation {
  id: string;
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  userId: string;
  timestamp: Date;
  version: number;
}

export interface DocumentState {
  content: string;
  version: number;
  activeUsers: string[];
  lastModified: Date;
}

class DocumentService {
  private getToken(): string {
    const authTokens = localStorage.getItem('authTokens');
    if (authTokens) {
      const tokens = JSON.parse(authTokens);
      console.log('Auth tokens found:', tokens);
      return tokens.accessToken || '';
    }
    console.log('No auth tokens found in localStorage');
    return '';
  }

  /**
   * Create a new document
   */
  async createDocument(data: CreateDocumentData): Promise<Document> {
    const response = await documentsAPI.createDocument({
      title: data.title,
      groupId: data.roomId || '',
      content: ''
    }, this.getToken());
    return response.document;
  }

  /**
   * Get user's documents
   */
  async getUserDocuments(): Promise<Document[]> {
    // This would need to be implemented in the backend
    const response = await fetch('http://localhost:3003/api/documents', {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });
    const data = await response.json();
    return data.documents || [];
  }

  /**
   * Get public documents
   */
  async getPublicDocuments(): Promise<Document[]> {
    const response = await fetch('http://localhost:3003/api/documents/public', {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });
    const data = await response.json();
    return data.documents || [];
  }

  /**
   * Get documents by group/room
   */
  async getDocumentsByGroup(roomId: string): Promise<Document[]> {
    const response = await fetch(`http://localhost:3003/api/documents/group/${roomId}`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });
    const data = await response.json();
    return data.documents || [];
  }

  /**
   * Update document (make public/private, change title, etc.)
   */
  async updateDocument(documentId: string, data: {
    isPublic?: boolean;
    title?: string;
    content?: string;
  }): Promise<Document> {
    const response = await fetch(`http://localhost:3003/api/documents/${documentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update document');
    }
    
    const result = await response.json();
    return result.document;
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<Document> {
    const response = await documentsAPI.getDocumentById(documentId, this.getToken());
    return response.document;
  }

  /**
   * Join a document for collaborative editing
   */
  async joinDocument(documentId: string): Promise<void> {
    await fetch(`http://localhost:3003/api/documents/${documentId}/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });
  }

  /**
   * Leave a document
   */
  async leaveDocument(documentId: string): Promise<void> {
    await fetch(`http://localhost:3003/api/documents/${documentId}/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });
  }

  /**
   * Apply operation to document
   */
  async applyOperation(documentId: string, operation: DocumentOperation): Promise<{
    newContent: string;
    version: number;
  }> {
    const response = await fetch(`http://localhost:3003/api/documents/${documentId}/operations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify(operation),
    });
    const data = await response.json();
    return {
      newContent: data.newContent,
      version: data.version
    };
  }

  /**
   * Get document state
   */
  async getDocumentState(documentId: string): Promise<DocumentState> {
    const response = await fetch(`http://localhost:3003/api/documents/${documentId}/state`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });
    const data = await response.json();
    return data.state;
  }

  /**
   * Get document history
   */
  async getDocumentHistory(documentId: string): Promise<DocumentOperation[]> {
    const response = await documentsAPI.getDocumentHistory(documentId, this.getToken());
    return response.history || [];
  }

  /**
   * Add collaborator to document
   */
  async addCollaborator(documentId: string, userId: string): Promise<void> {
    await fetch(`http://localhost:3003/api/documents/${documentId}/collaborators`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify({ userId }),
    });
  }

  /**
   * Remove collaborator from document
   */
  async removeCollaborator(documentId: string, userId: string): Promise<void> {
    await fetch(`http://localhost:3003/api/documents/${documentId}/collaborators/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<void> {
    await documentsAPI.deleteDocument(documentId, this.getToken());
  }

  /**
   * Share document with room
   */
  async shareWithRoom(documentId: string, roomId: string): Promise<void> {
    await fetch(`http://localhost:3003/api/documents/${documentId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify({ roomId }),
    });
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(documentId: string): Promise<{
    totalOperations: number;
    uniqueCollaborators: number;
    averageSessionTime: number;
    mostActiveUser: string;
  }> {
    const response = await fetch(`http://localhost:3003/api/documents/${documentId}/stats`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });
    const data = await response.json();
    return data.stats;
  }
}

export const documentService = new DocumentService();