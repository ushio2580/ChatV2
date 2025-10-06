import mongoose, { Schema } from 'mongoose';

export interface IDocument extends mongoose.Document {
  title: string;
  content: string;
  createdBy: mongoose.Types.ObjectId;
  roomId?: mongoose.Types.ObjectId;
  isPublic: boolean;
  collaborators: mongoose.Types.ObjectId[];
  lastModified: Date;
  version: number;
  operations: IOperation[];
  metadata: {
    language: string;
    wordCount: number;
    characterCount: number;
  };
  // Advanced version control
  versionControl: {
    enabled: boolean;
    autoSave: boolean;
    maxVersions: number;
    retentionDays: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IOperation {
  id: string;
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  userId: mongoose.Types.ObjectId;
  timestamp: Date;
  version: number;
}

const OperationSchema = new Schema<IOperation>({
  id: { type: String, required: true },
  type: { type: String, enum: ['insert', 'delete', 'retain'], required: true },
  position: { type: Number, required: true },
  content: { type: String },
  length: { type: Number },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  version: { type: Number, required: true }
});

const DocumentSchema = new Schema<IDocument>({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  content: { 
    type: String, 
    default: '',
    maxlength: 1000000 // 1MB limit
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  roomId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Room' 
  },
  isPublic: { 
    type: Boolean, 
    default: false 
  },
  collaborators: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  lastModified: { 
    type: Date, 
    default: Date.now 
  },
  version: { 
    type: Number, 
    default: 0 
  },
  operations: [OperationSchema],
  metadata: {
    language: { type: String, default: 'text' },
    wordCount: { type: Number, default: 0 },
    characterCount: { type: Number, default: 0 }
  },
  // Advanced version control settings
  versionControl: {
    enabled: { type: Boolean, default: true },
    autoSave: { type: Boolean, default: true },
    maxVersions: { type: Number, default: 100 },
    retentionDays: { type: Number, default: 365 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
DocumentSchema.index({ createdBy: 1 });
DocumentSchema.index({ roomId: 1 });
DocumentSchema.index({ isPublic: 1 });
DocumentSchema.index({ lastModified: -1 });
DocumentSchema.index({ 'collaborators': 1 });

// Virtual for active collaborators count
DocumentSchema.virtual('activeCollaboratorsCount').get(function() {
  return this.collaborators.length;
});

// Pre-save middleware to update metadata
DocumentSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.metadata.wordCount = this.content.split(/\s+/).filter(word => word.length > 0).length;
    this.metadata.characterCount = this.content.length;
    this.lastModified = new Date();
    this.version += 1;
  }
  next();
});

// Static method to find documents by user
DocumentSchema.statics.findByUser = function(userId: string) {
  return this.find({
    $or: [
      { createdBy: userId },
      { collaborators: userId }
    ]
  }).populate('createdBy', 'username email').sort({ lastModified: -1 });
};

// Static method to find public documents
DocumentSchema.statics.findPublic = function() {
  return this.find({ isPublic: true })
    .populate('createdBy', 'username email')
    .sort({ lastModified: -1 });
};

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
