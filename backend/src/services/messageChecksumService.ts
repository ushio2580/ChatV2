import * as crypto from 'crypto';

export class MessageChecksumService {
  /**
   * Generate checksum for a message content
   */
  static generateMessageChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Verify message integrity
   */
  static verifyMessageIntegrity(content: string, expectedChecksum: string): boolean {
    const actualChecksum = this.generateMessageChecksum(content);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Add checksum to message data
   */
  static addChecksumToMessage(messageData: any): any {
    const checksum = this.generateMessageChecksum(messageData.content);
    return {
      ...messageData,
      checksum,
      integrityVerified: true
    };
  }
}
