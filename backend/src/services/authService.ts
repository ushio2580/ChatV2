import prisma from '../config/database';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/auth';
import { User } from '@prisma/client';

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
  user: Omit<User, 'password'>;
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
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'USER'
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Generate tokens
    const accessToken = generateAccessToken(user as User);
    const refreshToken = generateRefreshToken(user as User);

    return {
      user,
      tokens: {
        accessToken,
        refreshToken
      }
    };
  }

  // Login user
  async login(email: string, password: string): Promise<AuthResult> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update user online status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
        lastSeen: new Date()
      }
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens: {
        accessToken,
        refreshToken
      }
    };
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<{ tokens: { accessToken: string; refreshToken: string } }> {
    try {
      const decoded = verifyRefreshToken(refreshToken) as any;
      
      // Find user
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      return {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Logout user
  async logout(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline: false,
        lastSeen: new Date()
      }
    });
  }

  // Change password
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    });
  }

  // Get current user
  async getCurrentUser(userId: string): Promise<Omit<User, 'password'>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  // Verify email (placeholder for future implementation)
  async verifyEmail(token: string): Promise<void> {
    // TODO: Implement email verification logic
    throw new Error('Email verification not implemented yet');
  }

  // Forgot password (placeholder for future implementation)
  async forgotPassword(email: string): Promise<void> {
    // TODO: Implement forgot password logic
    throw new Error('Forgot password not implemented yet');
  }

  // Reset password (placeholder for future implementation)
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // TODO: Implement reset password logic
    throw new Error('Reset password not implemented yet');
  }
}
