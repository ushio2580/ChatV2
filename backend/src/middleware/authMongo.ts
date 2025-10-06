import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { User } from '../models';
import { logError } from '../utils/logger';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        role: string;
      };
    }
  }
}

// Authentication middleware for MongoDB
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logError.authError(
        req.path || req.url || 'unknown',
        'No access token provided',
        undefined,
        req.ip
      );
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Verify user still exists and is active
    const user = await User.findById(decoded.id).select('_id username email role isOnline');
    
    if (!user) {
      logError.authError(
        req.path || req.url || 'unknown',
        'User not found in database',
        decoded.id,
        req.ip
      );
      res.status(403).json({ error: 'User not found' });
      return;
    }

    // Comentamos la verificación de isOnline por ahora para debugging
    // if (!user.isOnline) {
    //   res.status(403).json({ error: 'User account is inactive' });
    //   return;
    // }

    // Add user info to request
    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    
    // Log authentication error
    logError.authError(
      req.path || req.url || 'unknown',
      error.message || 'Authentication failed',
      req.user?.id,
      req.ip
    );
    
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Authorization middleware for admin-only routes
export const authorizeAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    logError.authError(
      req.path || req.url || 'unknown',
      'Authentication required for admin access',
      undefined,
      req.ip
    );
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
    logError.authError(
      req.path || req.url || 'unknown',
      'Admin access required',
      req.user.id,
      req.ip
    );
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
};

// Authorization middleware for moderator and admin routes
export const authorizeModerator = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    logError.authError(
      req.path || req.url || 'unknown',
      'Authentication required for moderator access',
      undefined,
      req.ip
    );
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN' && req.user.role !== 'MODERATOR') {
    logError.authError(
      req.path || req.url || 'unknown',
      'Moderator access required',
      req.user.id,
      req.ip
    );
    res.status(403).json({ error: 'Moderator access required' });
    return;
  }

  next();
};
