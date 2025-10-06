import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken, TokenPayload } from '../utils/auth';
import prisma from '../config/database';
import { MessageService } from '../services/messageService';
import { DocumentService } from '../services/documentService';

interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
}

export const setupSocketHandlers = (io: SocketIOServer): void => {
  // Authentication middleware for socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyAccessToken(token) as TokenPayload;
      
      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, username: true, email: true, role: true, isOnline: true }
      });

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      };

      // Update user online status
      await prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastSeen: new Date() }
      });

      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.user?.username} connected with socket ID: ${socket.id}`);

    // Join user to their personal room
    socket.join(`user:${socket.user!.id}`);

    // Get user's groups and join them
    socket.on('join-groups', async () => {
      try {
        const userGroups = await prisma.groupMember.findMany({
          where: { userId: socket.user!.id },
          include: { group: true }
        });

        userGroups.forEach(({ group }) => {
          socket.join(`group:${group.id}`);
        });

        socket.emit('groups-joined', { count: userGroups.length });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join groups' });
      }
    });

    // Join specific group
    socket.on('join-group', async (groupId: string) => {
      try {
        // Check if user is member of the group
        const membership = await prisma.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId: socket.user!.id,
              groupId
            }
          }
        });

        if (!membership) {
          socket.emit('error', { message: 'You are not a member of this group' });
          return;
        }

        socket.join(`group:${groupId}`);
        socket.emit('group-joined', { groupId });
        
        // Notify other group members
        socket.to(`group:${groupId}`).emit('user-joined-group', {
          userId: socket.user!.id,
          username: socket.user!.username,
          groupId
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join group' });
      }
    });

    // Leave group
    socket.on('leave-group', async (groupId: string) => {
      try {
        socket.leave(`group:${groupId}`);
        socket.emit('group-left', { groupId });
        
        // Notify other group members
        socket.to(`group:${groupId}`).emit('user-left-group', {
          userId: socket.user!.id,
          username: socket.user!.username,
          groupId
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to leave group' });
      }
    });

    // Send message to group
    socket.on('send-group-message', async (data: { groupId: string; content: string; type?: string }) => {
      try {
        const messageService = new MessageService();
        const message = await messageService.sendGroupMessage({
          groupId: data.groupId,
          senderId: socket.user!.id,
          content: data.content,
          type: data.type as any
        });

        // Broadcast message to all group members
        io.to(`group:${data.groupId}`).emit('group-message', {
          message,
          groupId: data.groupId
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Send private message
    socket.on('send-private-message', async (data: { receiverId: string; content: string; type?: string }) => {
      try {
        const messageService = new MessageService();
        const message = await messageService.sendPrivateMessage({
          senderId: socket.user!.id,
          receiverId: data.receiverId,
          content: data.content,
          type: data.type as any
        });

        // Send to sender
        socket.emit('private-message-sent', { message });
        
        // Send to receiver
        io.to(`user:${data.receiverId}`).emit('private-message-received', { message });
      } catch (error) {
        socket.emit('error', { message: 'Failed to send private message' });
      }
    });

    // Typing indicators
    socket.on('typing-start', (data: { groupId?: string; receiverId?: string }) => {
      if (data.groupId) {
        socket.to(`group:${data.groupId}`).emit('user-typing', {
          userId: socket.user!.id,
          username: socket.user!.username,
          groupId: data.groupId
        });
      } else if (data.receiverId) {
        io.to(`user:${data.receiverId}`).emit('user-typing', {
          userId: socket.user!.id,
          username: socket.user!.username,
          receiverId: data.receiverId
        });
      }
    });

    socket.on('typing-stop', (data: { groupId?: string; receiverId?: string }) => {
      if (data.groupId) {
        socket.to(`group:${data.groupId}`).emit('user-stopped-typing', {
          userId: socket.user!.id,
          username: socket.user!.username,
          groupId: data.groupId
        });
      } else if (data.receiverId) {
        io.to(`user:${data.receiverId}`).emit('user-stopped-typing', {
          userId: socket.user!.id,
          username: socket.user!.username,
          receiverId: data.receiverId
        });
      }
    });

    // Document collaboration
    socket.on('join-document', async (documentId: string) => {
      try {
        const documentService = new DocumentService();
        const document = await documentService.getDocumentById(documentId, socket.user!.id);
        
        if (!document) {
          socket.emit('error', { message: 'Document not found' });
          return;
        }

        socket.join(`document:${documentId}`);
        socket.emit('document-joined', { documentId });
        
        // Notify other collaborators
        socket.to(`document:${documentId}`).emit('user-joined-document', {
          userId: socket.user!.id,
          username: socket.user!.username,
          documentId
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    socket.on('document-edit', async (data: { documentId: string; content: string; version: number }) => {
      try {
        const documentService = new DocumentService();
        const updatedDocument = await documentService.updateDocument(
          data.documentId,
          { content: data.content },
          socket.user!.id
        );

        // Broadcast to all document collaborators
        io.to(`document:${data.documentId}`).emit('document-updated', {
          document: updatedDocument,
          editor: {
            id: socket.user!.id,
            username: socket.user!.username
          }
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to update document' });
      }
    });

    socket.on('leave-document', (documentId: string) => {
      socket.leave(`document:${documentId}`);
      socket.to(`document:${documentId}`).emit('user-left-document', {
        userId: socket.user!.id,
        username: socket.user!.username,
        documentId
      });
    });

    // File sharing notifications
    socket.on('file-shared', (data: { groupId: string; file: any }) => {
      io.to(`group:${data.groupId}`).emit('file-shared', {
        file: data.file,
        sharedBy: {
          id: socket.user!.id,
          username: socket.user!.username
        }
      });
    });

    // User status updates
    socket.on('update-status', async (status: string) => {
      try {
        await prisma.user.update({
          where: { id: socket.user!.id },
          data: { lastSeen: new Date() }
        });

        // Broadcast status update to user's groups
        const userGroups = await prisma.groupMember.findMany({
          where: { userId: socket.user!.id },
          select: { groupId: true }
        });

        userGroups.forEach(({ groupId }) => {
          io.to(`group:${groupId}`).emit('user-status-updated', {
            userId: socket.user!.id,
            username: socket.user!.username,
            status
          });
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user?.username} disconnected`);
      
      try {
        // Update user offline status
        await prisma.user.update({
          where: { id: socket.user!.id },
          data: { isOnline: false, lastSeen: new Date() }
        });

        // Notify user's groups about disconnection
        const userGroups = await prisma.groupMember.findMany({
          where: { userId: socket.user!.id },
          select: { groupId: true }
        });

        userGroups.forEach(({ groupId }) => {
          io.to(`group:${groupId}`).emit('user-disconnected', {
            userId: socket.user!.id,
            username: socket.user!.username,
            groupId
          });
        });
      } catch (error) {
        console.error('Error handling disconnection:', error);
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Global error handling
  io.on('error', (error) => {
    console.error('Socket.IO server error:', error);
  });
};
