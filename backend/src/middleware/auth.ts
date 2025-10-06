import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/auth';
import prisma from '../config/database';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Authentication middleware
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = verifyAccessToken(token) as TokenPayload;
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, email: true, role: true, isOnline: true }
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Authorization middleware
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

// Admin only middleware
export const requireAdmin = requireRole(['ADMIN']);

// Group owner or admin middleware
export const requireGroupOwnerOrAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const groupId = req.params.groupId || req.body.groupId;
    
    if (!groupId) {
      res.status(400).json({ error: 'Group ID required' });
      return;
    }

    // Check if user is admin
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    // Check if user is group owner
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { ownerId: true }
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    if (group.ownerId === req.user.id) {
      next();
      return;
    }

    res.status(403).json({ error: 'Group owner or admin access required' });
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

// Group member middleware
export const requireGroupMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const groupId = req.params.groupId || req.body.groupId;
    
    if (!groupId) {
      res.status(400).json({ error: 'Group ID required' });
      return;
    }

    // Check if user is group member
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user.id,
          groupId: groupId
        }
      }
    });

    if (!membership) {
      res.status(403).json({ error: 'Group membership required' });
      return;
    }

    if (membership.isBanned) {
      res.status(403).json({ error: 'User is banned from this group' });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Group membership check failed' });
  }
};
