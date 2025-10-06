// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
  mutedUntil?: string;
  muteReason?: string;
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  GROUP_OWNER = 'GROUP_OWNER'
}

// Group Types
export interface Group {
  id: string;
  name: string;
  description?: string;
  type: GroupType;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  adminId?: string;
  owner: User;
  admin?: User;
  members: GroupMember[];
  settings?: GroupSettings;
  _count: {
    messages: number;
    members: number;
  };
}

export enum GroupType {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
  DIRECT_MESSAGE = 'DIRECT_MESSAGE'
}

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  role: GroupMemberRole;
  joinedAt: string;
  isMuted: boolean;
  isBanned: boolean;
  user: User;
}

export enum GroupMemberRole {
  MEMBER = 'MEMBER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN'
}

export interface GroupSettings {
  id: string;
  groupId: string;
  maxMembers: number;
  allowFileUpload: boolean;
  allowAnonymous: boolean;
  requireApproval: boolean;
  allowMemberInvite: boolean;
}

// Message Types
export interface Message {
  id: string;
  content: string;
  type: MessageType;
  timestamp: string;
  editedAt?: string;
  isDeleted: boolean;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  sender: User;
  receiver?: User;
  group?: Group;
  attachments: File[];
  reactions: MessageReaction[];
}

export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
  SYSTEM = 'SYSTEM',
  DOCUMENT_EDIT = 'DOCUMENT_EDIT'
}

export interface MessageReaction {
  id: string;
  emoji: string;
  createdAt: string;
  messageId: string;
  userId: string;
  user: User;
}

// File Types
export interface File {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: string;
  isPublic: boolean;
  uploadedBy?: string;
  messageId?: string;
  groupId?: string;
  uploader?: User;
  message?: Message;
  group?: Group;
}

// Document Types
export interface Document {
  id: string;
  title: string;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  groupId: string;
  group: Group;
  edits: DocumentEdit[];
}

export interface DocumentEdit {
  id: string;
  content: string;
  version: number;
  editedAt: string;
  changeType: string;
  documentId: string;
  userId: string;
  document: Document;
  user: User;
}

// Notification Types
export interface Notification {
  id: string;
  title: string;
  content: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  userId: string;
  user: User;
}

export enum NotificationType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
  MESSAGE = 'MESSAGE',
  GROUP_INVITE = 'GROUP_INVITE',
  FILE_SHARED = 'FILE_SHARED'
}

// Auth Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  tokens: AuthTokens;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Socket Event Types
export interface SocketEvents {
  // Connection events
  'connect': () => void;
  'disconnect': () => void;
  'error': (error: any) => void;

  // Group events
  'group-joined': (data: { groupId: string }) => void;
  'group-left': (data: { groupId: string }) => void;
  'user-joined-group': (data: { userId: string; username: string; groupId: string }) => void;
  'user-left-group': (data: { userId: string; username: string; groupId: string }) => void;

  // Message events
  'group-message': (data: { message: Message; groupId: string }) => void;
  'private-message-received': (data: { message: Message }) => void;
  'private-message-sent': (data: { message: Message }) => void;

  // Typing events
  'user-typing': (data: { userId: string; username: string; groupId?: string; receiverId?: string }) => void;
  'user-stopped-typing': (data: { userId: string; username: string; groupId?: string; receiverId?: string }) => void;

  // Document events
  'document-joined': (data: { documentId: string }) => void;
  'document-updated': (data: { document: Document; editor: { id: string; username: string } }) => void;
  'user-joined-document': (data: { userId: string; username: string; documentId: string }) => void;
  'user-left-document': (data: { userId: string; username: string; documentId: string }) => void;

  // File events
  'file-shared': (data: { file: File; sharedBy: { id: string; username: string } }) => void;

  // Status events
  'user-status-updated': (data: { userId: string; username: string; status: string }) => void;
  'user-connected': (data: { userId: string; username: string }) => void;
  'user-disconnected': (data: { userId: string; username: string; groupId: string }) => void;
}

// Form Types
export interface CreateGroupForm {
  name: string;
  description?: string;
  type: GroupType;
  avatar?: string;
}

export interface SendMessageForm {
  content: string;
  type?: MessageType;
}

export interface UploadFileForm {
  file: File;
  groupId?: string;
  isPublic?: boolean;
}

export interface CreateDocumentForm {
  title: string;
  groupId: string;
  content?: string;
}

// Context Types
export interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ChatContextType {
  currentGroup: Group | null;
  setCurrentGroup: (group: Group | null) => void;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  typingUsers: string[];
  setTypingUsers: (users: string[]) => void;
  addTypingUser: (userId: string) => void;
  removeTypingUser: (userId: string) => void;
}

export interface DocumentContextType {
  currentDocument: Document | null;
  setCurrentDocument: (document: Document | null) => void;
  collaborators: User[];
  setCollaborators: (users: User[]) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  lastEditVersion: number;
  setLastEditVersion: (version: number) => void;
}
