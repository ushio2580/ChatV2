import express from 'express';
import { DocumentModel } from '../models';
import { CollaborativeEditingService } from '../services/collaborativeEditingService';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/authMongo';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/documents
 * @desc Create a new collaborative document
 */
router.post('/', asyncHandler(async (req: any, res: any) => {
  const { title, roomId, isPublic } = req.body;
  const userId = req.user.id;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const document = await CollaborativeEditingService.createDocument(
    title,
    userId,
    roomId,
    isPublic || false
  );

  res.status(201).json({
    message: 'DocumentModel created successfully',
    document: {
      id: document._id,
      title: document.title,
      content: document.content,
      createdBy: document.createdBy,
      roomId: document.roomId,
      isPublic: document.isPublic,
      collaborators: document.collaborators,
      version: document.version,
      lastModified: document.lastModified,
      metadata: document.metadata
    }
  });
}));

/**
 * @route GET /api/documents
 * @desc Get user's documents
 */
router.get('/', asyncHandler(async (req: any, res: any) => {
  const userId = req.user.id;
  const documents = await CollaborativeEditingService.getUserDocuments(userId);

  res.json({
    documents: documents.map(doc => ({
      id: doc._id,
      title: doc.title,
      content: doc.content,
      createdBy: doc.createdBy,
      roomId: doc.roomId,
      isPublic: doc.isPublic,
      collaborators: doc.collaborators,
      version: doc.version,
      lastModified: doc.lastModified,
      metadata: doc.metadata
    }))
  });
}));

/**
 * @route GET /api/documents/public
 * @desc Get public documents
 */
router.get('/public', asyncHandler(async (req: any, res: any) => {
  const documents = await CollaborativeEditingService.getPublicDocuments();

  res.json({
    documents: documents.map(doc => ({
      id: doc._id,
      title: doc.title,
      content: doc.content,
      createdBy: doc.createdBy,
      roomId: doc.roomId,
      isPublic: doc.isPublic,
      collaborators: doc.collaborators,
      version: doc.version,
      lastModified: doc.lastModified,
      metadata: doc.metadata
    }))
  });
}));

/**
 * @route GET /api/documents/:id
 * @desc Get document by ID
 */
router.get('/:id', asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const userId = req.user.id;

  const document = await DocumentModel.findById(id)
    .populate('createdBy', 'username email')
    .populate('collaborators', 'username email');

  if (!document) {
    return res.status(404).json({ error: 'DocumentModel not found' });
  }

  // Check permissions
  const hasPermission = document.isPublic || 
                       document.createdBy._id.toString() === userId ||
                       document.collaborators.some(collab => collab._id.toString() === userId);

  if (!hasPermission) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({
    document: {
      id: document._id,
      title: document.title,
      content: document.content,
      createdBy: document.createdBy,
      roomId: document.roomId,
      isPublic: document.isPublic,
      collaborators: document.collaborators,
      version: document.version,
      lastModified: document.lastModified,
      metadata: document.metadata
    }
  });
}));

/**
 * @route POST /api/documents/:id/join
 * @desc Join a document for collaborative editing
 */
router.post('/:id/join', asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const userId = req.user.id;

  const success = await CollaborativeEditingService.joinDocument(id, userId);

  if (!success) {
    return res.status(403).json({ error: 'Cannot join document' });
  }

  res.json({ message: 'Successfully joined document' });
}));

/**
 * @route POST /api/documents/:id/leave
 * @desc Leave a document
 */
router.post('/:id/leave', asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const userId = req.user.id;

  await CollaborativeEditingService.leaveDocument(id, userId);

  res.json({ message: 'Successfully left document' });
}));

/**
 * @route POST /api/documents/:id/operations
 * @desc Apply operation to document
 */
router.post('/:id/operations', asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const userId = req.user.id;
  const operation = req.body;

  // Validate operation
  if (!operation.id || !operation.type || operation.position === undefined) {
    return res.status(400).json({ error: 'Invalid operation format' });
  }

  const result = await CollaborativeEditingService.applyOperation(id, {
    ...operation,
    userId,
    timestamp: new Date()
  });

  if (!result.success) {
    return res.status(400).json({ error: 'Failed to apply operation' });
  }

  res.json({
    message: 'Operation applied successfully',
    newContent: result.newContent,
    version: result.version
  });
}));

/**
 * @route GET /api/documents/:id/state
 * @desc Get document state
 */
router.get('/:id/state', asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const userId = req.user.id;

  const state = await CollaborativeEditingService.getDocumentState(id, userId);

  if (!state) {
    return res.status(404).json({ error: 'DocumentModel not found or access denied' });
  }

  res.json({ state });
}));

/**
 * @route GET /api/documents/:id/history
 * @desc Get document history
 */
router.get('/:id/history', asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const userId = req.user.id;

  const history = await CollaborativeEditingService.getDocumentHistory(id, userId);

  res.json({ history });
}));

/**
 * @route POST /api/documents/:id/collaborators
 * @desc Add collaborator to document
 */
router.post('/:id/collaborators', asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const { userId } = req.body;
  const addedBy = req.user.id;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const success = await CollaborativeEditingService.addCollaborator(id, userId, addedBy);

  if (!success) {
    return res.status(403).json({ error: 'Cannot add collaborator' });
  }

  res.json({ message: 'Collaborator added successfully' });
}));

/**
 * @route DELETE /api/documents/:id/collaborators/:userId
 * @desc Remove collaborator from document
 */
router.delete('/:id/collaborators/:userId', asyncHandler(async (req: any, res: any) => {
  const { id, userId } = req.params;
  const removedBy = req.user.id;

  const success = await CollaborativeEditingService.removeCollaborator(id, userId, removedBy);

  if (!success) {
    return res.status(403).json({ error: 'Cannot remove collaborator' });
  }

  res.json({ message: 'Collaborator removed successfully' });
}));

/**
 * @route DELETE /api/documents/:id
 * @desc Delete document
 */
router.delete('/:id', asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const userId = req.user.id;

  const success = await CollaborativeEditingService.deleteDocument(id, userId);

  if (!success) {
    return res.status(403).json({ error: 'Cannot delete document' });
  }

  res.json({ message: 'DocumentModel deleted successfully' });
}));

export default router;