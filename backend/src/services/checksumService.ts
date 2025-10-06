import * as crypto from 'crypto';
import { File } from '../models/File';

export interface ChecksumResult {
  md5: string;
  sha256: string;
  algorithm: string;
  verified: boolean;
  verifiedAt: Date;
}

export class ChecksumService {
  /**
   * Generate checksums for a file buffer
   */
  static generateChecksums(buffer: Buffer): { md5: string; sha256: string } {
    const md5 = crypto.createHash('md5').update(buffer).digest('hex');
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    
    return { md5, sha256 };
  }

  /**
   * Get checksum statistics for admin panel
   */
  static async getChecksumStatistics(): Promise<{
    totalFiles: number;
    verifiedFiles: number;
    unverifiedFiles: number;
    corruptedFiles: number;
    verificationRate: number;
  }> {
    try {
      const totalFiles = await File.countDocuments();
      const verifiedFiles = await File.countDocuments({ 'checksum.verified': true });
      const unverifiedFiles = await File.countDocuments({ 'checksum.verified': false });
      
      // Files that failed verification (have verifiedAt but verified is false)
      const corruptedFiles = await File.countDocuments({
        'checksum.verified': false,
        'checksum.verifiedAt': { $exists: true }
      });
      
      const verificationRate = totalFiles > 0 ? (verifiedFiles / totalFiles) * 100 : 0;
      
      return {
        totalFiles,
        verifiedFiles,
        unverifiedFiles,
        corruptedFiles,
        verificationRate: Math.round(verificationRate * 100) / 100
      };
    } catch (error) {
      console.error('Error getting checksum statistics:', error);
      throw error;
    }
  }

  /**
   * Find files with integrity issues
   */
  static async findCorruptedFiles(): Promise<any[]> {
    try {
      return await File.find({
        'checksum.verified': false,
        'checksum.verifiedAt': { $exists: true }
      }).select('filename originalName uploadedAt checksum');
    } catch (error) {
      console.error('Error finding corrupted files:', error);
      throw error;
    }
  }

  /**
   * Get file checksum info for display
   */
  static async getFileChecksumInfo(fileId: string): Promise<{
    fileId: string;
    filename: string;
    originalName: string;
    checksum: ChecksumResult;
    size: number;
    uploadedAt: Date;
  } | null> {
    try {
      const file = await File.findById(fileId);
      if (!file) return null;
      
      return {
        fileId: file._id,
        filename: file.filename,
        originalName: file.originalName,
        checksum: {
          md5: file.checksum.md5,
          sha256: file.checksum.sha256,
          algorithm: file.checksum.algorithm,
          verified: file.checksum.verified,
          verifiedAt: file.checksum.verifiedAt || new Date()
        },
        size: file.size,
        uploadedAt: file.uploadedAt
      };
    } catch (error) {
      console.error('Error getting file checksum info:', error);
      throw error;
    }
  }
}