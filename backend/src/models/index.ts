import mongoose, { Schema, Document } from 'mongoose';

// User Interface
export interface IUser extends Document {
  _id: string;
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isOnline: boolean;
  lastSeen: Date;
  mutedUntil?: Date;
  muteReason?: string;
  mutedAt?: Date;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// User Schema
const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  role: { type: String, default: 'USER' },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  mutedUntil: { type: Date },
  muteReason: { type: String },
  mutedAt: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
}, {
  timestamps: true
});

// Message Interface
export interface IMessage extends Document {
  _id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: string;
  timestamp: Date;
  editedAt?: Date;
  attachments?: {
    fileId: string;
    filename: string;
    mimeType: string;
    size: number;
  }[];
  reactions?: {
    userId: string;
    emoji: string;
  }[];
}

// Message Schema
const MessageSchema = new Schema<IMessage>({
  roomId: { type: String, required: true },
  senderId: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, default: 'text' },
  timestamp: { type: Date, default: Date.now },
  editedAt: { type: Date },
  attachments: [{
    fileId: String,
    filename: String,
    mimeType: String,
    size: Number
  }],
  reactions: [{
    userId: String,
    emoji: String
  }]
});

// Room Interface
export interface IRoom extends Document {
  _id: string;
  name: string;
  description?: string;
  type: string;
  ownerId: string;
  members: string[];
  admins: string[];
  createdAt: Date;
  updatedAt: Date;
  settings: {
    maxMembers: number;
    allowFileUpload: boolean;
    allowAnonymous: boolean;
  };
}

// Room Schema
const RoomSchema = new Schema<IRoom>({
  name: { type: String, required: true },
  description: { type: String },
  type: { type: String, default: 'group' },
  ownerId: { type: String, required: true },
  members: [{ type: String }],
  admins: [{ type: String }],
  settings: {
    maxMembers: { type: Number, default: 100 },
    allowFileUpload: { type: Boolean, default: true },
    allowAnonymous: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Export Models
export const User = mongoose.model<IUser>('User', UserSchema);
export const Message = mongoose.model<IMessage>('Message', MessageSchema);
export const Room = mongoose.model<IRoom>('Room', RoomSchema);

// Re-export File model
export { File, IFile } from './File';

// Re-export Document model
export { DocumentModel, IDocument } from './Document';

// Log Interface
export interface ILog extends Document {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  category: 'AUTH' | 'MESSAGING' | 'FILE_TRANSFER' | 'GROUP_MANAGEMENT' | 'ADMIN_ACTION' | 'SYSTEM' | 'ERROR';
  action: string;
  userId?: string;
  metadata: Record<string, any>;
  service: string;
  version: string;
}

// Log Schema
const LogSchema = new Schema<ILog>({
  timestamp: { type: Date, default: Date.now, index: true },
  level: { type: String, enum: ['info', 'warn', 'error'], required: true, index: true },
  message: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['AUTH', 'MESSAGING', 'FILE_TRANSFER', 'GROUP_MANAGEMENT', 'ADMIN_ACTION', 'SYSTEM', 'ERROR'],
    required: true,
    index: true
  },
  action: { type: String, required: true, index: true },
  userId: { type: String, index: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  service: { type: String, default: 'chat-platform' },
  version: { type: String, default: '1.0.0' }
});

// Índices compuestos para consultas eficientes
LogSchema.index({ timestamp: -1, level: 1 });
LogSchema.index({ category: 1, timestamp: -1 });
LogSchema.index({ userId: 1, timestamp: -1 });
LogSchema.index({ action: 1, timestamp: -1 });

export const Log = mongoose.model<ILog>('Log', LogSchema);
