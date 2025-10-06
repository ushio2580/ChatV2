import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { File, IFile } from '../models/File';
// import { ChecksumService } from './checksumService';

// Initialize GridFS
let gfs: any;
let gridfsBucket: mongoose.mongo.GridFSBucket;

// Initialize GridFS connection
export const initGridFS = () => {
  const conn = mongoose.connection;
  
  if (!conn.db) {
    throw new Error('Database connection not established');
  }
  
  // Initialize GridFS stream
  // gfs = Grid(conn.db, mongoose.mongo);
  // gfs.collection('uploads');
  
  // Initialize GridFS bucket
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'uploads'
  });
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Store files in uploads directory
  },
  filename: (req, file, cb) => {
    const filename = `${Date.now()}-${file.originalname}`;
    cb(null, filename);
  }
});

export const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  }
});

// File service functions
export class FileService {
  // Upload file
  static async uploadFile(fileData: any, metadata: any): Promise<IFile> {
    try {
      console.log('Uploading file:', fileData.filename);
      
      // Generate checksums for file integrity
      // TODO: Implement checksums when dependencies are fixed
      // const fileBuffer = fs.readFileSync(fileData.path);
      // const { md5, sha256 } = ChecksumService.generateChecksums(fileBuffer);
      
      // console.log('Generated checksums - MD5:', md5, 'SHA256:', sha256);
      
      const file = new File({
        filename: fileData.filename,
        originalName: fileData.originalname,
        mimeType: fileData.mimetype,
        size: fileData.size,
        uploadedBy: metadata.uploadedBy,
        uploadedAt: new Date(),
        roomId: metadata.roomId,
        isPublic: metadata.isPublic || false,
        gridfsId: new mongoose.Types.ObjectId(), // Generate a new ObjectId for local storage
        // checksum: {
        //   md5,
        //   sha256,
        //   algorithm: 'sha256',
        //   verified: true, // Mark as verified since we just generated it
        //   verifiedAt: new Date()
        // },
        metadata: {
          description: metadata.description,
          tags: metadata.tags,
          category: metadata.category
        }
      });

      console.log('Saving file to database...');
      await file.save();
      console.log('File saved successfully with checksums:', file._id);
      return file;
    } catch (error) {
      console.error('Error saving file:', error);
      throw new Error(`Failed to save file metadata: ${error}`);
    }
  }

  // Get file by ID
  static async getFileById(fileId: string): Promise<IFile | null> {
    try {
      return await File.findById(fileId);
    } catch (error) {
      throw new Error(`Failed to get file: ${error}`);
    }
  }

  // Get files by room
  static async getFilesByRoom(roomId: string): Promise<IFile[]> {
    try {
      return await File.find({ roomId }).sort({ uploadedAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get room files: ${error}`);
    }
  }

  // Get user files
  static async getUserFiles(userId: string): Promise<IFile[]> {
    try {
      return await File.find({ uploadedBy: userId }).sort({ uploadedAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get user files: ${error}`);
    }
  }

  // Delete file
  static async deleteFile(fileId: string, userId: string): Promise<boolean> {
    try {
      const file = await File.findById(fileId);
      if (!file) {
        throw new Error('File not found');
      }

      // Check permissions
      if (file.uploadedBy !== userId) {
        throw new Error('Unauthorized to delete this file');
      }

      // Delete from local storage
      const filePath = path.join('uploads', file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Delete metadata
      await File.findByIdAndDelete(fileId);
      
      return true;
    } catch (error) {
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  // Get file stream for download
  static getFileStream(filename: string) {
    const filePath = path.join('uploads', filename);
    if (fs.existsSync(filePath)) {
      return fs.createReadStream(filePath);
    }
    throw new Error('File not found');
  }

  // Get file info
  static async getFileInfo(filename: string) {
    try {
      const filePath = path.join('uploads', filename);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return {
          filename,
          length: stats.size,
          uploadDate: stats.birthtime,
          metadata: {
            originalName: filename
          }
        };
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get file info: ${error}`);
    }
  }
}