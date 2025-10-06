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
import { User, Message, Room } from './models';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Connect to MongoDB Atlas
connectDB();

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
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
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
app.use(morgan('combined'));

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

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create new user
    const user = new User({
      username,
      email,
      password, // In production, hash this password
      firstName,
      lastName,
      role: 'USER'
    });
    
    await user.save();
    
    return res.json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      tokens: { 
        accessToken: 'jwt-token-here', 
        refreshToken: 'refresh-token-here' 
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // In production, verify password hash
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();
    
    return res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      tokens: { 
        accessToken: 'jwt-token-here', 
        refreshToken: 'refresh-token-here' 
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user endpoint
app.get('/api/auth/me', async (req, res) => {
  try {
    // In production, verify JWT token
    // For now, return a mock user
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

// Socket.io connection handling
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
const PORT = 3003; // Fixed port
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
