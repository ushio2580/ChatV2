import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { Log } from '../models';

// Función para guardar logs en MongoDB
const saveLogToMongo = async (logData: any) => {
  try {
    const logEntry = new Log({
      timestamp: new Date(logData.timestamp),
      level: logData.level,
      message: logData.message,
      category: logData.category || 'SYSTEM',
      action: logData.action || 'UNKNOWN',
      userId: logData.userId,
      metadata: {
        ...logData,
        // Remover campos que ya están en el esquema principal
        timestamp: undefined,
        level: undefined,
        message: undefined,
        category: undefined,
        action: undefined,
        userId: undefined,
        service: undefined,
        version: undefined
      },
      service: logData.service || 'chat-platform',
      version: logData.version || '1.0.0'
    });
    
    await logEntry.save();
  } catch (error) {
    // Fallar silenciosamente para evitar loops infinitos
  }
};

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuración del logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'chat-platform',
    version: '1.0.0'
  },
  transports: [
    // Errores en archivo separado
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Todos los logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Console para desarrollo
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}] ${message} ${metaStr}`;
        })
      )
    }),
    
    // MongoDB se maneja a través del hook personalizado arriba
  ]
});

// Funciones helper para diferentes tipos de logs
export const logAuth = {
  loginSuccess: (userId: string, email: string, ip?: string) => {
    logWithMongo('info', 'User login successful', {
      userId,
      email,
      ip,
      action: 'LOGIN_SUCCESS',
      category: 'AUTH'
    });
  },
  
  loginFailed: (email: string, reason: string, ip?: string) => {
    logWithMongo('warn', 'User login failed', {
      email,
      reason,
      ip,
      action: 'LOGIN_FAILED',
      category: 'AUTH'
    });
  },
  
  logout: (userId: string, email: string) => {
    logger.info('User logout', {
      userId,
      email,
      action: 'LOGOUT',
      category: 'AUTH'
    });
  },
  
  passwordChanged: (userId: string, email: string) => {
    logWithMongo('info', 'Password changed', {
      userId,
      email,
      action: 'PASSWORD_CHANGED',
      category: 'AUTH'
    });
  },
  
  passwordResetRequested: (email: string) => {
    logger.info('Password reset requested', {
      email,
      action: 'PASSWORD_RESET_REQUESTED',
      category: 'AUTH'
    });
  }
};

export const logMessage = {
  sent: (messageId: string, senderId: string, recipientType: 'group' | 'private', recipientId: string, contentLength: number) => {
    logger.info('Message sent', {
      messageId,
      senderId,
      recipientType,
      recipientId,
      contentLength,
      action: 'MESSAGE_SENT',
      category: 'MESSAGING'
    });
  },
  
  received: (messageId: string, recipientId: string, senderId: string) => {
    logger.info('Message received', {
      messageId,
      recipientId,
      senderId,
      action: 'MESSAGE_RECEIVED',
      category: 'MESSAGING'
    });
  }
};

export const logFile = {
  uploaded: (fileId: string, fileName: string, fileSize: number, uploaderId: string, mimeType: string) => {
    logger.info('File uploaded', {
      fileId,
      fileName,
      fileSize,
      uploaderId,
      mimeType,
      action: 'FILE_UPLOADED',
      category: 'FILE_TRANSFER'
    });
  },
  
  downloaded: (fileId: string, fileName: string, downloaderId: string) => {
    logger.info('File downloaded', {
      fileId,
      fileName,
      downloaderId,
      action: 'FILE_DOWNLOADED',
      category: 'FILE_TRANSFER'
    });
  },
  
  shared: (fileId: string, fileName: string, sharerId: string, recipientType: 'group' | 'private', recipientId: string) => {
    logger.info('File shared', {
      fileId,
      fileName,
      sharerId,
      recipientType,
      recipientId,
      action: 'FILE_SHARED',
      category: 'FILE_TRANSFER'
    });
  },
  
  // Checksum-related logging
  checksumGenerated: (fileId: string, filename: string, md5: string, sha256: string) => {
    logWithMongo('info', 'File checksums generated', {
      fileId,
      filename,
      md5,
      sha256,
      action: 'CHECKSUM_GENERATED',
      category: 'FILE_TRANSFER'
    });
  },
  
  integrityVerified: (fileId: string, filename: string, details: string) => {
    logWithMongo('info', 'File integrity verified', {
      fileId,
      filename,
      details,
      action: 'INTEGRITY_VERIFIED',
      category: 'FILE_TRANSFER'
    });
  },
  
  integrityFailed: (fileId: string, filename: string, details: string) => {
    logWithMongo('warn', 'File integrity verification failed', {
      fileId,
      filename,
      details,
      action: 'INTEGRITY_FAILED',
      category: 'FILE_TRANSFER'
    });
  },
  
  checksumMismatch: (fileId: string, filename: string, expectedMd5: string, actualMd5: string) => {
    logWithMongo('error', 'Checksum mismatch detected', {
      fileId,
      filename,
      expectedMd5,
      actualMd5,
      action: 'CHECKSUM_MISMATCH',
      category: 'FILE_TRANSFER'
    });
  }
};

export const logGroup = {
  created: (groupId: string, groupName: string, creatorId: string, memberCount: number) => {
    logger.info('Group created', {
      groupId,
      groupName,
      creatorId,
      memberCount,
      action: 'GROUP_CREATED',
      category: 'GROUP_MANAGEMENT'
    });
  },
  
  memberAdded: (groupId: string, groupName: string, addedUserId: string, addedByUserId: string) => {
    logger.info('Group member added', {
      groupId,
      groupName,
      addedUserId,
      addedByUserId,
      action: 'GROUP_MEMBER_ADDED',
      category: 'GROUP_MANAGEMENT'
    });
  },
  
  memberRemoved: (groupId: string, groupName: string, removedUserId: string, removedByUserId: string) => {
    logger.info('Group member removed', {
      groupId,
      groupName,
      removedUserId,
      removedByUserId,
      action: 'GROUP_MEMBER_REMOVED',
      category: 'GROUP_MANAGEMENT'
    });
  },
  
  deleted: (groupId: string, groupName: string, deletedByUserId: string) => {
    logger.warn('Group deleted', {
      groupId,
      groupName,
      deletedByUserId,
      action: 'GROUP_DELETED',
      category: 'GROUP_MANAGEMENT'
    });
  }
};

export const logAdmin = {
  userMuted: (targetUserId: string, targetUsername: string, adminId: string, reason?: string) => {
    logWithMongo('warn', 'User muted by admin', {
      targetUserId,
      targetUsername,
      adminId,
      reason,
      action: 'USER_MUTED',
      category: 'ADMIN_ACTION'
    });
  },
  
  userUnmuted: (targetUserId: string, targetUsername: string, adminId: string) => {
    logWithMongo('info', 'User unmuted by admin', {
      targetUserId,
      targetUsername,
      adminId,
      action: 'USER_UNMUTED',
      category: 'ADMIN_ACTION'
    });
  },
  
  roleChanged: (targetUserId: string, targetUsername: string, oldRole: string, newRole: string, adminId: string) => {
    logWithMongo('warn', 'User role changed', {
      targetUserId,
      targetUsername,
      oldRole,
      newRole,
      adminId,
      action: 'ROLE_CHANGED',
      category: 'ADMIN_ACTION'
    });
  }
};

export const logSystem = {
  serverStarted: (port: number) => {
    logWithMongo('info', 'Server started', {
      port,
      nodeVersion: process.version,
      action: 'SERVER_STARTED',
      category: 'SYSTEM'
    });
  },
  
  databaseConnected: (database: string) => {
    logWithMongo('info', 'Database connected', {
      database,
      action: 'DATABASE_CONNECTED',
      category: 'SYSTEM'
    });
  },
  
  databaseError: (error: string, operation?: string) => {
    logger.error('Database error', {
      error,
      operation,
      action: 'DATABASE_ERROR',
      category: 'SYSTEM'
    });
  },
  
  socketConnected: (socketId: string, userId?: string) => {
    logger.info('Socket connected', {
      socketId,
      userId,
      action: 'SOCKET_CONNECTED',
      category: 'SYSTEM'
    });
  },
  
  socketDisconnected: (socketId: string, userId?: string) => {
    logger.info('Socket disconnected', {
      socketId,
      userId,
      action: 'SOCKET_DISCONNECTED',
      category: 'SYSTEM'
    });
  }
};

export const logError = {
  apiError: (endpoint: string, method: string, error: string, userId?: string, statusCode?: number) => {
    logWithMongo('error', 'API error', {
      endpoint,
      method,
      error,
      userId,
      statusCode,
      action: 'API_ERROR',
      category: 'ERROR'
    });
  },
  
  validationError: (endpoint: string, field: string, value: any, userId?: string) => {
    logWithMongo('warn', 'Validation error', {
      endpoint,
      field,
      value,
      userId,
      action: 'VALIDATION_ERROR',
      category: 'ERROR'
    });
  },
  
  authError: (endpoint: string, reason: string, userId?: string, ip?: string) => {
    logWithMongo('warn', 'Authentication error', {
      endpoint,
      reason,
      userId,
      ip,
      action: 'AUTH_ERROR',
      category: 'ERROR'
    });
  }
};

// Helper para logs con MongoDB
const logWithMongo = (level: string, message: string, metadata: any = {}) => {
  const logData = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  
  // Guardar en MongoDB
  saveLogToMongo(logData);
  
  // Log normal
  logger.log(level, message, metadata);
};

export default logger;
