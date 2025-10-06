import { DocumentModel, IDocument, IOperation } from '../models/Document';
// import { VersionControlService } from './versionControlService';
import { User } from '../models';
import mongoose from 'mongoose';

export interface CollaborativeOperation {
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

export class CollaborativeEditingService {
  private static activeDocuments = new Map<string, Set<string>>();
  private static documentStates = new Map<string, DocumentState>();

  /**
   * Create a new collaborative document
   */
  static async createDocument(
    title: string,
    createdBy: string,
    roomId?: string,
    isPublic: boolean = false
  ): Promise<IDocument> {
    const document = new DocumentModel({
      title,
      content: '',
      createdBy,
      roomId,
      isPublic,
      collaborators: [createdBy],
      version: 0,
      operations: [],
      metadata: {
        language: 'text',
        wordCount: 0,
        characterCount: 0
      }
    });

    await document.save();
    
    // Initialize document state
    this.documentStates.set((document._id as mongoose.Types.ObjectId).toString(), {
      content: '',
      version: 0,
      activeUsers: [],
      lastModified: new Date()
    });

    return document;
  }

  /**
   * Join a document for collaborative editing
   */
  static async joinDocument(documentId: string, userId: string): Promise<boolean> {
    try {
      const document = await DocumentModel.findById(documentId);
      if (!document) return false;

      // Check if user has permission
      const hasPermission = document.isPublic || 
                           document.createdBy.toString() === userId ||
                           document.collaborators.includes(new mongoose.Types.ObjectId(userId));

      if (!hasPermission) return false;

      // Add user to active users
      if (!this.activeDocuments.has(documentId)) {
        this.activeDocuments.set(documentId, new Set());
      }
      this.activeDocuments.get(documentId)!.add(userId);

      // Update document state
      const state = this.documentStates.get(documentId);
      if (state) {
        state.activeUsers = Array.from(this.activeDocuments.get(documentId) || []);
      }

      return true;
    } catch (error) {
      console.error('Error joining document:', error);
      return false;
    }
  }

  /**
   * Leave a document
   */
  static async leaveDocument(documentId: string, userId: string): Promise<void> {
    const activeUsers = this.activeDocuments.get(documentId);
    if (activeUsers) {
      activeUsers.delete(userId);
      if (activeUsers.size === 0) {
        this.activeDocuments.delete(documentId);
      }
    }

    // Update document state
    const state = this.documentStates.get(documentId);
    if (state) {
      state.activeUsers = Array.from(this.activeDocuments.get(documentId) || []);
    }
  }

  /**
   * Apply operation to document using CRDT principles
   */
  static async applyOperation(
    documentId: string,
    operation: CollaborativeOperation
  ): Promise<{ success: boolean; newContent?: string; version?: number }> {
    try {
      const document = await DocumentModel.findById(documentId);
      if (!document) return { success: false };

      // Get current state
      const state = this.documentStates.get(documentId);
      if (!state) return { success: false };

      // Apply operation to content
      let newContent = state.content;
      
      switch (operation.type) {
        case 'insert':
          newContent = this.insertText(newContent, operation.position, operation.content || '');
          break;
        case 'delete':
          newContent = this.deleteText(newContent, operation.position, operation.length || 0);
          break;
        case 'retain':
          // Retain operations are used for cursor positioning
          break;
      }

      // Create operation record
      const operationRecord: IOperation = {
        id: operation.id,
        type: operation.type,
        position: operation.position,
        content: operation.content || '',
        length: operation.length || 0,
        userId: new mongoose.Types.ObjectId(operation.userId),
        timestamp: operation.timestamp,
        version: operation.version
      };

      // Add operation to document
      document.operations.push(operationRecord);
      document.content = newContent;
      document.version += 1;
      document.lastModified = new Date();

      await document.save();

      // Create version if version control is enabled
      // TODO: Implement version control when dependencies are fixed
      // if (document.versionControl?.enabled) {
      //   try {
      //     await VersionControlService.createVersion(
      //       documentId,
      //       newContent,
      //       document.title,
      //       operation.userId,
      //       false, // Not a snapshot
      //       undefined,
      //       undefined,
      //       []
      //     );
      //   } catch (versionError) {
      //     console.error('Error creating version:', versionError);
      //     // Don't fail the operation if version creation fails
      //   }
      // }

      // Update state
      state.content = newContent;
      state.version = document.version;
      state.lastModified = document.lastModified;

      return {
        success: true,
        newContent,
        version: document.version
      };
    } catch (error) {
      console.error('Error applying operation:', error);
      return { success: false };
    }
  }

