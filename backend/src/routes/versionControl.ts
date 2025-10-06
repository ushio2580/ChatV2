import express, { Response } from 'express';
import { VersionControlService } from '../services/versionControlService';
import { authenticateToken } from '../middleware/authMongo';
import { asyncHandler } from '../utils/asyncHandler';
import { logError } from '../utils/logger';

const router = express.Router();

// ===== VERSION HISTORY ENDPOINTS =====

// Get version history for a document
router.get('/history/:documentId',
  authenticateToken,
  asyncHandler(async (req: any, res: Response) => {
    try {
      const { documentId } = req.params;
      const { page = 1, limit = 20, snapshots = true } = req.query;

      const history = await VersionControlService.getVersionHistory(
        documentId,
        parseInt(page as string),
        parseInt(limit as string),
        snapshots === 'true'
      );

      return res.json({
        success: true,
        data: history
      });
    } catch (error: any) {
      logError.apiError('/api/versions/history', 'GET', error.message, req.user?.id, 500);
      return res.status(500).json({ error: 'Failed to get version history' });
    }
  })
);

// Get a specific version
router.get('/version/:documentId/:version',
  authenticateToken,
  asyncHandler(async (req: any, res: Response) => {
    try {
      const { documentId, version } = req.params;
      const versionNumber = parseInt(version);

      const versionData = await VersionControlService.getVersion(documentId, versionNumber);

      if (!versionData) {
        return res.status(404).json({ error: 'Version not found' });
      }

      return res.json({
        success: true,
        data: versionData
      });
    } catch (error: any) {
      logError.apiError('/api/versions/version', 'GET', error.message, req.user?.id, 500);
      return res.status(500).json({ error: 'Failed to get version' });
    }
  })
);

// Compare two versions
router.get('/compare/:documentId/:fromVersion/:toVersion',
  authenticateToken,
  asyncHandler(async (req: any, res: Response) => {
    try {
      const { documentId, fromVersion, toVersion } = req.params;
      const fromVer = parseInt(fromVersion);
      const toVer = parseInt(toVersion);

      const comparison = await VersionControlService.compareVersions(
        documentId,
        fromVer,
        toVer
      );

      return res.json({
        success: true,
        data: comparison
      });
    } catch (error: any) {
      logError.apiError('/api/versions/compare', 'GET', error.message, req.user?.id, 500);
      return res.status(500).json({ error: 'Failed to compare versions' });
    }
  })
);

// ===== VERSION MANAGEMENT ENDPOINTS =====

// Create a manual snapshot
router.post('/snapshot/:documentId',
  authenticateToken,
  asyncHandler(async (req: any, res: Response) => {
    try {
      const { documentId } = req.params;
      const { 
        snapshotName, 
        snapshotDescription, 
        tags = [] 
      } = req.body;

      if (!snapshotName) {
        return res.status(400).json({ error: 'Snapshot name is required' });
      }

      const snapshot = await VersionControlService.createSnapshot(
        documentId,
        snapshotName,
        snapshotDescription || '',
        req.user!.id,
        tags
      );

      return res.json({
        success: true,
        data: snapshot,
        message: 'Snapshot created successfully'
      });
    } catch (error: any) {
      logError.apiError('/api/versions/snapshot', 'POST', error.message, req.user?.id, 500);
      return res.status(500).json({ error: 'Failed to create snapshot' });
    }
  })
);

// Rollback to a specific version
router.post('/rollback/:documentId/:version',
  authenticateToken,
  asyncHandler(async (req: any, res: Response) => {
    try {
      const { documentId, version } = req.params;
      const { reason } = req.body;
      const versionNumber = parseInt(version);

      const rollbackVersion = await VersionControlService.rollbackToVersion(
        documentId,
        versionNumber,
        req.user!.id,
        reason
      );

      return res.json({
        success: true,
        data: rollbackVersion,
        message: `Successfully rolled back to version ${versionNumber}`
      });
    } catch (error: any) {
      logError.apiError('/api/versions/rollback', 'POST', error.message, req.user?.id, 500);
      return res.status(500).json({ error: 'Failed to rollback version' });
    }
  })
);

// Delete a version
router.delete('/version/:documentId/:version',
  authenticateToken,
  asyncHandler(async (req: any, res: Response) => {
    try {
      const { documentId, version } = req.params;
      const versionNumber = parseInt(version);

      const deleted = await VersionControlService.deleteVersion(documentId, versionNumber);

      if (!deleted) {
        return res.status(404).json({ error: 'Version not found or cannot be deleted' });
      }

      return res.json({
        success: true,
        message: `Version ${versionNumber} deleted successfully`
      });
    } catch (error: any) {
      logError.apiError('/api/versions/delete', 'DELETE', error.message, req.user?.id, 500);
      return res.status(500).json({ error: 'Failed to delete version' });
    }
  })
);

// Search versions
router.get('/search/:documentId',
  authenticateToken,
  asyncHandler(async (req: any, res: Response) => {
    try {
      const { documentId } = req.params;
      const { q, page = 1, limit = 20 } = req.query;

      if (!q) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const results = await VersionControlService.searchVersions(
        documentId,
        q as string,
        parseInt(page as string),
        parseInt(limit as string)
      );

      return res.json({
        success: true,
        data: results,
        query: q,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });
    } catch (error: any) {
      logError.apiError('/api/versions/search', 'GET', error.message, req.user?.id, 500);
      return res.status(500).json({ error: 'Failed to search versions' });
    }
  })
);

// ===== VERSION STATISTICS ENDPOINTS =====

// Get version statistics for a document
router.get('/stats/:documentId',
  authenticateToken,
  asyncHandler(async (req: any, res: Response) => {
    try {
      const { documentId } = req.params;

      // Get basic stats
      const totalVersions = await VersionControlService.getVersionHistory(documentId, 1, 1);
      const snapshots = await VersionControlService.getVersionHistory(documentId, 1, 1, true);
      
      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const stats = {
        totalVersions: totalVersions.totalVersions,
        totalSnapshots: snapshots.snapshots.length,
        collaborators: totalVersions.collaborators.length,
        recentActivity: totalVersions.timeline.filter(
          item => new Date(item.date) >= thirtyDaysAgo
        ).length,
        timeline: totalVersions.timeline.slice(0, 10) // Last 10 activities
      };

      return res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logError.apiError('/api/versions/stats', 'GET', error.message, req.user?.id, 500);
      return res.status(500).json({ error: 'Failed to get version statistics' });
    }
  })
);

export default router;
