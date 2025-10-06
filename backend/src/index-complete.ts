import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import * as dotenv from 'dotenv';
import { connectDB } from './config/mongodb-atlas';
import { User, Message, Room, File, DocumentModel } from './models';
import fileRoutes from './routes/file';
import documentRoutes from './routes/document';
import authRoutes from './routes/auth';
import { initGridFS } from './services/fileService';
import { CollaborativeEditingService } from './services/collaborativeEditingService';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Connect to MongoDB Atlas
connectDB();

// Initialize GridFS after database connection
setTimeout(() => {
  try {
    initGridFS();
    console.log('✅ GridFS initialized successfully');
  } catch (error) {
    console.error('❌ GridFS initialization failed:', error);
  }
}, 2000); // Wait 2 seconds for DB connection

// Socket.io configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:3001", "http://localhost:3003"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrcAttr: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('dev'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: 'MongoDB Atlas',
    port: 3003
  });
});

// ==================== AUTHENTICATION ROUTES ====================

// Auth routes are handled by auth.ts - remove hardcoded routes

// Get current user
app.get('/api/auth/me', async (req, res) => {
  try {
    // For now, return the first online user (in production, verify JWT token)
    const user = await User.findOne({ isOnline: true });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== GROUP ROUTES ====================

// Create group
app.post('/api/groups', async (req, res) => {
  try {
    const { name, description, type = 'group' } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Create new group
    const group = new Room({
      name,
      description,
      type,
      ownerId: 'current-user-id', // In production, get from JWT
      members: ['current-user-id'],
      admins: ['current-user-id'],
      settings: {
        maxMembers: 100,
        allowFileUpload: true,
        allowAnonymous: false
      }
    });
    
    await group.save();
    
    return res.json({
      message: 'Group created successfully',
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        type: group.type,
        ownerId: group.ownerId,
        members: group.members,
        admins: group.admins,
        settings: group.settings,
        createdAt: group.createdAt
      }
    });
  } catch (error) {
    console.error('Create group error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all groups
app.get('/api/groups', async (req, res) => {
  try {
    const groups = await Room.find({ type: 'group' })
      .populate('ownerId', 'username email')
      .populate('members', 'username email')
      .sort({ createdAt: -1 });
    
    return res.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group by ID
app.get('/api/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Room.findById(id)
      .populate('ownerId', 'username email')
      .populate('members', 'username email')
      .populate('admins', 'username email');
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    return res.json({ group });
  } catch (error) {
    console.error('Get group error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Join group
app.post('/api/groups/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = 'current-user-id'; // In production, get from JWT
    
    const group = await Room.findById(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    if (group.members.includes(userId)) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }
    
    group.members.push(userId);
    await group.save();
    
    return res.json({ message: 'Joined group successfully' });
  } catch (error) {
    console.error('Join group error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Leave group
app.post('/api/groups/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = 'current-user-id'; // In production, get from JWT
    
    const group = await Room.findById(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    group.members = group.members.filter(memberId => memberId !== userId);
    group.admins = group.admins.filter(adminId => adminId !== userId);
    await group.save();
    
    return res.json({ message: 'Left group successfully' });
  } catch (error) {
    console.error('Leave group error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group messages
app.get('/api/groups/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await Message.find({ roomId: id })
      .populate('senderId', 'username email')
      .sort({ timestamp: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));
    
    return res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get group messages error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== MESSAGE ROUTES ====================

// Send group message
app.post('/api/messages/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content, type = 'TEXT' } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    // Get a random user as sender (for testing)
    const randomUser = await User.findOne({ isOnline: true });
    const senderId = randomUser?._id || 'anonymous';
    
    const message = new Message({
      roomId: groupId,
      senderId: senderId.toString(),
      content,
      type
    });
    
    await message.save();
    
    return res.json({
      message: 'Message sent successfully',
      messageData: {
        id: message._id,
        content: message.content,
        senderId: message.senderId,
        senderName: randomUser?.username || 'Anonymous',
        timestamp: message.timestamp,
        type: message.type
      }
    });
  } catch (error) {
    console.error('Send group message error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Send private message
app.post('/api/messages/private', async (req, res) => {
  try {
    const { receiverId, content, type = 'TEXT' } = req.body;
    const senderId = 'current-user-id'; // In production, get from JWT
    
    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Receiver ID and content are required' });
    }
    
    const message = new Message({
      roomId: `private-${senderId}-${receiverId}`,
      senderId,
      content,
      type
    });
    
    await message.save();
    
    // Get sender info
    const sender = await User.findById(senderId);
    
    return res.json({
      message: 'Private message sent successfully',
      messageData: {
        id: message._id,
        content: message.content,
        senderId: message.senderId,
        senderName: sender?.username || 'Anonymous',
        timestamp: message.timestamp,
        type: message.type
      }
    });
  } catch (error) {
    console.error('Send private message error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== USER ROUTES ====================

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 })
      .sort({ username: 1 });
    
    return res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get online users
app.get('/api/users/online', async (req, res) => {
  try {
    const onlineUsers = await User.find({ isOnline: true }, { password: 0 })
      .sort({ username: 1 });
    
    return res.json({ users: onlineUsers });
  } catch (error) {
    console.error('Get online users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== FILE ROUTES ====================

// Use file routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/documents', documentRoutes);

// ==================== SOCKET.IO HANDLERS ====================

io.on('connection', (socket) => {
  console.log(`User connected with socket ID: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });

  // Join group
  socket.on('join-group', (groupId) => {
    socket.join(groupId);
    console.log(`Socket ${socket.id} joined group: ${groupId}`);
    socket.emit('joined-group', { groupId });
  });

  // Leave group
  socket.on('leave-group', (groupId) => {
    socket.leave(groupId);
    console.log(`Socket ${socket.id} left group: ${groupId}`);
  });

  // ==================== COLLABORATIVE EDITING EVENTS ====================

  // Join document for collaborative editing
  socket.on('join-document', async (data) => {
    try {
      const { documentId, userId } = data;
      const success = await CollaborativeEditingService.joinDocument(documentId, userId);
      
      if (success) {
        socket.join(`document-${documentId}`);
        socket.emit('joined-document', { documentId, success: true });
        
        // Notify other users in the document
        socket.to(`document-${documentId}`).emit('user-joined-document', { 
          userId, 
          documentId 
        });
        
        console.log(`User ${userId} joined document: ${documentId}`);
      } else {
        socket.emit('joined-document', { documentId, success: false });
      }
    } catch (error) {
      console.error('Error joining document:', error);
      socket.emit('joined-document', { success: false, error: 'Failed to join document' });
    }
  });

  // Leave document
  socket.on('leave-document', async (data) => {
    try {
      const { documentId, userId } = data;
      await CollaborativeEditingService.leaveDocument(documentId, userId);
      
      socket.leave(`document-${documentId}`);
      socket.emit('left-document', { documentId });
      
      // Notify other users in the document
      socket.to(`document-${documentId}`).emit('user-left-document', { 
        userId, 
        documentId 
      });
      
      console.log(`User ${userId} left document: ${documentId}`);
    } catch (error) {
      console.error('Error leaving document:', error);
    }
  });

  // Handle collaborative editing operations
  socket.on('document-operation', async (data) => {
    try {
      const { documentId, operation, userId } = data;
      
      const result = await CollaborativeEditingService.applyOperation(documentId, {
        ...operation,
        userId,
        timestamp: new Date()
      });
      
      if (result.success) {
        // Broadcast operation to all users in the document (except sender)
        socket.to(`document-${documentId}`).emit('document-operation-applied', {
          documentId,
          operation: {
            ...operation,
            userId,
            timestamp: new Date()
          },
          newContent: result.newContent,
          version: result.version
        });
        
        // Send confirmation to sender
        socket.emit('operation-confirmed', {
          documentId,
          operationId: operation.id,
          success: true,
          version: result.version
        });
        
        console.log(`Operation applied to document ${documentId} by user ${userId}`);
      } else {
        socket.emit('operation-confirmed', {
          documentId,
          operationId: operation.id,
          success: false,
          error: 'Failed to apply operation'
        });
      }
    } catch (error) {
      console.error('Error handling document operation:', error);
      socket.emit('operation-confirmed', {
        documentId: data.documentId,
        operationId: data.operation.id,
        success: false,
        error: 'Server error'
      });
    }
  });

  // Request document state
  socket.on('request-document-state', async (data) => {
    try {
      const { documentId, userId } = data;
      const state = await CollaborativeEditingService.getDocumentState(documentId, userId);
      
      if (state) {
        socket.emit('document-state', { documentId, state });
      } else {
        socket.emit('document-state-error', { 
          documentId, 
          error: 'Document not found or access denied' 
        });
      }
    } catch (error) {
      console.error('Error getting document state:', error);
      socket.emit('document-state-error', { 
        documentId: data.documentId, 
        error: 'Server error' 
      });
    }
  });

  // Send group message
  socket.on('send-group-message', async (data) => {
    try {
      console.log('Group message received:', data);
      
      const { groupId, content, type, senderId } = data;
      
      // Save message to MongoDB Atlas
      const message = new Message({
        roomId: groupId || 'general',
        senderId: senderId || 'anonymous',
        content: content,
        type: type || 'TEXT'
      });
      
      await message.save();
      
      // Get sender info
      const sender = await User.findById(senderId);
      
      // Broadcast message to all clients in the group
      io.to(groupId || 'general').emit('group-message', {
        id: message._id,
        content: message.content,
        senderId: message.senderId,
        senderName: sender?.username || 'Anonymous',
        timestamp: message.timestamp,
        type: message.type
      });
      
      console.log(`Message broadcasted to group ${groupId}`);
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Send private message
  socket.on('send-private-message', async (data) => {
    try {
      console.log('Private message received:', data);
      
      const { receiverId, content, type, senderId } = data;
      
      // Save message to MongoDB Atlas
      const message = new Message({
        roomId: `private-${senderId}-${receiverId}`,
        senderId: senderId || 'anonymous',
        content: content,
        type: type || 'TEXT'
      });
      
      await message.save();
      
      // Get sender info
      const sender = await User.findById(senderId);
      
      // Send to receiver
      socket.to(receiverId).emit('private-message-received', {
        id: message._id,
        content: message.content,
        senderId: message.senderId,
        senderName: sender?.username || 'Anonymous',
        timestamp: message.timestamp,
        type: message.type
      });
      
      // Confirm to sender
      socket.emit('private-message-sent', {
        id: message._id,
        content: message.content,
        receiverId: receiverId,
        timestamp: message.timestamp
      });
      
    } catch (error) {
      console.error('Error saving private message:', error);
      socket.emit('error', { message: 'Failed to send private message' });
    }
  });

  // Typing indicators
  socket.on('typing-start', (data) => {
    const { groupId, receiverId, senderId } = data;
    if (groupId) {
      socket.to(groupId).emit('user-typing', {
        userId: senderId,
        groupId: groupId
      });
    } else if (receiverId) {
      socket.to(receiverId).emit('user-typing', {
        userId: senderId,
        receiverId: receiverId
      });
    }
  });

  socket.on('typing-stop', (data) => {
    const { groupId, receiverId, senderId } = data;
    if (groupId) {
      socket.to(groupId).emit('user-stopped-typing', {
        userId: senderId,
        groupId: groupId
      });
    } else if (receiverId) {
      socket.to(receiverId).emit('user-stopped-typing', {
        userId: senderId,
        receiverId: receiverId
      });
    }
  });
});

// Error handling middleware
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.method} ${req.path} does not exist`
  });
});

// Server configuration
const PORT = 3003;
const HOST = 'localhost';

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📡 Socket.io server ready for connections`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ Database: MongoDB Atlas`);
  console.log(`📊 Max connections: ${process.env.MAX_CONNECTIONS || 1000}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export { app, server, io };
