import { DocumentModel, IDocument } from '../models/Document';
import { DocumentVersion, IDocumentVersion } from '../models/DocumentVersion';
import { User } from '../models';
import mongoose from 'mongoose';

export interface VersionSnapshot {
  documentId: string;
  content: string;
  title: string;
  createdBy: string;
  snapshotName?: string;
  snapshotDescription?: string;
  tags?: string[];
}

export interface VersionComparison {
  fromVersion: number;
  toVersion: number;
  changes: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  statistics: {
    addedLines: number;
    removedLines: number;
    modifiedLines: number;
    totalChanges: number;
  };
}

export interface VersionHistory {
  versions: IDocumentVersion[];
  totalVersions: number;
  snapshots: IDocumentVersion[];
  collaborators: string[];
  timeline: Array<{
    version: number;
    date: Date;
    user: string;
    action: string;
    description: string;
  }>;
}

export class VersionControlService {
  /**
   * Create a new version of a document
   */
  static async createVersion(
    documentId: string,
    content: string,
    title: string,
    createdBy: string,
    isSnapshot: boolean = false,
    snapshotName?: string,
    snapshotDescription?: string,
    tags: string[] = []
  ): Promise<IDocumentVersion> {
    try {
      // Get current document
      const document = await DocumentModel.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Get current version number
      const currentVersion = await DocumentVersion.findOne({ documentId })
        .sort({ version: -1 })
        .select('version');
      
      const newVersionNumber = (currentVersion?.version || 0) + 1;

      // Calculate change summary if there's a previous version
      let changeSummary = {
        addedLines: 0,
        removedLines: 0,
        modifiedLines: 0,
        totalChanges: 0
      };

      if (currentVersion) {
        const previousVersion = await DocumentVersion.findOne({ documentId })
          .sort({ version: -1 })
          .skip(1);
        
        if (previousVersion) {
          changeSummary = this.calculateChanges(previousVersion.content, content);
        }
      }

      // Calculate metadata
      const metadata = this.calculateMetadata(content);

      // Create new version
      const version = new DocumentVersion({
        documentId,
        version: newVersionNumber,
        content,
        title,
        snapshot: isSnapshot,
        snapshotName,
        snapshotDescription,
        createdBy,
        changeSummary,
        collaborators: [createdBy],
        metadata,
        tags,
        isAutoSave: !isSnapshot
      });

      await version.save();

      return version;
    } catch (error) {
      console.error('Error creating version:', error);
      throw error;
    }
  }

  /**
   * Get version history for a document
   */
  static async getVersionHistory(
    documentId: string,
    page: number = 1,
    limit: number = 20,
    includeSnapshots: boolean = true
  ): Promise<VersionHistory> {
    try {
      const query: any = { documentId };
      if (!includeSnapshots) {
        query.snapshot = false;
      }

      const versions = await DocumentVersion.find(query)
        .sort({ version: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const totalVersions = await DocumentVersion.countDocuments(query);
      const snapshots = await DocumentVersion.find({ documentId, snapshot: true })
        .sort({ version: -1 });

      // Get unique collaborators
      const collaborators = await DocumentVersion.distinct('collaborators', { documentId });
      const collaboratorIds = collaborators.map(id => id.toString());

      // Create timeline
      const timeline = versions.map(version => ({
        version: version.version,
        date: version.createdAt,
        user: 'Unknown', // Will be populated by populate
        action: version.snapshot ? 'Snapshot' : 'Edit',
        description: version.snapshotName || `Version ${version.version}`
      }));

      return {
        versions,
        totalVersions,
        snapshots,
        collaborators: collaboratorIds,
        timeline
      };
    } catch (error) {
      console.error('Error getting version history:', error);
      throw error;
    }
  }

  /**
   * Compare two versions
   */
  static async compareVersions(
    documentId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<VersionComparison> {
    try {
      const fromVer = await DocumentVersion.findOne({ documentId, version: fromVersion });
      const toVer = await DocumentVersion.findOne({ documentId, version: toVersion });

      if (!fromVer || !toVer) {
        throw new Error('One or both versions not found');
      }

      const changes = this.calculateDetailedChanges(fromVer.content, toVer.content);
      const statistics = this.calculateChanges(fromVer.content, toVer.content);

      return {
        fromVersion,
        toVersion,
        changes,
        statistics
      };
    } catch (error) {
      console.error('Error comparing versions:', error);
      throw error;
    }
  }

  /**
   * Rollback to a specific version
   */
  static async rollbackToVersion(
    documentId: string,
    targetVersion: number,
    userId: string,
    reason?: string
  ): Promise<IDocumentVersion> {
    try {
      const targetVer = await DocumentVersion.findOne({ documentId, version: targetVersion });
      if (!targetVer) {
        throw new Error('Target version not found');
      }

      // Create a new version with the target content (rollback)
      const rollbackVersion = await this.createVersion(
        documentId,
        targetVer.content,
        targetVer.title,
        userId,
        false,
        undefined,
        `Rollback to version ${targetVersion}${reason ? `: ${reason}` : ''}`,
        ['rollback']
      );

      return rollbackVersion;
    } catch (error) {
      console.error('Error rolling back to version:', error);
      throw error;
    }
  }

  /**
   * Create a manual snapshot
   */
  static async createSnapshot(
    documentId: string,
    snapshotName: string,
    snapshotDescription: string,
    createdBy: string,
    tags: string[] = []
  ): Promise<IDocumentVersion> {
    try {
      const document = await DocumentModel.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      return await this.createVersion(
        documentId,
        document.content,
        document.title,
        createdBy,
        true,
        snapshotName,
        snapshotDescription,
        tags
      );
    } catch (error) {
      console.error('Error creating snapshot:', error);
      throw error;
    }
  }

  /**
   * Get a specific version
   */
  static async getVersion(documentId: string, version: number): Promise<IDocumentVersion | null> {
    try {
      return await DocumentVersion.findOne({ documentId, version });
    } catch (error) {
      console.error('Error getting version:', error);
      throw error;
    }
  }

  /**
   * Calculate changes between two content versions
   */
  private static calculateChanges(oldContent: string, newContent: string) {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    const addedLines = newLines.length - oldLines.length;
    const removedLines = Math.max(0, oldLines.length - newLines.length);
    const modifiedLines = Math.min(oldLines.length, newLines.length);
    
    return {
      addedLines: Math.max(0, addedLines),
      removedLines,
      modifiedLines,
      totalChanges: Math.abs(addedLines) + removedLines + modifiedLines
    };
  }

  /**
   * Calculate detailed changes for diff display
   */
  private static calculateDetailedChanges(oldContent: string, newContent: string) {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];
    
    // Simple line-by-line comparison
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (i >= oldLines.length) {
        added.push(`+ ${newLine}`);
      } else if (i >= newLines.length) {
        removed.push(`- ${oldLine}`);
      } else if (oldLine !== newLine) {
        modified.push(`~ ${oldLine} → ${newLine}`);
      }
    }
    
    return { added, removed, modified };
  }

  /**
   * Calculate document metadata
   */
  private static calculateMetadata(content: string) {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    const characters = content.length;
    const lines = content.split('\n').length;
    
    return {
      wordCount: words.length,
      characterCount: characters,
      lineCount: lines,
      language: 'text'
    };
  }
}