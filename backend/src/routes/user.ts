import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate, asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { UserService } from '../services/userService';

const router = Router();
const userService = new UserService();

// Get all users (admin only)
router.get('/',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const users = await userService.getAllUsers();
    res.json({ users });
  })
);

// Get user by ID
router.get('/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    res.json({ user });
  })
);

// Update user profile
router.put('/:id',
  authenticateToken,
  [
    body('firstName').optional().isLength({ min: 1, max: 50 }),
    body('lastName').optional().isLength({ min: 1, max: 50 }),
    body('avatar').optional().isURL()
  ],
  validate([
    body('firstName').optional().isLength({ min: 1, max: 50 }),
    body('lastName').optional().isLength({ min: 1, max: 50 }),
    body('avatar').optional().isURL()
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { firstName, lastName, avatar } = req.body;
    
    // Check if user is updating their own profile or is admin
    if (req.user!.id !== id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Can only update your own profile' });
    }

    const user = await userService.updateUser(id, { firstName, lastName, avatar });
    res.json({ user });
  })
);

// Delete user (admin only)
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await userService.deleteUser(id);
    res.json({ message: 'User deleted successfully' });
  })
);

// Get user's groups
router.get('/:id/groups',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // Check if user is viewing their own groups or is admin
    if (req.user!.id !== id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Can only view your own groups' });
    }

    const groups = await userService.getUserGroups(id);
    res.json({ groups });
  })
);

// Get user's messages
router.get('/:id/messages',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Check if user is viewing their own messages or is admin
    if (req.user!.id !== id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Can only view your own messages' });
    }

    const messages = await userService.getUserMessages(id, {
      page: Number(page),
      limit: Number(limit)
    });
    res.json({ messages });
  })
);

// Get user's files
router.get('/:id/files',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Check if user is viewing their own files or is admin
    if (req.user!.id !== id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Can only view your own files' });
    }

    const files = await userService.getUserFiles(id, {
      page: Number(page),
      limit: Number(limit)
    });
    res.json({ files });
  })
);

// Get online users
router.get('/online/list',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const users = await userService.getOnlineUsers();
    res.json({ users });
  })
);

// Search users
router.get('/search/:query',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { query } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const users = await userService.searchUsers(query, {
      page: Number(page),
      limit: Number(limit)
    });
    res.json({ users });
  })
);

export default router;
