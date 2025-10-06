import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { FileList } from './FileList';
import { fileService, FileUploadResponse, FileInfo } from '../services/fileService';

interface FileShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  userId?: string; // For private chats
  currentUserId?: string; // Current user ID for file ownership
  onFileShared?: (file: FileUploadResponse['file']) => void;
  onFileResent?: (file: FileInfo) => void;
}

export const FileShareModal: React.FC<FileShareModalProps> = ({
  isOpen,
  onClose,
  roomId,
  userId,
  currentUserId,
  onFileShared,
  onFileResent
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'files'>('upload');
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUploadComplete = (response: FileUploadResponse) => {
    setUploadSuccess(`File "${response.file.originalName}" uploaded successfully!`);
    setUploadError(null);
    onFileShared?.(response.file);
    
    // Switch to files tab after successful upload
    setTimeout(() => {
      setActiveTab('files');
      setUploadSuccess(null);
    }, 2000);
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
    setUploadSuccess(null);
  };

  const handleFileShared = (file: any) => {
    onFileShared?.(file);
  };

  const handleFileResent = (file: FileInfo) => {
    onFileResent?.(file);
    onClose(); // Close modal after resending
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            📁 Share Files
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            📤 Upload New
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'files'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            📋 My Files
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Success/Error messages */}
              {uploadSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">{uploadSuccess}</p>
                </div>
              )}
              
              {uploadError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                </div>
              )}

              {/* Upload component */}
              <FileUpload
                roomId={roomId}
                userId={userId}
                currentUserId={currentUserId}
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                className="w-full"
              />

              {/* Upload tips */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  💡 Upload Tips
                </h3>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Maximum file size: 50MB</li>
                  <li>• Supported formats: All file types</li>
                  <li>• Files are stored securely in the cloud</li>
                  <li>• You can share files with specific groups or make them public</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Your Files
                </h3>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {roomId ? 'Files in this room' : 'All your files'}
                </div>
              </div>
              
              <FileList
                roomId={roomId}
                userId={userId}
                showAll={!roomId && !userId}
                className="max-h-64 overflow-y-auto"
                showResendButton={true}
                onResendFile={handleFileResent}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