  /**
   * Get document state for a user
   */
  static async getDocumentState(documentId: string, userId: string): Promise<DocumentState | null> {
    const state = this.documentStates.get(documentId);
    if (!state) return null;

    // Check if user has access
    const document = await DocumentModel.findById(documentId);
    if (!document) return null;

    const hasPermission = document.isPublic || 
                         document.createdBy.toString() === userId ||
                         document.collaborators.includes(new mongoose.Types.ObjectId(userId));

    if (!hasPermission) return null;

    return {
      ...state,
      activeUsers: Array.from(this.activeDocuments.get(documentId) || [])
    };
  }

  /**
   * Get all documents for a user
   */
  static async getUserDocuments(userId: string): Promise<IDocument[]> {
    return DocumentModel.find({
      $or: [
        { createdBy: userId },
        { collaborators: userId }
      ]
    })
    .populate('createdBy', 'username email')
    .populate('collaborators', 'username email')
    .sort({ lastModified: -1 });
  }

  /**
   * Get public documents
   */
  static async getPublicDocuments(): Promise<IDocument[]> {
    return DocumentModel.find({ isPublic: true })
      .populate('createdBy', 'username email')
      .populate('collaborators', 'username email')
      .sort({ lastModified: -1 });
  }

  /**
   * Add collaborator to document
   */
  static async addCollaborator(documentId: string, userId: string, addedBy: string): Promise<boolean> {
    try {
      const document = await DocumentModel.findById(documentId);
      if (!document) return false;

      // Check if user has permission to add collaborators
      const canAdd = document.createdBy.toString() === addedBy ||
                    document.collaborators.includes(new mongoose.Types.ObjectId(addedBy));

      if (!canAdd) return false;

      // Add collaborator if not already present
      const collaboratorId = new mongoose.Types.ObjectId(userId);
      if (!document.collaborators.includes(collaboratorId)) {
        document.collaborators.push(collaboratorId);
        await document.save();
      }

      return true;
    } catch (error) {
      console.error('Error adding collaborator:', error);
      return false;
    }
  }

  /**
   * Remove collaborator from document
   */
  static async removeCollaborator(documentId: string, userId: string, removedBy: string): Promise<boolean> {
    try {
      const document = await DocumentModel.findById(documentId);
      if (!document) return false;

      // Check if user has permission to remove collaborators
      const canRemove = document.createdBy.toString() === removedBy;

      if (!canRemove) return false;

      // Remove collaborator
      document.collaborators = document.collaborators.filter(
        id => id.toString() !== userId
      );
      await document.save();

      // Remove from active users if present
      await this.leaveDocument(documentId, userId);

      return true;
    } catch (error) {
      console.error('Error removing collaborator:', error);
      return false;
    }
  }

  /**
   * Delete document
   */
  static async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    try {
      const document = await DocumentModel.findById(documentId);
      if (!document) return false;

      // Check if user has permission to delete
      const canDelete = document.createdBy.toString() === userId;

      if (!canDelete) return false;

      await DocumentModel.findByIdAndDelete(documentId);
      
      // Clean up state
      this.activeDocuments.delete(documentId);
      this.documentStates.delete(documentId);

      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }

  /**
   * Get document history/operations
   */
  static async getDocumentHistory(documentId: string, userId: string): Promise<IOperation[]> {
    try {
      const document = await DocumentModel.findById(documentId);
      if (!document) return [];

      // Check permissions
      const hasPermission = document.isPublic || 
                           document.createdBy.toString() === userId ||
                           document.collaborators.includes(new mongoose.Types.ObjectId(userId));

      if (!hasPermission) return [];

      return document.operations.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      console.error('Error getting document history:', error);
      return [];
    }
  }

  // Helper methods for text operations
  private static insertText(text: string, position: number, content: string): string {
    return text.slice(0, position) + content + text.slice(position);
  }

  private static deleteText(text: string, position: number, length: number): string {
    return text.slice(0, position) + text.slice(position + length);
  }

  /**
   * Transform operations for conflict resolution
   */
  static transformOperation(op1: CollaborativeOperation, op2: CollaborativeOperation): CollaborativeOperation {
    // Simple transformation logic - in a real implementation, you'd use more sophisticated CRDT algorithms
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position <= op2.position) {
        return { ...op2, position: op2.position + op1.content!.length };
      }
    } else if (op1.type === 'delete' && op2.type === 'insert') {
      if (op1.position <= op2.position) {
        return { ...op2, position: op2.position - op1.length! };
      }
    }
    
    return op2;
  }
}
