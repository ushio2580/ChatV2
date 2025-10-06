import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import VersionControlModal from './VersionControlModal';

interface CollaborativeEditorProps {
  documentId: string;
  userId: string;
  initialContent?: string;
  onContentChange?: (content: string) => void;
  onUsersChange?: (users: string[]) => void;
  className?: string;
}

interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  userId: string;
  timestamp: Date;
  version: number;
}

interface DocumentState {
  content: string;
  version: number;
  activeUsers: string[];
  lastModified: Date;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  documentId,
  userId,
  initialContent = '',
  onContentChange,
  onUsersChange,
  className = ''
}) => {
  const [content, setContent] = useState(initialContent);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [version, setVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showVersionControl, setShowVersionControl] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastOperationRef = useRef<string | null>(null);
  const pendingOperationsRef = useRef<Operation[]>([]);

  // Initialize socket connection
  useEffect(() => {
    if (!documentId || !userId) {
      console.log('Missing documentId or userId, skipping socket connection');
      return;
    }
    
    // Avoid reconnecting if already connected to the same document
    if (socketRef.current && socketRef.current.connected) {
      console.log('Already connected to collaborative editing server');
      return;
    }
    
    console.log('Initializing collaborative editor for document:', documentId, 'user:', userId);
    const socket = io('http://localhost:3003');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to collaborative editing server');
      setIsConnected(true);
      
      // Join the document
      socket.emit('join-document', { documentId, userId });
      console.log('Emitted join-document for:', documentId, userId);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from collaborative editing server');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    socket.on('join-document-success', (data) => {
      console.log('Successfully joined document:', data);
    });

    socket.on('join-document-error', (error) => {
      console.error('Failed to join document:', error);
    });

    socket.on('joined-document', (data) => {
      if (data.success) {
        console.log('Successfully joined document:', documentId);
        setIsLoading(false);
        
        // Request current document state
        socket.emit('request-document-state', { documentId, userId });
      } else {
        console.error('Failed to join document:', data.error);
        setIsLoading(false);
      }
    });

    socket.on('document-state', (data) => {
      if (data.documentId === documentId) {
        setContent(data.state.content);
        setVersion(data.state.version);
        setActiveUsers(data.state.activeUsers);
        onContentChange?.(data.state.content);
        onUsersChange?.(data.state.activeUsers);
      }
    });

    socket.on('document-operation-applied', (data) => {
      if (data.documentId === documentId) {
        // Apply the operation to local content
        applyRemoteOperation(data.operation, data.newContent);
      }
    });

    socket.on('operation-confirmed', (data) => {
      if (data.documentId === documentId) {
        if (data.success) {
          setVersion(data.version);
          // Remove confirmed operation from pending
          pendingOperationsRef.current = pendingOperationsRef.current.filter(
            op => op.id !== data.operationId
          );
        } else {
          console.error('Operation failed:', data.error);
        }
      }
    });

    socket.on('user-joined-document', (data) => {
      if (data.documentId === documentId) {
        setActiveUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
        onUsersChange?.(activeUsers);
      }
    });

    socket.on('user-left-document', (data) => {
      if (data.documentId === documentId) {
        setActiveUsers(prev => prev.filter(id => id !== data.userId));
        onUsersChange?.(activeUsers);
      }
    });

    return () => {
      console.log('Cleaning up collaborative editor socket for document:', documentId);
      if (socketRef.current) {
        socketRef.current.emit('leave-document', { documentId, userId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [documentId, userId, onUsersChange]);

  // Apply remote operation to local content
  const applyRemoteOperation = useCallback((operation: Operation, newContent: string) => {
    setContent(newContent);
    setVersion(operation.version);
    onContentChange?.(newContent);
  }, [onContentChange]);

  // Generate unique operation ID
  const generateOperationId = useCallback(() => {
    return `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, [userId]);

  // Handle text changes
  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    const oldContent = content;
    
    if (newContent === oldContent) return;

    // Calculate the difference
    const diff = calculateDiff(oldContent, newContent);
    
    if (diff) {
      const operation: Operation = {
        id: generateOperationId(),
        type: diff.type,
        position: diff.position,
        content: diff.content,
        length: diff.length,
        userId,
        timestamp: new Date(),
        version: version + 1
      };

      // Apply operation locally
      setContent(newContent);
      onContentChange?.(newContent);

      // Send operation to server
      if (socketRef.current && isConnected) {
        socketRef.current.emit('document-operation', {
          documentId,
          operation,
          userId
        });

        // Add to pending operations
        pendingOperationsRef.current.push(operation);
        lastOperationRef.current = operation.id;
      }
    }
  }, [content, version, userId, documentId, isConnected, onContentChange, generateOperationId]);

  // Calculate difference between old and new content
  const calculateDiff = (oldContent: string, newContent: string) => {
    const oldLength = oldContent.length;
    const newLength = newContent.length;

    if (newLength > oldLength) {
      // Insert operation
      const insertLength = newLength - oldLength;
      let insertPosition = 0;
      let insertContent = '';

      // Find where the insertion occurred
      for (let i = 0; i < Math.min(oldLength, newLength); i++) {
        if (oldContent[i] !== newContent[i]) {
          insertPosition = i;
          insertContent = newContent.slice(i, i + insertLength);
          break;
        }
      }

      if (insertPosition === 0 && insertLength > 0) {
        insertContent = newContent.slice(0, insertLength);
      }

      return {
        type: 'insert' as const,
        position: insertPosition,
        content: insertContent,
        length: insertLength
      };
    } else if (newLength < oldLength) {
      // Delete operation
      const deleteLength = oldLength - newLength;
      let deletePosition = 0;

      // Find where the deletion occurred
      for (let i = 0; i < Math.min(oldLength, newLength); i++) {
        if (oldContent[i] !== newContent[i]) {
          deletePosition = i;
          break;
        }
      }

      return {
        type: 'delete' as const,
        position: deletePosition,
        length: deleteLength
      };
    }

    return null;
  };

  // Handle cursor position changes
  const handleCursorChange = useCallback(() => {
    if (socketRef.current && isConnected && textareaRef.current) {
      const cursorPosition = textareaRef.current.selectionStart;
      
      const operation: Operation = {
        id: generateOperationId(),
        type: 'retain',
        position: cursorPosition,
        userId,
        timestamp: new Date(),
        version: version
      };

      socketRef.current.emit('document-operation', {
        documentId,
        operation,
        userId
      });
    }
  }, [documentId, userId, version, isConnected, generateOperationId]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading collaborative editor...</span>
      </div>
    );
  }

  return (
    <div className={`collaborative-editor ${className}`}>
      {/* Status bar */}
      <div className="flex items-center justify-between p-2 bg-gray-100 border-b">
        <div className="flex items-center space-x-4">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span className="text-sm text-gray-500">
            Version: {version}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowVersionControl(true)}
            className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 flex items-center space-x-1"
            title="Version Control"
          >
            <span>📚</span>
            <span>Versions</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Active users:</span>
            <div className="flex space-x-1">
              {activeUsers.map(userId => (
                <div
                  key={userId}
                  className="w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center"
                  title={`User ${userId}`}
                >
                  {userId.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleTextChange}
        onSelect={handleCursorChange}
        onKeyUp={handleCursorChange}
        className="w-full h-96 p-4 border border-gray-300 rounded-b-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Start typing to begin collaborative editing..."
        disabled={!isConnected}
      />

      {/* Character count */}
      <div className="p-2 bg-gray-50 border-t text-sm text-gray-600">
        Characters: {content.length} | Words: {content.split(/\s+/).filter(word => word.length > 0).length}
      </div>

      {/* Version Control Modal */}
      <VersionControlModal
        isOpen={showVersionControl}
        onClose={() => setShowVersionControl(false)}
        documentId={documentId}
        currentVersion={version}
        onVersionSelect={(selectedVersion) => {
          // Load specific version content
          console.log('Loading version:', selectedVersion);
          setShowVersionControl(false);
        }}
        onRollback={(rollbackVersion) => {
          // Handle rollback
          console.log('Rolling back to version:', rollbackVersion);
          setShowVersionControl(false);
        }}
      />
    </div>
  );
};
