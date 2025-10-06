import React, { useState, useEffect } from 'react';
import { fileService, FileInfo } from '../services/fileService';

interface FileListProps {
  roomId?: string;
  userId?: string;
  showAll?: boolean;
  className?: string;
  onResendFile?: (file: FileInfo) => void;
  showResendButton?: boolean;
}

export const FileList: React.FC<FileListProps> = ({
  roomId,
  userId,
  showAll = false,
  className = '',
  onResendFile,
  showResendButton = false
}) => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, [roomId, userId, showAll]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (showAll) {
        response = await fileService.getAllFiles();
      } else if (roomId) {
        response = await fileService.getFilesByRoom(roomId);
      } else if (userId) {
        response = await fileService.getUserFiles(userId);
      } else {
        response = await fileService.getAllFiles();
      }
      
      setFiles(response.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: FileInfo) => {
    try {
      await fileService.downloadFile(file.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await fileService.deleteFile(fileId);
      setFiles(files.filter(f => f.id !== fileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading files...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={loadFiles}
          className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className={`text-center p-8 text-gray-500 dark:text-gray-400 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600">
          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm">No files found</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        >
          {/* File icon */}
          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg mr-3">
            <span className="text-lg">{fileService.getFileIcon(file.mimeType)}</span>
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {file.originalName}
            </p>
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{fileService.formatFileSize(file.size)}</span>
              <span>•</span>
              <span>{formatDate(file.uploadedAt)}</span>
              {file.uploadedBy && (
                <>
                  <span>•</span>
                  <span>by {file.uploadedBy}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {showResendButton && onResendFile && (
              <button
                onClick={() => onResendFile(file)}
                className="p-2 text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors"
                title="Resend/Share this file"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            )}
            <button
              onClick={() => handleDownload(file)}
              className="p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              title="Download"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={() => handleDelete(file.id)}
              className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

