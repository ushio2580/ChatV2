import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import * as dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import path from 'path';
import { connectDB } from './config/mongodb-atlas';
import { User, Message, Room, File, DocumentModel, Log } from './models';
import fileRoutes from './routes/file';
import documentRoutes from './routes/document';
import authRoutes from './routes/auth';
// import checksumRoutes from './routes/checksum';
// import versionControlRoutes from './routes/versionControl';
import { initGridFS } from './services/fileService';
import { CollaborativeEditingService } from './services/collaborativeEditingService';
import { GroupServiceMongo } from './services/groupServiceMongo';
import logger, { logSystem, logAuth, logMessage, logFile, logGroup, logAdmin, logError } from './utils/logger';
// import { MessageChecksumService } from './services/messageChecksumService';
import { authenticateToken, authorizeAdmin } from './middleware/authMongo';

// Load environment variables
dotenv.config();

// Fallback JWT_SECRET si no se carga desde .env
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

console.log('🔍 JWT_SECRET loaded:', JWT_SECRET);
console.log('🔍 process.env.JWT_SECRET:', process.env.JWT_SECRET);

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = parseInt(process.env.PORT || '3003', 10);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Connect to MongoDB and initialize GridFS
const initializeDatabase = async () => {
  try {
    await connectDB();
    logSystem.databaseConnected('MongoDB Atlas');
    console.log('✅ Database connected');
    
    // Initialize GridFS after database connection
    initGridFS();
    console.log('✅ GridFS initialized');
  } catch (error: any) {
    logSystem.databaseError(error.message, 'connection');
    console.error('❌ Database connection failed:', error);
    console.log('⚠️  Server will continue without database connection');
    // No process.exit(1) - let server continue
  }
};

// Initialize database
initializeDatabase();

