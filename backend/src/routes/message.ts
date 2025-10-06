import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate, asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, requireGroupMember } from '../middleware/auth';
import { MessageService } from '../services/messageService';

const router = Router();
const messageService = new MessageService();

// Send message to group
router.post('/group/:groupId',
  authenticateToken,
  requireGroupMember,
  [
    body('content').isLength({ min: 1, max: 2000 }).withMessage('Message content must be between 1 and 2000 characters'),
    body('type').optional().isIn(['TEXT', 'FILE', 'IMAGE', 'SYSTEM', 'DOCUMENT_EDIT']).withMessage('Invalid message type')
  ],
  validate([
    body('content').isLength({ min: 1, max: 2000 }).withMessage('Message content must be between 1 and 2000 characters'),
    body('type').optional().isIn(['TEXT', 'FILE', 'IMAGE', 'SYSTEM', 'DOCUMENT_EDIT']).withMessage('Invalid message type')
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { content, type = 'TEXT' } = req.body;
    const senderId = req.user!.id;
    
    const message = await messageService.sendGroupMessage({
      groupId,
      senderId,
      content,
      type
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });
  })
);

// Send private message
router.post('/private',
  authenticateToken,
  [
    body('receiverId').isUUID().withMessage('Valid receiver ID required'),
    body('content').isLength({ min: 1, max: 2000 }).withMessage('Message content must be between 1 and 2000 characters'),
    body('type').optional().isIn(['TEXT', 'FILE', 'IMAGE', 'SYSTEM', 'DOCUMENT_EDIT']).withMessage('Invalid message type')
  ],
  validate([
    body('receiverId').isUUID().withMessage('Valid receiver ID required'),
    body('content').isLength({ min: 1, max: 2000 }).withMessage('Message content must be between 1 and 2000 characters'),
    body('type').optional().isIn(['TEXT', 'FILE', 'IMAGE', 'SYSTEM', 'DOCUMENT_EDIT']).withMessage('Invalid message type')
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { receiverId, content, type = 'TEXT' } = req.body;
    const senderId = req.user!.id;
    
    const message = await messageService.sendPrivateMessage({
      senderId,
      receiverId,
      content,
      type
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });
  })
);

// Get group messages
router.get('/group/:groupId',
  authenticateToken,
  requireGroupMember,
  asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await messageService.getGroupMessages(groupId, {
      page: Number(page),
      limit: Number(limit)
    });

    res.json({ messages });
  })
);

// Get private messages between users
router.get('/private/:userId',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const currentUserId = req.user!.id;
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await messageService.getPrivateMessages(currentUserId, userId, {
      page: Number(page),
      limit: Number(limit)
    });

    res.json({ messages });
  })
);

// Get message by ID
router.get('/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const message = await messageService.getMessageById(id);
    res.json({ message });
  })
);

// Edit message
router.put('/:id',
  authenticateToken,
  [
    body('content').isLength({ min: 1, max: 2000 }).withMessage('Message content must be between 1 and 2000 characters')
  ],
  validate([
    body('content').isLength({ min: 1, max: 2000 }).withMessage('Message content must be between 1 and 2000 characters')
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user!.id;
    
    const message = await messageService.editMessage(id, content, userId);
    res.json({ message });
  })
);

// Delete message
router.delete('/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    
    await messageService.deleteMessage(id, userId);
    res.json({ message: 'Message deleted successfully' });
  })
);

// Add reaction to message
router.post('/:id/reactions',
  authenticateToken,
  [
    body('emoji').isLength({ min: 1, max: 10 }).withMessage('Emoji must be between 1 and 10 characters')
  ],
  validate([
    body('emoji').isLength({ min: 1, max: 10 }).withMessage('Emoji must be between 1 and 10 characters')
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user!.id;
    
    const reaction = await messageService.addReaction(id, userId, emoji);
    res.json({ reaction });
  })
);

// Remove reaction from message
router.delete('/:id/reactions/:emoji',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id, emoji } = req.params;
    const userId = req.user!.id;
    
    await messageService.removeReaction(id, userId, emoji);
    res.json({ message: 'Reaction removed successfully' });
  })
);

// Get message reactions
router.get('/:id/reactions',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const reactions = await messageService.getMessageReactions(id);
    res.json({ reactions });
  })
);

// Search messages
router.get('/search/:query',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { query } = req.params;
    const { page = 1, limit = 20, groupId, userId } = req.query;
    const currentUserId = req.user!.id;
    
    const messages = await messageService.searchMessages(query, {
      page: Number(page),
      limit: Number(limit),
      groupId: groupId as string,
      userId: userId as string,
      currentUserId
    });

    res.json({ messages });
  })
);

// Mark messages as read
router.post('/mark-read',
  authenticateToken,
  [
    body('messageIds').isArray().withMessage('Message IDs must be an array'),
    body('messageIds.*').isUUID().withMessage('Each message ID must be valid')
  ],
  validate([
    body('messageIds').isArray().withMessage('Message IDs must be an array'),
    body('messageIds.*').isUUID().withMessage('Each message ID must be valid')
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { messageIds } = req.body;
    const userId = req.user!.id;
    
    await messageService.markMessagesAsRead(messageIds, userId);
    res.json({ message: 'Messages marked as read' });
  })
);

export default router;
