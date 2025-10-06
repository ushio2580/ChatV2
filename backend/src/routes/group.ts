import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate, asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, requireGroupOwnerOrAdmin, requireGroupMember } from '../middleware/auth';
import { GroupService } from '../services/groupService';

const router = Router();
const groupService = new GroupService();

// Create group
router.post('/',
  authenticateToken,
  [
    body('name').isLength({ min: 1, max: 100 }).withMessage('Group name must be between 1 and 100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('type').isIn(['PRIVATE', 'PUBLIC', 'DIRECT_MESSAGE']).withMessage('Invalid group type'),
    body('avatar').optional().isURL().withMessage('Avatar must be a valid URL')
  ],
  validate([
    body('name').isLength({ min: 1, max: 100 }).withMessage('Group name must be between 1 and 100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('type').isIn(['PRIVATE', 'PUBLIC', 'DIRECT_MESSAGE']).withMessage('Invalid group type'),
    body('avatar').optional().isURL().withMessage('Avatar must be a valid URL')
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, description, type, avatar } = req.body;
    const ownerId = req.user!.id;
    
    const group = await groupService.createGroup({
      name,
      description,
      type,
      avatar,
      ownerId
    });

    res.status(201).json({
      message: 'Group created successfully',
      group
    });
  })
);

// Get all groups
router.get('/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, type } = req.query;
    
    const groups = await groupService.getAllGroups({
      page: Number(page),
      limit: Number(limit),
      type: type as string
    });

    res.json({ groups });
  })
);

// Get group by ID
router.get('/:id',
  authenticateToken,
  requireGroupMember,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const group = await groupService.getGroupById(id);
    res.json({ group });
  })
);

// Update group
router.put('/:id',
  authenticateToken,
  requireGroupOwnerOrAdmin,
  [
    body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Group name must be between 1 and 100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('avatar').optional().isURL().withMessage('Avatar must be a valid URL')
  ],
  validate([
    body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Group name must be between 1 and 100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('avatar').optional().isURL().withMessage('Avatar must be a valid URL')
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, avatar } = req.body;
    
    const group = await groupService.updateGroup(id, { name, description, avatar });
    res.json({ group });
  })
);

// Delete group
router.delete('/:id',
  authenticateToken,
  requireGroupOwnerOrAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await groupService.deleteGroup(id);
    res.json({ message: 'Group deleted successfully' });
  })
);

// Join group
router.post('/:id/join',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    
    await groupService.joinGroup(id, userId);
    res.json({ message: 'Joined group successfully' });
  })
);

// Leave group
router.post('/:id/leave',
  authenticateToken,
  requireGroupMember,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    
    await groupService.leaveGroup(id, userId);
    res.json({ message: 'Left group successfully' });
  })
);

// Add member to group
router.post('/:id/members',
  authenticateToken,
  requireGroupOwnerOrAdmin,
  [
    body('userId').isUUID().withMessage('Valid user ID required'),
    body('role').optional().isIn(['MEMBER', 'MODERATOR', 'ADMIN']).withMessage('Invalid role')
  ],
  validate([
    body('userId').isUUID().withMessage('Valid user ID required'),
    body('role').optional().isIn(['MEMBER', 'MODERATOR', 'ADMIN']).withMessage('Invalid role')
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId, role = 'MEMBER' } = req.body;
    
    await groupService.addMember(id, userId, role);
    res.json({ message: 'Member added successfully' });
  })
);

// Remove member from group
router.delete('/:id/members/:userId',
  authenticateToken,
  requireGroupOwnerOrAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { id, userId } = req.params;
    
    await groupService.removeMember(id, userId);
    res.json({ message: 'Member removed successfully' });
  })
);

// Update member role
router.put('/:id/members/:userId',
  authenticateToken,
  requireGroupOwnerOrAdmin,
  [
    body('role').isIn(['MEMBER', 'MODERATOR', 'ADMIN']).withMessage('Invalid role')
  ],
  validate([
    body('role').isIn(['MEMBER', 'MODERATOR', 'ADMIN']).withMessage('Invalid role')
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { id, userId } = req.params;
    const { role } = req.body;
    
    await groupService.updateMemberRole(id, userId, role);
    res.json({ message: 'Member role updated successfully' });
  })
);

// Mute member
router.post('/:id/members/:userId/mute',
  authenticateToken,
  requireGroupOwnerOrAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { id, userId } = req.params;
    
    await groupService.muteMember(id, userId);
    res.json({ message: 'Member muted successfully' });
  })
);

// Unmute member
router.post('/:id/members/:userId/unmute',
  authenticateToken,
  requireGroupOwnerOrAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { id, userId } = req.params;
    
    await groupService.unmuteMember(id, userId);
    res.json({ message: 'Member unmuted successfully' });
  })
);

// Ban member
router.post('/:id/members/:userId/ban',
  authenticateToken,
  requireGroupOwnerOrAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { id, userId } = req.params;
    
    await groupService.banMember(id, userId);
    res.json({ message: 'Member banned successfully' });
  })
);

// Unban member
router.post('/:id/members/:userId/unban',
  authenticateToken,
  requireGroupOwnerOrAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { id, userId } = req.params;
    
    await groupService.unbanMember(id, userId);
    res.json({ message: 'Member unbanned successfully' });
  })
);

// Get group members
router.get('/:id/members',
  authenticateToken,
  requireGroupMember,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const members = await groupService.getGroupMembers(id, {
      page: Number(page),
      limit: Number(limit)
    });
    res.json({ members });
  })
);

// Get group messages
router.get('/:id/messages',
  authenticateToken,
  requireGroupMember,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await groupService.getGroupMessages(id, {
      page: Number(page),
      limit: Number(limit)
    });
    res.json({ messages });
  })
);

// Update group settings
router.put('/:id/settings',
  authenticateToken,
  requireGroupOwnerOrAdmin,
  [
    body('maxMembers').optional().isInt({ min: 1, max: 1000 }).withMessage('Max members must be between 1 and 1000'),
    body('allowFileUpload').optional().isBoolean().withMessage('Allow file upload must be boolean'),
    body('allowAnonymous').optional().isBoolean().withMessage('Allow anonymous must be boolean'),
    body('requireApproval').optional().isBoolean().withMessage('Require approval must be boolean'),
    body('allowMemberInvite').optional().isBoolean().withMessage('Allow member invite must be boolean')
  ],
  validate([
    body('maxMembers').optional().isInt({ min: 1, max: 1000 }).withMessage('Max members must be between 1 and 1000'),
    body('allowFileUpload').optional().isBoolean().withMessage('Allow file upload must be boolean'),
    body('allowAnonymous').optional().isBoolean().withMessage('Allow anonymous must be boolean'),
    body('requireApproval').optional().isBoolean().withMessage('Require approval must be boolean'),
    body('allowMemberInvite').optional().isBoolean().withMessage('Allow member invite must be boolean')
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const settings = req.body;
    
    const updatedSettings = await groupService.updateGroupSettings(id, settings);
    res.json({ settings: updatedSettings });
  })
);

export default router;
