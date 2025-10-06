import express, { Response } from 'express';
import { ChecksumService } from '../services/checksumService';
import { authenticateToken, authorizeAdmin } from '../middleware/authMongo';
import { asyncHandler } from '../utils/asyncHandler';
import { logError } from '../utils/logger';

const router = express.Router();

// ===== CHECKSUM ENDPOINTS =====

// Get file checksum information
router.get('/info/:fileId',
  authenticateToken,
  asyncHandler(async (req: any, res: Response) => {
    try {
      const { fileId } = req.params;
      
      const info = await ChecksumService.getFileChecksumInfo(fileId);
      
      if (!info) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      return res.json({
        success: true,
        data: info
      });
    } catch (error: any) {
      logError.apiError('/api/checksum/info', 'GET', error.message, req.user?.id, 500);
      return res.status(500).json({ error: 'Failed to get file checksum info' });
    }
  })
);

// ===== ADMIN ENDPOINTS =====

// Get checksum statistics (admin only)
router.get('/stats',
  authenticateToken,
  authorizeAdmin,
  asyncHandler(async (req: any, res: Response) => {
    try {
      const stats = await ChecksumService.getChecksumStatistics();
      
      return res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logError.apiError('/api/checksum/stats', 'GET', error.message, req.user?.id, 500);
      return res.status(500).json({ error: 'Failed to get checksum statistics' });
    }
  })
);

// Find corrupted files (admin only)
router.get('/corrupted',
  authenticateToken,
  authorizeAdmin,
  asyncHandler(async (req: any, res: Response) => {
    try {
      const corruptedFiles = await ChecksumService.findCorruptedFiles();
      
      return res.json({
        success: true,
        data: corruptedFiles,
        count: corruptedFiles.length
      });
    } catch (error: any) {
      logError.apiError('/api/checksum/corrupted', 'GET', error.message, req.user?.id, 500);
      return res.status(500).json({ error: 'Failed to find corrupted files' });
    }
  })
);

export default router;