// Temporary endpoints to check data without auth (before auth middleware)
app.get('/api/documents/debug', async (req, res) => {
  try {
    const documents = await DocumentModel.find({});
    return res.json({ 
      count: documents.length,
      documents: documents.map((doc: any) => ({
        id: (doc._id as any).toString(),
        title: doc.title,
        content: doc.content,
        createdBy: doc.createdBy,
        isPublic: doc.isPublic,
        createdAt: doc.createdAt || new Date()
      }))
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Simple document endpoint for testing (no auth required)
app.get('/api/documents/simple/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await DocumentModel.findById(id);
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    return res.json({
      success: true,
      document: {
        id: (doc._id as any).toString(),
        title: doc.title,
        content: doc.content,
        createdBy: doc.createdBy,
        isPublic: doc.isPublic,
        createdAt: doc.createdAt || new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Simple document update endpoint for testing (no auth required)
app.put('/api/documents/simple/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, title } = req.body;
    
    const doc = await DocumentModel.findByIdAndUpdate(
      id,
      { 
        content: content || '',
        title: title || 'Untitled Document',
        lastModified: new Date()
      },
      { new: true }
    );
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    return res.json({
      success: true,
      document: {
        id: (doc._id as any).toString(),
        title: doc.title,
        content: doc.content,
        createdBy: doc.createdBy,
        isPublic: doc.isPublic,
        createdAt: doc.createdAt || new Date()
      }
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return res.status(500).json({ error: 'Failed to update document' });
  }
});

// Get all users endpoint
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select('username email role isOnline lastSeen createdAt');
    return res.json({
      users: users.map((user: any) => ({
        id: (user._id as any).toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user's documents
app.get('/api/documents', async (req, res) => {
  try {
    console.log('🔍 Getting user documents');
    
    // Get all documents (for now, we'll filter by user later)
    const allDocs = await DocumentModel.find({});
    
    console.log('📄 Found documents:', allDocs.length);
    
    const documents = await Promise.all(allDocs.map(async (doc: any) => {
      // Get user info for the creator
      let creatorInfo: any = {
        _id: doc.createdBy,
        username: 'Unknown',
        email: 'unknown@example.com'
      };
      
      try {
        const user = await User.findById(doc.createdBy);
        if (user) {
          creatorInfo = {
            _id: user._id,
            username: user.username,
            email: user.email
          };
        }
      } catch (error) {
        console.log('Could not find user for document creator:', doc.createdBy);
      }
      
      return {
        id: (doc._id as any).toString(),
        title: doc.title,
        content: doc.content,
        createdBy: creatorInfo,
        roomId: doc.roomId,
        isPublic: doc.isPublic || false,
        collaborators: doc.collaborators || [],
        version: doc.version || 1,
        lastModified: doc.lastModified || doc.createdAt,
        metadata: {
          language: 'en',
          wordCount: doc.content ? doc.content.split(' ').length : 0,
          characterCount: doc.content ? doc.content.length : 0
        }
      };
    }));
    
    return res.json({
      success: true,
      documents: documents
    });
  } catch (error) {
    console.error('Error getting user documents:', error);
    return res.status(500).json({ error: 'Failed to get user documents' });
  }
});

// Get public documents
app.get('/api/documents/public', async (req, res) => {
  try {
    console.log('🔍 Getting public documents');
    
    // Get public documents
    const publicDocs = await DocumentModel.find({ isPublic: true });
    
    console.log('📄 Found public documents:', publicDocs.length);
    
    const documents = await Promise.all(publicDocs.map(async (doc: any) => {
      // Get user info for the creator
      let creatorInfo: any = {
        _id: doc.createdBy,
        username: 'Unknown',
        email: 'unknown@example.com'
      };
      
      try {
        const user = await User.findById(doc.createdBy);
        if (user) {
          creatorInfo = {
            _id: user._id,
            username: user.username,
            email: user.email
          };
        }
      } catch (error) {
        console.log('Could not find user for document creator:', doc.createdBy);
      }
      
      return {
        id: (doc._id as any).toString(),
        title: doc.title,
        content: doc.content,
        createdBy: creatorInfo,
        roomId: doc.roomId,
        isPublic: doc.isPublic || false,
        collaborators: doc.collaborators || [],
        version: doc.version || 1,
        lastModified: doc.lastModified || doc.createdAt,
        metadata: {
          language: 'en',
          wordCount: doc.content ? doc.content.split(' ').length : 0,
          characterCount: doc.content ? doc.content.length : 0
        }
      };
    }));
    
    return res.json({
      success: true,
      documents: documents
    });
  } catch (error) {
    console.error('Error getting public documents:', error);
    return res.status(500).json({ error: 'Failed to get public documents' });
  }
});

// Get documents by group/room
app.get('/api/documents/group/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    console.log('🔍 Getting documents for group:', roomId);
    
    // Get documents for this specific group
    const groupDocs = await DocumentModel.find({ roomId: roomId });
    
    console.log('📄 Found documents:', groupDocs.length);
    
    const documents = await Promise.all(groupDocs.map(async (doc: any) => {
      // Get user info for the creator
      let creatorInfo: any = {
        _id: doc.createdBy,
        username: 'Unknown',
        email: 'unknown@example.com'
      };
      
      try {
        const user = await User.findById(doc.createdBy);
        if (user) {
          creatorInfo = {
            _id: user._id,
            username: user.username,
            email: user.email
          };
        }
      } catch (error) {
        console.log('Could not find user for document creator:', doc.createdBy);
      }
      
      return {
        id: (doc._id as any).toString(),
        title: doc.title,
        content: doc.content,
        createdBy: creatorInfo,
        roomId: doc.roomId,
        isPublic: doc.isPublic || false,
        collaborators: doc.collaborators || [],
        version: doc.version || 1,
        lastModified: doc.lastModified || doc.createdAt,
        metadata: {
          language: 'en',
          wordCount: doc.content ? doc.content.split(' ').length : 0,
          characterCount: doc.content ? doc.content.length : 0
        }
      };
    }));
    
    return res.json({
      success: true,
      documents: documents
    });
  } catch (error) {
    console.error('Error getting group documents:', error);
    return res.status(500).json({ error: 'Failed to get group documents' });
  }
});

// Create a new document
app.post('/api/documents', async (req, res) => {
  try {
    const { title, groupId, content, isPublic } = req.body;
    
    console.log('🔍 Creating document:', { title, groupId, isPublic });
    
    if (!title) {
      return res.status(400).json({ error: 'Document title is required' });
    }
    
    // Get user ID from Authorization header
    const authHeader = req.headers.authorization;
    let userId = '68d407fad9c0872843a12631'; // Default fallback
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.id;
        console.log('✅ Document creator:', userId);
      } catch (error) {
        console.log('⚠️ Could not verify token, using default user');
      }
    }
    
    // Create new document
    const newDoc = new DocumentModel({
      title: title,
      content: content || '',
      createdBy: userId,
      roomId: groupId || null,
      isPublic: isPublic || false,
      collaborators: [],
      version: 1,
      lastModified: new Date()
    });
    
    const savedDoc = await newDoc.save();
    
    console.log('📄 Document created:', savedDoc._id);
    
    const document = {
      id: (savedDoc._id as any).toString(),
      title: savedDoc.title,
      content: savedDoc.content,
      createdBy: {
        _id: savedDoc.createdBy,
        username: 'Unknown',
        email: 'unknown@example.com'
      },
      roomId: savedDoc.roomId,
      isPublic: savedDoc.isPublic || false,
      collaborators: savedDoc.collaborators || [],
      version: savedDoc.version || 1,
      lastModified: savedDoc.lastModified || savedDoc.createdAt,
      metadata: {
        language: 'en',
        wordCount: savedDoc.content ? savedDoc.content.split(' ').length : 0,
        characterCount: savedDoc.content ? savedDoc.content.length : 0
      }
    };
    
    return res.json({
      success: true,
      document: document
    });
  } catch (error) {
    console.error('Error creating document:', error);
    return res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update document (make public/private)
app.put('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublic, title, content } = req.body;
    
    console.log('🔍 Updating document:', { id, isPublic, title });
    
    const updateData: any = {
      lastModified: new Date()
    };
    
    if (typeof isPublic === 'boolean') {
      updateData.isPublic = isPublic;
    }
    
    if (title) {
      updateData.title = title;
    }
    
    if (content !== undefined) {
      updateData.content = content;
    }
    
    const updatedDoc = await DocumentModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!updatedDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Get user info for the creator
    let creatorInfo: any = {
      _id: updatedDoc.createdBy,
      username: 'Unknown',
      email: 'unknown@example.com'
    };
    
    try {
      const user = await User.findById(updatedDoc.createdBy);
      if (user) {
        creatorInfo = {
          _id: user._id,
          username: user.username,
          email: user.email
        };
      }
    } catch (error) {
      console.log('Could not find user for document creator:', updatedDoc.createdBy);
    }
    
    const document = {
      id: (updatedDoc._id as any).toString(),
      title: updatedDoc.title,
      content: updatedDoc.content,
      createdBy: creatorInfo,
      roomId: updatedDoc.roomId,
      isPublic: updatedDoc.isPublic || false,
      collaborators: updatedDoc.collaborators || [],
      version: updatedDoc.version || 1,
      lastModified: updatedDoc.lastModified || updatedDoc.createdAt,
      metadata: {
        language: 'en',
        wordCount: updatedDoc.content ? updatedDoc.content.split(' ').length : 0,
        characterCount: updatedDoc.content ? updatedDoc.content.length : 0
      }
    };
    
    console.log('📄 Document updated:', document.id, 'isPublic:', document.isPublic);
    
    return res.json({
      success: true,
      document: document
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
app.delete('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 Deleting document:', id);
    
    const deletedDoc = await DocumentModel.findByIdAndDelete(id);
    
    if (!deletedDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    console.log('📄 Document deleted:', id);
    
    return res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Endpoint temporal para verificar token
app.get('/api/debug/token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json({ 
      decoded,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token', details: (error as Error).message });
  }
});

// ===== MIDDLEWARE =====

// Middleware para verificar si es admin
const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware para verificar si es admin o moderador
const requireModerator = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user || !['ADMIN', 'MODERATOR'].includes(user.role)) {
      return res.status(403).json({ error: 'Moderator or Admin access required' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ===== MODERATOR ENDPOINTS =====

// Silenciar usuario (para moderadores) - PERMANENTE
app.post('/api/moderator/users/:userId/mute', requireModerator, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    // Silenciado permanente - guardar fecha de silenciado
    const mutedAt = new Date();
    await User.findByIdAndUpdate(userId, {
      mutedUntil: new Date('2099-12-31'), // Fecha muy lejana para simular permanente
      muteReason: reason,
      mutedAt: mutedAt // Fecha cuando se silenció
    });
    
    return res.json({ 
      success: true, 
      message: 'User muted permanently',
      mutedAt: mutedAt // Mostrar fecha de silenciado
    });
  } catch (error) {
    console.error('Error muting user:', error);
    return res.status(500).json({ error: 'Failed to mute user' });
  }
});

// Desilenciar usuario (para moderadores)
app.post('/api/moderator/users/:userId/unmute', requireModerator, async (req, res) => {
  try {
    const { userId } = req.params;
    
    await User.findByIdAndUpdate(userId, {
      $unset: { mutedUntil: 1, muteReason: 1, mutedAt: 1 }
    });
    
    return res.json({ 
      success: true, 
      message: 'User unmuted successfully' 
    });
  } catch (error) {
    console.error('Error unmuting user:', error);
    return res.status(500).json({ error: 'Failed to unmute user' });
  }
});

// Ver usuarios silenciados (para moderadores)
app.get('/api/moderator/muted-users', requireModerator, async (req, res) => {
  try {
    const mutedUsers = await User.find({
      mutedUntil: { $exists: true, $ne: null }
    }).select('username mutedUntil muteReason mutedAt');
    
    return res.json({
      mutedUsers: mutedUsers.map((user: any) => ({
        userId: user._id.toString(),
        username: user.username,
        mutedUntil: null, // Siempre null para indicar permanente
        reason: user.muteReason || 'No reason provided'
      }))
    });
  } catch (error) {
    console.error('Error fetching muted users:', error);
    return res.status(500).json({ error: 'Failed to fetch muted users' });
  }
});

// ===== ADMIN ENDPOINTS =====

// Cambiar rol de usuario (TEMPORAL SIN AUTH)
app.put('/api/admin/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!['USER', 'MODERATOR', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json({ 
      success: true, 
      message: 'Role updated successfully',
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Eliminar grupo (TEMPORAL SIN AUTH)
app.delete('/api/admin/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Eliminar grupo
    const group = await Room.findByIdAndDelete(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Eliminar mensajes del grupo
    await Message.deleteMany({ roomId: groupId });
    
    // Eliminar archivos del grupo
    await File.deleteMany({ roomId: groupId });
    
    return res.json({ 
      success: true, 
      message: 'Group deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    return res.status(500).json({ error: 'Failed to delete group' });
  }
});

// Silenciar usuario (ADMIN) - PERMANENTE
app.post('/api/admin/users/:userId/mute', async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    // Silenciado permanente - guardar fecha de silenciado
    const mutedAt = new Date();
    await User.findByIdAndUpdate(userId, {
      mutedUntil: new Date('2099-12-31'), // Fecha muy lejana para simular permanente
      muteReason: reason,
      mutedAt: mutedAt // Fecha cuando se silenció
    });
    
    return res.json({ 
      success: true, 
      message: 'User muted permanently',
      mutedAt: mutedAt // Mostrar fecha de silenciado
    });
  } catch (error) {
    console.error('Error muting user:', error);
    return res.status(500).json({ error: 'Failed to mute user' });
  }
});

// Desilenciar usuario (TEMPORAL SIN AUTH)
app.post('/api/admin/users/:userId/unmute', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await User.findByIdAndUpdate(userId, {
      $unset: { mutedUntil: 1, muteReason: 1, mutedAt: 1 }
    });
    
    return res.json({ 
      success: true, 
      message: 'User unmuted successfully' 
    });
  } catch (error) {
    console.error('Error unmuting user:', error);
    return res.status(500).json({ error: 'Failed to unmute user' });
  }
});

// Obtener usuarios silenciados (sin autenticación para evitar problemas)
app.get('/api/admin/muted-users', async (req, res) => {
  try {
    const mutedUsers = await User.find({
      mutedUntil: { $exists: true, $ne: null }
    }).select('username mutedUntil muteReason mutedAt');
    
    return res.json({
      mutedUsers: mutedUsers.map((user: any) => ({
        userId: user._id.toString(),
        username: user.username,
        mutedUntil: null, // Siempre null para indicar permanente
        reason: user.muteReason || 'No reason provided'
      }))
    });
  } catch (error) {
    console.error('Error fetching muted users:', error);
    return res.status(500).json({ error: 'Failed to fetch muted users' });
  }
});

// Crear usuario silenciado de prueba (endpoint temporal)
app.post('/api/admin/create-muted-user', async (req, res) => {
  try {
    const { userId, duration, reason } = req.body;
    
    const mutedUntil = new Date(Date.now() + (duration * 1000));
    
    await User.findByIdAndUpdate(userId, {
      mutedUntil,
      muteReason: reason
    });
    
    return res.json({ 
      success: true, 
      message: 'User muted successfully',
      mutedUntil
    });
  } catch (error) {
    console.error('Error muting user:', error);
    return res.status(500).json({ error: 'Failed to mute user' });
  }
});

// Endpoint temporal sin autenticación para usuarios silenciados (SOLO PARA PRUEBAS)
app.get('/api/moderator/muted-users-public', async (req, res) => {
  try {
    const mutedUsers = await User.find({
      mutedUntil: { $exists: true, $ne: null }
    }).select('username mutedUntil muteReason mutedAt');
    
    return res.json({
      mutedUsers: mutedUsers.map((user: any) => ({
        userId: user._id.toString(),
        username: user.username,
        mutedUntil: null, // Siempre null para indicar permanente
        reason: user.muteReason || 'No reason provided'
      }))
    });
  } catch (error) {
    console.error('Error fetching muted users:', error);
    return res.status(500).json({ error: 'Failed to fetch muted users' });
  }
});

// Endpoint temporal sin autenticación para desilenciar usuarios (SOLO PARA PRUEBAS)
app.post('/api/moderator/users/:userId/unmute-public', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Desilenciar usuario
    user.mutedUntil = null as any;
    user.muteReason = null as any;
    user.mutedAt = null as any;
    await user.save();
    
    return res.json({ 
      success: true, 
      message: `User ${user.username} has been unmuted` 
    });
  } catch (error) {
    console.error('Error unmuting user:', error);
    return res.status(500).json({ error: 'Failed to unmute user' });
  }
});

// Debug endpoint para verificar token (TEMPORAL)
app.get('/api/debug/user-info', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json({ 
      decoded,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isOnline: user.isOnline
      }
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token', details: (error as Error).message });
  }
});

// Crear usuario administrador (endpoint temporal)
app.post('/api/admin/create-admin', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: 'ADMIN' });
    if (existingAdmin) {
      return res.json({ 
        success: true, 
        message: 'Admin user already exists',
        admin: {
          username: existingAdmin.username,
          email: existingAdmin.email,
          password: 'admin123'
        }
      });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = new User({
      username: 'admin',
      email: 'admin@chatplatform.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isOnline: false,
      lastSeen: new Date()
    });

    await adminUser.save();
    
    return res.json({ 
      success: true, 
      message: 'Admin user created successfully',
      admin: {
        username: adminUser.username,
        email: adminUser.email,
        password: 'admin123'
      }
    });
    
  } catch (error) {
    console.error('Error creating admin user:', error);
    return res.status(500).json({ error: 'Failed to create admin user' });
  }
});

// Crear usuario moderador (endpoint temporal)
app.post('/api/admin/create-moderator', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    
    // Check if moderator user already exists
    const existingModerator = await User.findOne({ username: 'moderator' });
    if (existingModerator) {
      return res.json({ 
        success: true, 
        message: 'Moderator user already exists',
        moderator: {
          username: existingModerator.username,
          email: existingModerator.email,
          password: 'mod123'
        }
      });
    }
    
    const hashedPassword = await bcrypt.hash('mod123', 10);
    const moderatorUser = new User({
      username: 'moderator',
      email: 'moderator@chatplatform.com',
      password: hashedPassword,
      firstName: 'Moderator',
      lastName: 'User',
      role: 'MODERATOR',
      isOnline: false,
      lastSeen: new Date()
    });

    await moderatorUser.save();
    
    return res.json({ 
      success: true, 
      message: 'Moderator user created successfully',
      moderator: {
        username: moderatorUser.username,
        email: moderatorUser.email,
        password: 'mod123'
      }
    });
    
  } catch (error) {
    console.error('Error creating moderator user:', error);
    return res.status(500).json({ error: 'Failed to create moderator user' });
  }
});

// Crear usuario silenciado para pruebas (TEMPORAL)
app.post('/api/admin/create-muted-user-test', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    
    // Check if muted user already exists
    const existingMutedUser = await User.findOne({ username: 'muteduser' });
    if (existingMutedUser) {
      return res.json({ 
        success: true, 
        message: 'Muted user already exists',
        user: {
          username: existingMutedUser.username,
          email: existingMutedUser.email,
          password: 'muted123'
        }
      });
    }
    
    const hashedPassword = await bcrypt.hash('muted123', 10);
    const mutedUser = new User({
      username: 'muteduser',
      email: 'muted@chatplatform.com',
      password: hashedPassword,
      firstName: 'Muted',
      lastName: 'User',
      role: 'USER',
      isOnline: false,
      lastSeen: new Date(),
      mutedUntil: new Date(Date.now() + 3600000), // 1 hora
      muteReason: 'Prueba de silenciamiento'
    });

    await mutedUser.save();
    return res.json({ 
      success: true, 
      message: 'Muted user created successfully',
      user: {
        id: mutedUser._id,
        username: mutedUser.username,
        role: mutedUser.role
      }
    });
  } catch (error) {
    console.error('Error creating muted user:', error);
    return res.status(500).json({ error: 'Failed to create muted user' });
  }
});

// Crear grupo como admin
app.post('/api/admin/groups', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const adminId = req.user?.id;
    
    if (!adminId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const group = await groupService.createGroup({
      name,
      description: description || '',
      ownerId: adminId
    });
    
    return res.json({ 
      success: true, 
      message: 'Group created successfully',
      group: {
        id: group._id.toString(),
        name: group.name,
        description: group.description,
        members: group.members,
        createdAt: group.createdAt,
        ownerId: group.ownerId
      }
    });
  } catch (error) {
    console.error('Error creating group:', error);
    return res.status(500).json({ error: 'Failed to create group' });
  }
});

app.get('/api/users/debug', async (req, res) => {
  try {
    const users = await User.find({}).select('username email role isOnline lastSeen');
    return res.json({ 
      count: users.length,
      users: users.map((user: any) => ({
        id: (user._id as any).toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Debug endpoint for messages
app.get('/api/messages/debug', async (req, res) => {
  try {
    const messages = await Message.find({}).populate('senderId', 'username').populate('roomId', 'name');
    return res.json({ 
      count: messages.length,
      messages: messages.map((msg: any) => ({
        id: (msg._id as any).toString(),
        content: msg.content,
        senderId: msg.senderId,
        roomId: msg.roomId,
        timestamp: msg.timestamp,
        type: msg.type
      }))
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Debug endpoint for files
app.get('/api/files/debug', async (req, res) => {
  try {
    const files = await File.find({}).populate('uploadedBy', 'username').populate('roomId', 'name');
    return res.json({ 
      count: files.length,
      files: files.map((file: any) => ({
        id: (file._id as any).toString(),
        filename: file.filename,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        uploadedBy: file.uploadedBy,
        roomId: file.roomId,
        uploadedAt: file.uploadedAt,
        isPublic: file.isPublic
      }))
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Create sample messages for all groups
app.post('/api/messages/create-samples', async (req, res) => {
  try {
    // Get all groups
    const groups = await Room.find({});
    console.log(`Found ${groups.length} groups`);

    // Get a user to send messages
    const user = await User.findOne({});
    if (!user) {
      return res.status(400).json({ error: 'No users found' });
    }

    console.log(`Using sender: ${user.username} (${user._id})`);

    let totalCreated = 0;

    // Create sample messages for each group
    for (const group of groups) {
      console.log(`Creating messages for group: ${group.name} (${group._id})`);
      
      const sampleMessages = [
        `Welcome to ${group.name}! 👋`,
        `This is a sample message in ${group.name}.`,
        `You can start chatting here! 💬`,
        `Group created on ${group.createdAt?.toLocaleDateString() || 'recently'}.`,
        `This group has ${group.members?.length || 0} members.`
      ];

      for (const content of sampleMessages) {
        const message = new Message({
          content,
          senderId: user._id,
          roomId: group._id,
          timestamp: new Date(),
          type: 'text'
        });

        await message.save();
        totalCreated++;
        console.log(`Created message: "${content}"`);
      }
    }

    console.log(`Sample messages created successfully! Total: ${totalCreated}`);
    
    return res.json({
      success: true,
      message: `Created ${totalCreated} sample messages for ${groups.length} groups`,
      totalCreated,
      groupsProcessed: groups.length
    });
    
  } catch (error) {
    console.error('Error creating sample messages:', error);
    return res.status(500).json({ error: 'Failed to create sample messages' });
  }
});

app.post('/api/auth/debug-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    
    // For debug purposes, return user info without password check
    return res.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role
      },
      message: 'Debug login successful (no password check)'
    });
  } catch (error) {
    console.error('Error in debug login:', error);
    return res.status(500).json({ error: 'Debug login failed' });
  }
});

app.get('/api/documents/debug-with-user', async (req, res) => {
  try {
    // Use the known user ID for testing
    const userId = '68d407fad9c0872843a12631';
    
    // Get user's documents
    const userDocs = await DocumentModel.find({ createdBy: userId });
    
    // Get public documents
    const publicDocs = await DocumentModel.find({ isPublic: true });
    
    // Combine and deduplicate
    const allDocs = [...userDocs];
    publicDocs.forEach((doc: any) => {
      if (!allDocs.find((d: any) => (d._id as any).toString() === (doc._id as any).toString())) {
        allDocs.push(doc);
      }
    });
    
    return res.json({
      success: true,
      userId,
      documents: allDocs.map((doc: any) => ({
        id: (doc._id as any).toString(),
        title: doc.title,
        createdBy: doc.createdBy,
        isPublic: doc.isPublic,
        createdAt: doc.createdAt || new Date(),
        collaborators: doc.collaborators || []
      }))
    });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    return res.status(500).json({ error: 'Failed to fetch user documents' });
  }
});

// Initialize services
const groupService = new GroupServiceMongo();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/documents', documentRoutes);
// app.use('/api/checksum', checksumRoutes);
// app.use('/api/versions', versionControlRoutes);


// Chat endpoints for frontend compatibility
app.get('/api/groups', async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    
    const result = await groupService.getAllGroups({
      page: Number(page),
      limit: Number(limit),
      type: type as string
    });

    // Transform groups to match frontend expectations
    const transformedGroups = result.groups.map((group: any) => ({
      id: group._id.toString(),
      name: group.name,
      description: group.description || '',
      memberCount: group.members.length,
      ownerId: group.ownerId,
      admins: group.admins,
      members: group.members,
      createdAt: group.createdAt.toISOString(),
      settings: group.settings
    }));

    return res.json({ groups: transformedGroups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Add member to group
app.post('/api/groups/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const group = await Room.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is already a member
    if (group.members.includes(userId)) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }
    
    // Add user to group
    group.members.push(userId);
    await group.save();
    
    // Emit to all connected clients
    io.emit('group-updated', {
      groupId: group._id.toString(),
      action: 'member-added',
      userId: userId,
      memberCount: group.members.length
    });
    
    return res.json({ 
      success: true, 
      message: 'User added to group successfully',
      memberCount: group.members.length
    });
  } catch (error) {
    console.error('Error adding member to group:', error);
    return res.status(500).json({ error: 'Failed to add member to group' });
  }
});

// Remove member from group
app.delete('/api/groups/:groupId/members/:userId', async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    
    const group = await Room.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is a member
    if (!group.members.includes(userId)) {
      return res.status(400).json({ error: 'User is not a member of this group' });
    }
    
    // Remove user from group
    group.members = group.members.filter(memberId => memberId !== userId);
    await group.save();
    
    // Emit to all connected clients
    io.emit('group-updated', {
      groupId: group._id.toString(),
      action: 'member-removed',
      userId: userId,
      memberCount: group.members.length
    });
    
    return res.json({ 
      success: true, 
      message: 'User removed from group successfully',
      memberCount: group.members.length
    });
  } catch (error) {
    console.error('Error removing member from group:', error);
    return res.status(500).json({ error: 'Failed to remove member from group' });
  }
});

// Leave group
app.post('/api/groups/:groupId/leave', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const group = await Room.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is a member
    if (!group.members.includes(userId)) {
      return res.status(400).json({ error: 'User is not a member of this group' });
    }
    
    // Check if user is the owner
    if (group.ownerId === userId) {
      return res.status(400).json({ error: 'Group owner cannot leave the group. Transfer ownership or delete the group instead.' });
    }
    
    // Remove user from group
    group.members = group.members.filter(memberId => memberId !== userId);
    // Also remove from admins if they are admin
    group.admins = group.admins.filter(adminId => adminId !== userId);
    await group.save();
    
    // Emit to all connected clients
    io.emit('group-updated', {
      groupId: group._id.toString(),
      action: 'member-left',
      userId: userId,
      memberCount: group.members.length
    });
    
    return res.json({ 
      success: true, 
      message: 'Successfully left the group',
      memberCount: group.members.length
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    return res.status(500).json({ error: 'Failed to leave group' });
  }
});

// Delete group (admin only)
app.delete('/api/admin/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const group = await Room.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Delete all messages in this group
    await Message.deleteMany({ roomId: groupId });
    
    // Delete all files in this group
    await File.deleteMany({ roomId: groupId });
    
    // Delete the group itself
    await Room.findByIdAndDelete(groupId);
    
    // Emit to all connected clients
    io.emit('group-deleted', {
      groupId: groupId,
      groupName: group.name
    });
    
    return res.json({ 
      success: true, 
      message: `Group "${group.name}" deleted successfully`,
      deletedGroup: {
        id: groupId,
        name: group.name,
        memberCount: group.members.length
      }
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    return res.status(500).json({ error: 'Failed to delete group' });
  }
});

// System statistics endpoint (admin only)
app.get('/api/admin/stats', async (req, res) => {
  try {
    const authTokens = req.headers.authorization?.replace('Bearer ', '');
    if (!authTokens) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Get counts from database
    const [
      totalUsers,
      totalGroups,
      totalMessages,
      totalFiles,
      onlineUsers
    ] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments(),
      Message.countDocuments(),
      File.countDocuments(),
      User.countDocuments({ isOnline: true })
    ]);

    // Get recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentMessages = await Message.countDocuments({
      timestamp: { $gte: yesterday }
    });

    const recentFiles = await File.countDocuments({
      uploadedAt: { $gte: yesterday }
    });

    // Get top groups by member count
    const topGroups = await Room.find({})
      .sort({ members: -1 })
      .limit(5)
      .select('name memberCount members')
      .lean();

    // Get user registration trend (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalGroups,
        totalMessages,
        totalFiles,
        onlineUsers,
        recentActivity: {
          messagesLast24h: recentMessages,
          filesLast24h: recentFiles,
          newUsersThisWeek
        },
        topGroups: topGroups.map(group => ({
          name: group.name,
          memberCount: group.members?.length || 0
        }))
      }
    });
  } catch (error) {
    console.error('Error getting system stats:', error);
    return res.status(500).json({ error: 'Failed to get system statistics' });
  }
});

// Clean duplicate groups (admin only)
app.post('/api/admin/clean-general-groups', async (req, res) => {
  try {
    // Find all General groups
    const generalGroups = await Room.find({ name: 'General' });
    console.log(`Found ${generalGroups.length} General groups to delete`);
    
    generalGroups.forEach((group, index) => {
      const memberCount = group.members ? group.members.length : 0;
      console.log(`General ${index + 1}: ID=${group._id}, Description="${group.description}", Members=${memberCount}, Owner=${group.ownerId}`);
    });
    
    // Delete all General groups
    const deleteResult = await Room.deleteMany({ name: 'General' });
    console.log(`Deleted ${deleteResult.deletedCount} General groups`);
    
    // Also clean up related messages
    for (const group of generalGroups) {
      const messageDeleteResult = await Message.deleteMany({ roomId: group._id.toString() });
      console.log(`Deleted ${messageDeleteResult.deletedCount} messages for group ${group._id}`);
      // Note: We won't delete files as they might be shared across groups
    }
    
    return res.json({
      success: true,
      deletedGroups: deleteResult.deletedCount,
      message: `Successfully deleted ${deleteResult.deletedCount} General groups. Detailed: ${generalGroups.length} found, ${deleteResult.deletedCount} deleted. The system will recreate them automatically.`,
      details: generalGroups.map(g => ({
        id: g._id.toString(),
        description: g.description,
        memberCount: g.members ? g.members.length : 0,
        ownerId: g.ownerId
      }))
    });
  } catch (error) {
    console.error('Error cleaning General groups:', error);
    return res.status(500).json({ error: 'Failed to clean General groups' });
  }
});

app.post('/api/admin/clean-duplicates', async (req, res) => {
  try {
    // Get all groups
    const groups = await Room.find({});
    
    // Group by name and owner
    const groupMap = new Map();
    const duplicates: any[] = [];
    
    groups.forEach(group => {
      const key = `${group.name}-${group.ownerId}`;
      if (groupMap.has(key)) {
        duplicates.push(group);
      } else {
        groupMap.set(key, group);
      }
    });
    
    // Delete duplicate groups (keep the oldest one)
    const deletedGroups: any[] = [];
    for (const duplicate of duplicates) {
      await Room.findByIdAndDelete(duplicate._id);
      deletedGroups.push({
        id: duplicate._id.toString(),
        name: duplicate.name,
        ownerId: duplicate.ownerId
      });
    }
    
    return res.json({
      success: true,
      message: `Cleaned ${deletedGroups.length} duplicate groups`,
      deletedGroups
    });
  } catch (error) {
    console.error('Error cleaning duplicates:', error);
    return res.status(500).json({ error: 'Failed to clean duplicates' });
  }
});

// Update group details (name/description)
app.put('/api/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body || {};

    if (!name && typeof description === 'undefined') {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const update: any = {};
    if (typeof name === 'string' && name.trim().length > 0) update.name = name.trim();
    if (typeof description === 'string') update.description = description;

    const updated = await Room.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Group not found' });

    return res.json({
      success: true,
      group: {
        id: updated._id.toString(),
        name: updated.name,
        description: updated.description || '',
        ownerId: updated.ownerId,
        admins: updated.admins || [],
        members: updated.members || [],
        createdAt: updated.createdAt,
        settings: updated.settings,
      },
      message: 'Group updated successfully'
    });
  } catch (error) {
    console.error('Error updating group:', error);
    return res.status(500).json({ error: 'Failed to update group' });
  }
});

app.get('/api/groups/:groupId/messages', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Get messages from database using groupService
    const result = await groupService.getGroupMessages(groupId, {
      page: Number(page),
      limit: Number(limit)
    });

    // Transform messages to match frontend expectations
    const transformedMessages = result.messages.map((msg: any) => ({
      _id: msg._id.toString(),
      content: msg.content,
      senderId: msg.senderId,
      senderName: 'Unknown', // Will be populated from user data if needed
      timestamp: msg.timestamp.toISOString(),
      type: msg.type || 'text'
    }));

    return res.json({ messages: transformedMessages });
  } catch (error) {
    console.error('Error loading group messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get private messages endpoint
app.get('/api/messages/private/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Get private messages from database
    const messages = await Message.find({
      $or: [
        { roomId: `private_${userId}` },
        { roomId: `private_${req.query.currentUserId}` } // Messages sent to current user
      ]
    })
    .sort({ timestamp: -1 })
    .limit(Number(limit) * Number(page))
    .skip((Number(page) - 1) * Number(limit));

    // Transform messages to match frontend expectations
    const transformedMessages = messages.map((msg: any) => ({
      _id: msg._id.toString(),
      content: msg.content,
      senderId: msg.senderId,
      senderName: 'Unknown', // Will be populated from user data if needed
      timestamp: msg.timestamp.toISOString(),
      type: msg.type || 'text'
    }));

    return res.json({ messages: transformedMessages });
  } catch (error) {
    console.error('Error loading private messages:', error);
    return res.status(500).json({ error: 'Failed to fetch private messages' });
  }
});

// Health endpoint without /api prefix for compatibility
app.get('/health', (req, res) => {
  return res.json({ status: 'OK', message: 'Server is running' });
});

// Message endpoints
app.post('/api/messages/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content, senderId, senderName } = req.body;
    
    // Verificar si el usuario está silenciado
    if (senderId && senderId !== 'unknown') {
      const user = await User.findById(senderId);
      if (user && user.mutedUntil) {
        // Log muted user attempting to send message
        logAdmin.userMuted(user._id.toString(), user.username, 'system', 'Attempted to send message while muted');
        
        return res.status(403).json({ 
          error: 'User muted',
          message: 'No puedes enviar mensajes porque estás silenciado'
        });
      }
    }
    
    // Create and save message to database
    const message = new Message({
      content,
      senderId: senderId || 'unknown',
      roomId: groupId,
      timestamp: new Date(),
      type: 'text'
    });
    
    await message.save();
    
    // Transform for frontend
    const transformedMessage = {
      id: message._id.toString(),
      content: message.content,
      senderId: message.senderId,
      senderName: senderName || 'Anonymous',
      timestamp: message.timestamp.toISOString(),
      type: 'TEXT'
    };
    
    // Broadcast to all clients in the group via Socket.IO
    io.emit('new-message', {
      groupId,
      message: transformedMessage
    });
    
    return res.json({ 
      success: true, 
      message: 'Message sent successfully',
      data: transformedMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// Private message endpoint
app.post('/api/messages/private/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { content, senderId, senderName } = req.body;
    
    // Verificar si el usuario está silenciado
    if (senderId && senderId !== 'unknown') {
      const user = await User.findById(senderId);
      if (user && user.mutedUntil) {
        // Log muted user attempting to send message
        logAdmin.userMuted(user._id.toString(), user.username, 'system', 'Attempted to send message while muted');
        
        return res.status(403).json({ 
          error: 'User muted',
          message: 'No puedes enviar mensajes porque estás silenciado'
        });
      }
    }
    
    // Create and save private message to database
    const message = new Message({
      content,
      senderId: senderId || 'unknown',
      roomId: `private_${userId}`, // Use a special format for private messages
      timestamp: new Date(),
      type: 'text'
    });
    
    await message.save();
    
    // Transform for frontend
    const transformedMessage = {
      id: message._id.toString(),
      content: message.content,
      senderId: message.senderId,
      senderName: senderName || 'Anonymous',
      timestamp: message.timestamp.toISOString(),
      type: 'TEXT'
    };
    
    // Broadcast to specific user via Socket.IO
    io.emit('new-private-message', {
      userId,
      message: transformedMessage
    });
    
    return res.json({ 
      success: true, 
      message: 'Private message sent successfully',
      data: transformedMessage
    });
  } catch (error) {
    console.error('Error sending private message:', error);
    return res.status(500).json({ error: 'Failed to send private message' });
  }
});

// Create group endpoint
app.post('/api/groups', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }
    
    // Get user ID from Authorization header
    const authHeader = req.headers.authorization;
    console.log('🔍 Auth header received:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid auth header');
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    const token = authHeader.substring(7);
    console.log('🔍 Token extracted:', token.substring(0, 50) + '...');
    console.log('🔍 JWT_SECRET being used:', JWT_SECRET);
    let userId;
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      userId = decoded.id;
      console.log('✅ Token verified successfully for user:', userId);
    } catch (error) {
      console.error('❌ Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
      console.log('🔍 JWT_SECRET being used:', JWT_SECRET);
      console.log('🔍 Token being verified:', token.substring(0, 50) + '...');
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Create group in database
    const group = await groupService.createGroup({
      name,
      description,
      type: 'group',
      ownerId: userId
    });
    
    // Transform group to match frontend expectations
    const transformedGroup = {
      id: group._id.toString(),
      name: group.name,
      description: group.description || '',
      memberCount: group.members.length,
      admins: group.admins,
      createdAt: group.createdAt.toISOString(),
      settings: group.settings
    };
    
    return res.json({ 
      success: true, 
      message: 'Group created successfully',
      group: transformedGroup
    });
  } catch (error) {
    console.error('Error creating group:', error);
    return res.status(500).json({ error: 'Failed to create group' });
  }
});

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log(`User connected with socket ID: ${socket.id}`);
  logSystem.socketConnected(socket.id);

  // Join room
  socket.on('join-room', async (roomId) => {
    try {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
      
      // Notify others in the room
      socket.to(roomId).emit('user-joined', { socketId: socket.id });
    } catch (error) {
      console.error('Error joining room:', error);
    }
  });

  // Leave room
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('user-left', { socketId: socket.id });
  });

  // Send message
  socket.on('send-message', async (data) => {
    try {
      const { roomId, content, senderId, senderName } = data;
      
      // Save message to database
      const message = new Message({
        content,
        sender: senderId,
        room: roomId,
        timestamp: new Date()
      });
      
      await message.save();
      
      // Broadcast to room
      io.to(roomId).emit('new-message', {
        id: message._id,
        content,
        senderId,
        senderName,
        timestamp: message.timestamp
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  // Collaborative editing handlers
  socket.on('join-document', async (data) => {
    try {
      const { documentId, userId } = data;
      console.log(`User ${userId} attempting to join document ${documentId}`);
      
      const success = await CollaborativeEditingService.joinDocument(documentId, userId);
      
      if (success) {
        socket.join(`document-${documentId}`);
        socket.to(`document-${documentId}`).emit('user-joined-document', { userId });
        
        // Send confirmation to the user who joined
        socket.emit('join-document-success', { 
          documentId, 
          userId, 
          message: 'Successfully joined document' 
        });
        
        console.log(`User ${userId} successfully joined document ${documentId}`);
      } else {
        socket.emit('join-document-error', { 
          documentId, 
          userId, 
          error: 'Failed to join document' 
        });
        console.log(`User ${userId} failed to join document ${documentId}`);
      }
    } catch (error) {
      console.error('Error joining document:', error);
      socket.emit('join-document-error', { 
        documentId: data.documentId, 
        userId: data.userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  socket.on('leave-document', async (data) => {
    try {
      const { documentId, userId } = data;
      await CollaborativeEditingService.leaveDocument(documentId, userId);
      socket.leave(`document-${documentId}`);
      socket.to(`document-${documentId}`).emit('user-left-document', { userId });
    } catch (error) {
      console.error('Error leaving document:', error);
    }
  });

  socket.on('document-operation', async (data) => {
    try {
      const { documentId, operation, userId } = data;
      const result = await CollaborativeEditingService.applyOperation(documentId, operation);
      
      if (result.success) {
        socket.to(`document-${documentId}`).emit('document-operation', {
          operation: operation,
          userId: userId,
          timestamp: new Date(),
          newContent: result.newContent,
          version: result.version
        });
      }
    } catch (error) {
      console.error('Error applying document operation:', error);
    }
  });

  socket.on('request-document-state', async (data) => {
    try {
      const { documentId, userId } = data;
      const state = await CollaborativeEditingService.getDocumentState(documentId, userId);
      
      if (state) {
        socket.emit('document-state', state);
      }
    } catch (error) {
      console.error('Error getting document state:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    logSystem.socketDisconnected(socket.id);
  });
});

// ===== LOGS ENDPOINTS =====

// Get logs for admin panel
app.get('/api/admin/logs', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { 
      level, 
      category, 
      action, 
      userId, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 50 
    } = req.query;

    // Construir filtros
    const filters: any = {};
    
    if (level && level !== 'all') {
      filters.level = level;
    }
    
    if (category && category !== 'all') {
      filters.category = category;
    }
    
    if (action) {
      filters.action = { $regex: action, $options: 'i' };
    }
    
    if (userId) {
      filters.userId = userId;
    }
    
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) {
        filters.timestamp.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filters.timestamp.$lte = new Date(endDate as string);
      }
    }

    // Paginación
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const skip = (pageNum - 1) * limitNum;

    // Obtener logs
    const logs = await Log.find(filters)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Contar total
    const total = await Log.countDocuments(filters);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      filters: {
        level,
        category,
        action,
        userId,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Error fetching logs' });
  }
});

// Get log statistics
app.get('/api/admin/logs/stats', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Filtros de fecha
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.timestamp = {};
      if (startDate) {
        dateFilter.timestamp.$gte = new Date(startDate as string);
      }
      if (endDate) {
        dateFilter.timestamp.$lte = new Date(endDate as string);
      }
    } else {
      // Por defecto, últimas 24 horas
      dateFilter.timestamp = {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      };
    }

    // Agregaciones
    const [levelStats, categoryStats, actionStats, recentErrors] = await Promise.all([
      // Estadísticas por nivel
      Log.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$level', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Estadísticas por categoría
      Log.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Top acciones
      Log.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Errores recientes
      Log.find({ ...dateFilter, level: 'error' })
        .sort({ timestamp: -1 })
        .limit(5)
        .lean()
    ]);

    res.json({
      levelStats,
      categoryStats,
      actionStats,
      recentErrors,
      period: {
        startDate: dateFilter.timestamp?.$gte || new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: dateFilter.timestamp?.$lte || new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({ error: 'Error fetching log statistics' });
  }
});

// Start server
server.listen(PORT, () => {
  logSystem.serverStarted(PORT);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`🔗 API endpoints available at http://localhost:${PORT}/api`);
});