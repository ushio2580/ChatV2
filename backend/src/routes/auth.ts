import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { validate, asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/authMongo';
import { AuthService } from '../services/authServiceMongo';

const router = Router();
const authService = new AuthService();


// Register validation rules
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
];

// Login validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Change password validation rules
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
];

// Register endpoint
router.post('/register', 
  asyncHandler(async (req: Request, res: Response) => {
    const { username, email, password, firstName, lastName } = req.body;
    
    const result = await authService.register({
      username,
      email,
      password,
      firstName,
      lastName
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: result.user,
      tokens: result.tokens
    });
  })
);

// Login endpoint
router.post('/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    const result = await authService.login({ email, password });

    return res.json({
      message: 'Login successful',
      user: result.user,
      tokens: result.tokens
    });
  })
);

// Refresh token endpoint
router.post('/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const result = await authService.refreshToken(refreshToken);

    return res.json({
      message: 'Token refreshed successfully',
      tokens: result.tokens
    });
  })
);

// Logout endpoint
router.post('/logout',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.user!.id);

    return res.json({
      message: 'Logout successful'
    });
  })
);

// Change password endpoint
router.post('/change-password',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    
    await authService.changePassword(req.user!.id, currentPassword, newPassword);

    return res.json({
      message: 'Password changed successfully'
    });
  })
);

// Get current user endpoint
router.get('/me',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getCurrentUser(req.user!.id);

    res.json({
      user
    });
  })
);

// Verify email endpoint
router.post('/verify-email',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    await authService.verifyEmail(userId, token);

    return res.json({
      message: 'Email verified successfully'
    });
  })
);

// Forgot password endpoint
router.post('/forgot-password',
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    try {
      const resetToken = await authService.forgotPassword(email);
      
      // In a real application, you would send this token via email
      // For development, we'll return it in the response
      console.log('Reset token for', email, ':', resetToken);
      
      return res.json({
        message: 'Password reset email sent',
        // Remove this in production - only for development
        resetToken: resetToken
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  })
);

// Reset password endpoint
router.post('/reset-password',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    try {
      await authService.resetPassword(token, newPassword);

      return res.json({
        message: 'Password reset successfully'
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  })
);


export default router;
