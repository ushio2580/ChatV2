import * as crypto from 'crypto';
import fs from 'fs';

export class SimpleChecksumService {
  /**
   * Generate checksums for a file buffer (simple version)
   */
  static generateFileChecksums(filePath: string): { md5: string; sha256: string } {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const md5 = crypto.createHash('md5').update(fileBuffer).digest('hex');
      const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      return { md5, sha256 };
    } catch (error) {
      console.error('Error generating checksums:', error);
      return { md5: '', sha256: '' };
    }
  }

  /**
   * Generate checksums for text content
   */
  static generateTextChecksums(content: string): { md5: string; sha256: string } {
    const md5 = crypto.createHash('md5').update(content).digest('hex');
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    
    return { md5, sha256 };
  }

  /**
   * Verify file integrity by comparing checksums
   */
  static verifyFileIntegrity(filePath: string, expectedMd5: string, expectedSha256: string): boolean {
    try {
      const { md5, sha256 } = this.generateFileChecksums(filePath);
      return md5 === expectedMd5 && sha256 === expectedSha256;
    } catch (error) {
      console.error('Error verifying file integrity:', error);
      return false;
    }
  }

  /**
   * Get checksum info for display (without database)
   */
  static getChecksumInfo(filePath: string): {
    md5: string;
    sha256: string;
    verified: boolean;
    fileSize: number;
  } {
    try {
      const stats = fs.statSync(filePath);
      const { md5, sha256 } = this.generateFileChecksums(filePath);
      
      return {
        md5,
        sha256,
        verified: true,
        fileSize: stats.size
      };
    } catch (error) {
      console.error('Error getting checksum info:', error);
      return {
        md5: '',
        sha256: '',
        verified: false,
        fileSize: 0
      };
    }
  }
}
