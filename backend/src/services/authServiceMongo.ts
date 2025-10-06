import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User } from '../models';
import { logAuth } from '../utils/logger';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export class AuthService {
  // Register a new user
  async register(data: RegisterData): Promise<AuthResult> {
    const { username, email, password, firstName, lastName } = data;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email },
        { username }
      ]
    });

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'USER',
      isOnline: true,
      lastSeen: new Date()
    });

    await user.save();

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    
    // Log successful login
    logAuth.loginSuccess(user._id.toString(), user.email);

    return {
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken
      }
    };
  }

  // Login user
  async login(data: LoginData): Promise<AuthResult> {
    const { email, password } = data;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update user status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    
    // Log successful login
    logAuth.loginSuccess(user._id.toString(), user.email);

    return {
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken
      }
    };
  }

  // Generate access token
  private generateAccessToken(user: any): string {
    const payload = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    console.log('Generating access token for user:', payload);
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '7d'
    });
    console.log('Generated token:', token.substring(0, 20) + '...');
    return token;
  }

  // Generate refresh token
  private generateRefreshToken(user: any): string {
    const payload = {
      id: user._id.toString(),
      type: 'refresh'
    };
    
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: '30d'
    });
  }

  // Verify refresh token
  async verifyRefreshToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role
      };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  // Logout user
  async logout(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
    }
  }

  // Refresh token
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    const decoded = await this.verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      throw new Error('User not found');
    }

    const accessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    return {
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken: newRefreshToken
      }
    };
  }

  // Change password
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      // Log failed password change attempt
      logAuth.loginFailed(user.email, 'Incorrect current password for password change');
      throw new Error('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();
    
    // Log password change
    logAuth.passwordChanged(user._id.toString(), user.email);
  }

  // Get current user
  async getCurrentUser(userId: string): Promise<any> {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen
    };
  }

  // Verify email (placeholder)
  async verifyEmail(userId: string, token: string): Promise<void> {
    // Implementation would depend on email verification strategy
    throw new Error('Email verification not implemented');
  }

  // Forgot password (placeholder)
  async forgotPassword(email: string): Promise<string> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('No user found with that email address');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set reset token and expiration (10 minutes)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    return resetToken; // Return unhashed token for email
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Hash the token to compare with stored version
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Update password and clear reset token
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
  }
}
