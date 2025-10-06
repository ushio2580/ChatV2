import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Password hashing
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// JWT Token generation
export const generateAccessToken = (user: User): string => {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'chat-platform',
    audience: 'chat-platform-users'
  } as jwt.SignOptions);
};

export const generateRefreshToken = (user: User): string => {
  const payload = {
    id: user.id,
    username: user.username,
    type: 'refresh'
  };
  
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'chat-platform',
    audience: 'chat-platform-users'
  } as jwt.SignOptions);
};

// JWT Token verification
export const verifyAccessToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'chat-platform',
      audience: 'chat-platform-users'
    });
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

export const verifyRefreshToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'chat-platform',
      audience: 'chat-platform-users'
    });
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

// Token payload interface
export interface TokenPayload {
  id: string;
  username: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface RefreshTokenPayload {
  id: string;
  username: string;
  type: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}
