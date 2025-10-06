import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string): Socket {
    this.token = token;
    
    this.socket = io('http://localhost:3003', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Helper method to get current user ID from token
  private getCurrentUserId(): string {
    // Get user ID from localStorage or context
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.id || 'anonymous';
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    return 'anonymous';
  }

  // Message events
  sendGroupMessage(groupId: string, content: string, type: string = 'TEXT'): void {
    if (this.socket) {
      this.socket.emit('send-group-message', { 
        groupId, 
        content, 
        type,
        senderId: this.getCurrentUserId()
      });
    }
  }

  sendPrivateMessage(receiverId: string, content: string, type: string = 'TEXT'): void {
    if (this.socket) {
      this.socket.emit('send-private-message', { 
        receiverId, 
        content, 
        type,
        senderId: this.getCurrentUserId()
      });
    }
  }

  // Group events
  joinGroup(groupId: string): void {
    if (this.socket) {
      this.socket.emit('join-group', groupId);
    }
  }

  leaveGroup(groupId: string): void {
    if (this.socket) {
      this.socket.emit('leave-group', groupId);
    }
  }

  joinGroups(): void {
    if (this.socket) {
      this.socket.emit('join-groups');
    }
  }

  // Typing indicators
  startTyping(groupId?: string, receiverId?: string): void {
    if (this.socket) {
      this.socket.emit('typing-start', { groupId, receiverId });
    }
  }

  stopTyping(groupId?: string, receiverId?: string): void {
    if (this.socket) {
      this.socket.emit('typing-stop', { groupId, receiverId });
    }
  }

  // Document collaboration
  joinDocument(documentId: string): void {
    if (this.socket) {
      this.socket.emit('join-document', documentId);
    }
  }

  leaveDocument(documentId: string): void {
    if (this.socket) {
      this.socket.emit('leave-document', documentId);
    }
  }

  editDocument(documentId: string, content: string, version: number): void {
    if (this.socket) {
      this.socket.emit('document-edit', { documentId, content, version });
    }
  }

  // File sharing
  shareFile(groupId: string, file: any): void {
    if (this.socket) {
      this.socket.emit('file-shared', { groupId, file });
    }
  }

  // Status updates
  updateStatus(status: string): void {
    if (this.socket) {
      this.socket.emit('update-status', status);
    }
  }

  // Event listeners
  onGroupMessage(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('group-message', callback);
    }
  }

  onPrivateMessageReceived(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('private-message-received', callback);
    }
  }

  onPrivateMessageSent(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('private-message-sent', callback);
    }
  }

  onUserTyping(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('user-typing', callback);
    }
  }

  onUserStoppedTyping(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('user-stopped-typing', callback);
    }
  }

  onDocumentUpdated(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('document-updated', callback);
    }
  }

  onFileShared(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('file-shared', callback);
    }
  }

  onUserJoinedGroup(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('user-joined-group', callback);
    }
  }

  onUserLeftGroup(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('user-left-group', callback);
    }
  }

  onUserConnected(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('user-connected', callback);
    }
  }

  onUserDisconnected(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('user-disconnected', callback);
    }
  }

  onError(callback: (error: any) => void): void {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  // Remove event listeners
  off(event: string, callback?: Function): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();
