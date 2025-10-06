import mongoose, { Schema, Document } from 'mongoose';

// Document Version Interface
export interface IDocumentVersion extends Document {
  _id: string;
  documentId: string;
  version: number;
  content: string;
  title: string;
  snapshot: boolean;
  snapshotName?: string;
  snapshotDescription?: string;
  createdBy: string;
  createdAt: Date;
  changeSummary: {
    addedLines: number;
    removedLines: number;
    modifiedLines: number;
    totalChanges: number;
  };
  collaborators: string[];
  metadata: {
    wordCount: number;
    characterCount: number;
    lineCount: number;
    language?: string;
  };
  tags: string[];
  isAutoSave: boolean;
  parentVersion?: string;
}

// Document Version Schema
const DocumentVersionSchema = new Schema({
  documentId: { 
    type: String, 
    required: true,
    index: true 
  },
  version: { 
    type: Number, 
    required: true,
    index: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  snapshot: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  snapshotName: { 
    type: String,
    maxlength: 100
  },
  snapshotDescription: { 
    type: String,
    maxlength: 500
  },
  createdBy: { 
    type: String, 
    required: true,
    index: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  changeSummary: {
    addedLines: { type: Number, default: 0 },
    removedLines: { type: Number, default: 0 },
    modifiedLines: { type: Number, default: 0 },
    totalChanges: { type: Number, default: 0 }
  },
  collaborators: [{ 
    type: String
  }],
  metadata: {
    wordCount: { type: Number, default: 0 },
    characterCount: { type: Number, default: 0 },
    lineCount: { type: Number, default: 0 },
    language: { type: String, default: 'text' }
  },
  tags: [{ 
    type: String,
    maxlength: 50
  }],
  isAutoSave: { 
    type: Boolean, 
    default: false 
  },
  parentVersion: { 
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
DocumentVersionSchema.index({ documentId: 1, version: -1 });
DocumentVersionSchema.index({ documentId: 1, snapshot: 1 });
DocumentVersionSchema.index({ documentId: 1, createdAt: -1 });
DocumentVersionSchema.index({ createdBy: 1, createdAt: -1 });

export const DocumentVersion = mongoose.model<IDocumentVersion>('DocumentVersion', DocumentVersionSchema);