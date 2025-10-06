import mongoose from 'mongoose';

export interface IFile extends mongoose.Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  roomId?: string;
  isPublic: boolean;
  gridfsId: mongoose.Types.ObjectId;
  // Checksum fields for integrity verification
  checksum: {
    md5: string;
    sha256: string;
    algorithm: string;
    verified: boolean;
    verifiedAt?: Date;
  };
  metadata?: {
    description?: string;
    tags?: string[];
    category?: string;
  };
}

const FileSchema = new mongoose.Schema<IFile>({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  uploadedBy: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  roomId: {
    type: String,
    required: false
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  gridfsId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  // Checksum fields for integrity verification
  checksum: {
    md5: {
      type: String,
      required: true,
      index: true
    },
    sha256: {
      type: String,
      required: true,
      index: true
    },
    algorithm: {
      type: String,
      default: 'sha256',
      enum: ['md5', 'sha256', 'sha512']
    },
    verified: {
      type: Boolean,
      default: false
    },
    verifiedAt: {
      type: Date
    }
  },
  metadata: {
    description: String,
    tags: [String],
    category: String
  }
});

export const File = mongoose.model<IFile>('File', FileSchema);

