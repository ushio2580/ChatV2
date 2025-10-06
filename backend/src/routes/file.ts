import express from 'express';
import { FileService, upload } from '../services/fileService';
import { asyncHandler } from '../utils/asyncHandler';
import { File as FileModel } from '../models/File';

const router = express.Router();

// Test endpoint to check File model
router.get('/test', asyncHandler(async (req: express.Request, res: express.Response) => {
  try {
    console.log('Testing File model...');
    const count = await FileModel.countDocuments();
    console.log('File count:', count);
    
    return res.json({
      message: 'File model test',
      count: count,
      model: FileModel.modelName
    });
  } catch (error) {
    console.error('Error testing File model:', error);
    return res.status(500).json({ error: 'Failed to test File model' });
  }
}));

// Upload file
router.post('/upload', upload.single('file'), asyncHandler(async (req: express.Request, res: express.Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Verificar si el usuario está silenciado
  const uploadedBy = req.body.uploadedBy;
  if (uploadedBy && uploadedBy !== 'anonymous') {
    const { User } = require('../models');
    const user = await User.findById(uploadedBy);
    if (user && user.mutedUntil) {
      return res.status(403).json({ 
        error: 'User muted',
        message: 'No puedes subir archivos porque estás silenciado'
      });
    }
  }

  const metadata = {
    uploadedBy: req.body.uploadedBy || 'anonymous',
    roomId: req.body.roomId,
    isPublic: req.body.isPublic === 'true',
    description: req.body.description,
    tags: req.body.tags ? req.body.tags.split(',') : [],
    category: req.body.category
  };

  const file = await FileService.uploadFile(req.file, metadata);

  return res.json({
    message: 'File uploaded successfully',
    file: {
      id: file._id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.uploadedAt,
      roomId: file.roomId,
      isPublic: file.isPublic,
      metadata: file.metadata
    }
  });
}));

// Download file by filename
router.get('/download/:filename', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { filename } = req.params;

  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  try {
    const fileInfo = await FileService.getFileInfo(filename);
    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate headers
    res.set({
      'Content-Type': fileInfo.metadata?.originalName ? 
        require('mime-types').lookup(fileInfo.metadata.originalName) || 'application/octet-stream' : 
        'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileInfo.metadata?.originalName || filename}"`,
      'Content-Length': fileInfo.length
    });

    // Stream the file
    const downloadStream = FileService.getFileStream(filename);
    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error('Download stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error downloading file' });
      }
    });

    return Promise.resolve(); // Explicit return for TypeScript

  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ error: 'Error downloading file' });
  }
}));

// Download file by ID
router.get('/:id/download', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'File ID is required' });
  }

  try {
    // Get file info from database
    const file = await FileModel.findById(id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file stream from GridFS
    const fileInfo = await FileService.getFileInfo(file.filename);
    if (!fileInfo) {
      return res.status(404).json({ error: 'File data not found' });
    }

    // Set appropriate headers for preview/download
    const isPreview = req.query.preview === 'true';
    res.set({
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': isPreview ? 
        `inline; filename="${file.originalName}"` : 
        `attachment; filename="${file.originalName}"`,
      'Content-Length': fileInfo.length,
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });

    // Stream the file
    const downloadStream = FileService.getFileStream(file.filename);
    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error('Download stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error downloading file' });
      }
    });

    return Promise.resolve(); // Explicit return for TypeScript

  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ error: 'Error downloading file' });
  }
}));

// Get file info
router.get('/info/:fileId', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { fileId } = req.params;
  
  if (!fileId) {
    return res.status(400).json({ error: 'File ID is required' });
  }
  
  const file = await FileService.getFileById(fileId);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  return res.json({
    file: {
      id: file._id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.uploadedAt,
      roomId: file.roomId,
      isPublic: file.isPublic,
      metadata: file.metadata
    }
  });
}));

// Get files by room
router.get('/room/:roomId', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { roomId } = req.params;
  
  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }
  
  const files = await FileService.getFilesByRoom(roomId);
  
  return res.json({
    files: files.map(file => ({
      id: file._id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.uploadedAt,
      roomId: file.roomId,
      isPublic: file.isPublic,
      metadata: file.metadata
    }))
  });
}));

// Get user files
router.get('/user/:userId', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  const files = await FileService.getUserFiles(userId);
  
  return res.json({
    files: files.map(file => ({
      id: file._id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.uploadedAt,
      roomId: file.roomId,
      isPublic: file.isPublic,
      metadata: file.metadata
    }))
  });
}));

// Delete file
router.delete('/:fileId', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { fileId } = req.params;
  const userId = req.body.userId || 'anonymous';
  
  if (!fileId) {
    return res.status(400).json({ error: 'File ID is required' });
  }
  
  await FileService.deleteFile(fileId, userId);
  
  return res.json({ message: 'File deleted successfully' });
}));

// Get all files (admin)
router.get('/', asyncHandler(async (req: express.Request, res: express.Response) => {
  try {
    console.log('Fetching all files...');
    const files = await FileModel.find({}).sort({ uploadedAt: -1 });
    console.log('Found files:', files.length);
    
    return res.json({
      files: files.map(file => ({
        id: file._id,
        filename: file.filename,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.uploadedAt,
        roomId: file.roomId,
        isPublic: file.isPublic,
        metadata: file.metadata
      }))
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return res.status(500).json({ error: 'Failed to get files' });
  }
}));

export default router;