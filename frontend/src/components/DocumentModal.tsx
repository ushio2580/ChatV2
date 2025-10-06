import React, { useState, useEffect } from 'react';
import { documentService, Document } from '../services/documentService';
import { SimpleCollaborativeEditor } from './SimpleCollaborativeEditor';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  roomId?: string;
  userRole?: string;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  userId,
  roomId,
  userRole
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state for creating new document
  const [newDocument, setNewDocument] = useState({
    title: '',
    isPublic: false
  });

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      
      // Check if user is authenticated
      const authTokens = localStorage.getItem('authTokens');
      if (!authTokens) {
        console.log('User not authenticated, skipping document load');
        setIsLoading(false);
        return;
      }
      
      let allDocs: Document[] = [];
      
      console.log('🔍 Loading documents for:', { userRole, roomId });
      
      if (userRole === 'ADMIN') {
        // Admin can see all documents
        const userDocs = await documentService.getUserDocuments();
        const publicDocs = await documentService.getPublicDocuments();
        
        console.log('👑 Admin - User docs:', userDocs.length, 'Public docs:', publicDocs.length);
        
        // Combine and deduplicate documents
        allDocs = [...userDocs];
        publicDocs.forEach(doc => {
          if (!allDocs.find(d => d.id === doc.id)) {
            allDocs.push(doc);
          }
        });
      } else {
        // Regular users see documents from their current group + public documents
        const groupDocs = roomId ? await documentService.getDocumentsByGroup(roomId) : [];
        const publicDocs = await documentService.getPublicDocuments();
        
        console.log('👤 User - Group docs:', groupDocs.length, 'Public docs:', publicDocs.length);
        console.log('🔍 Current roomId:', roomId);
        
        // Show documents from the current group
        allDocs = [...groupDocs];
        
        // Add public documents that aren't already included
        publicDocs.forEach(doc => {
          if (!allDocs.find(d => d.id === doc.id)) {
            allDocs.push(doc);
          }
        });
        
        console.log('📋 Total docs for user:', allDocs.length);
      }
      
      console.log('📚 Total documents to show:', allDocs.length);
      setDocuments(allDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
      // Don't show error to user, just log it
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!newDocument.title.trim()) return;

    // Check for duplicate names
    const duplicateExists = documents.some(doc => 
      doc.title.toLowerCase() === newDocument.title.toLowerCase()
    );

    if (duplicateExists) {
      const confirmDuplicate = confirm(
        `Ya existe un documento con el nombre "${newDocument.title}". ¿Deseas crear el documento de todos modos?`
      );
      if (!confirmDuplicate) {
        return;
      }
    }

    try {
      // Check if user is authenticated
      const authTokens = localStorage.getItem('authTokens');
      if (!authTokens) {
        console.log('User not authenticated, cannot create document');
        return;
      }
      
      const document = await documentService.createDocument({
        title: newDocument.title,
        roomId,
        isPublic: newDocument.isPublic
      });
      
      // Reload documents to ensure we have the latest data
      await loadDocuments();
      
      setNewDocument({ title: '', isPublic: false });
      setIsCreating(false);
      setSelectedDocument(document);
    } catch (error) {
      console.error('Error creating document:', error);
    }
  };

  const handleOpenDocument = (document: Document) => {
    setSelectedDocument(document);
  };

  const handleTogglePublic = async (document: Document) => {
    try {
      const updatedDocument = await documentService.updateDocument(document.id, {
        isPublic: !document.isPublic
      });
      
      // Reload documents to show the updated state
      await loadDocuments();
      
      console.log(`Document ${document.title} is now ${updatedDocument.isPublic ? 'public' : 'private'}`);
    } catch (error) {
      console.error('Error updating document visibility:', error);
    }
  };

  const handleUpdateTitle = async (document: Document, newTitle: string) => {
    if (!newTitle.trim()) {
      alert('El título no puede estar vacío');
      return;
    }

    // Check for duplicate names
    const duplicateExists = documents.some(doc => 
      doc.id !== document.id && 
      doc.title.toLowerCase() === newTitle.toLowerCase()
    );

    if (duplicateExists) {
      const confirmDuplicate = confirm(
        `Ya existe un documento con el nombre "${newTitle}". ¿Deseas continuar de todos modos?`
      );
      if (!confirmDuplicate) {
        return;
      }
    }

    try {
      const updatedDocument = await documentService.updateDocument(document.id, {
        title: newTitle
      });
      
      // Update the document in the local state immediately for instant feedback
      setDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.id === document.id 
            ? { ...doc, title: newTitle }
            : doc
        )
      );

      // Also update selectedDocument if it's the same document
      if (selectedDocument && selectedDocument.id === document.id) {
        setSelectedDocument(prev => prev ? { ...prev, title: newTitle } : null);
      }
      
      console.log(`Document title updated to: ${newTitle}`);
    } catch (error) {
      console.error('Error updating document title:', error);
      alert('Error al actualizar el título del documento');
    }
  };

  // Handle title change from editor
  const handleEditorTitleChange = (newTitle: string) => {
    if (!selectedDocument) return;
    
    // Update local state immediately for instant feedback
    setDocuments(prevDocs => 
      prevDocs.map(doc => 
        doc.id === selectedDocument.id 
          ? { ...doc, title: newTitle }
          : doc
      )
    );

    // Update selectedDocument
    setSelectedDocument(prev => prev ? { ...prev, title: newTitle } : null);
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await documentService.deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      if (selectedDocument?.id === documentId) {
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-800">📝 Collaborative Documents</h2>
            {selectedDocument && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">→</span>
                <span className="text-lg font-semibold text-blue-600">{selectedDocument.title}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {selectedDocument && (
              <button
                onClick={() => setSelectedDocument(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Back to List
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {selectedDocument ? (
            /* Document Editor */
            <div className="h-full">
              <SimpleCollaborativeEditor
                documentId={selectedDocument.id}
                userId={userId}
                onClose={() => setSelectedDocument(null)}
                onTitleChange={handleEditorTitleChange}
              />
            </div>
          ) : (
            /* Document List */
            <div className="h-full overflow-y-auto p-6">
              {/* Create Document Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {userRole === 'ADMIN' ? 'All Documents' : 'Group Documents'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {userRole === 'ADMIN' 
                        ? 'You can view and manage all documents in the system' 
                        : `Collaborative documents for this group${roomId ? ` (${roomId.substring(0, 8)}...)` : ''}`
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <span>+</span>
                    <span>Create Document</span>
                  </button>
                </div>

                {/* Create Document Form */}
                {isCreating && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Document title..."
                        value={newDocument.title}
                        onChange={(e) => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isPublic"
                          checked={newDocument.isPublic}
                          onChange={(e) => setNewDocument(prev => ({ ...prev, isPublic: e.target.checked }))}
                          className="rounded"
                        />
                        <label htmlFor="isPublic" className="text-sm text-gray-600">
                          Make this document public
                        </label>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleCreateDocument}
                          disabled={!newDocument.title.trim()}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => {
                            setIsCreating(false);
                            setNewDocument({ title: '', isPublic: false });
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Documents List */}
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading documents...</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-6xl mb-4">📄</div>
                  <p>No documents yet. Create your first collaborative document!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map((document) => {
                    if (!document || !document.title) return null;
                    return (
                    <div
                      key={document.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleOpenDocument(document)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <input
                          type="text"
                          value={document.title}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            // Update local state immediately for instant feedback
                            setDocuments(prevDocs => 
                              prevDocs.map(doc => 
                                doc.id === document.id 
                                  ? { ...doc, title: e.target.value }
                                  : doc
                              )
                            );
                          }}
                          onBlur={(e) => {
                            // Always save changes when user finishes editing
                            handleUpdateTitle(document, e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur(); // Trigger onBlur
                            }
                            if (e.key === 'Escape') {
                              // Revert changes - we need to reload from server
                              loadDocuments();
                              e.currentTarget.blur();
                            }
                          }}
                          className="font-semibold text-gray-800 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5 w-full"
                          title="Click to edit title (Enter to save, Escape to cancel)"
                        />
                        <div className="flex items-center space-x-1">
                          {document.isPublic && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Public</span>
                          )}
                          {userRole === 'ADMIN' && document.roomId && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Group: {document.roomId.substring(0, 8)}...
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePublic(document);
                            }}
                            className={`text-sm px-2 py-1 rounded ${
                              document.isPublic 
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                            title={document.isPublic ? 'Make private' : 'Make public'}
                          >
                            {document.isPublic ? 'Make Private' : 'Make Public'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(document.id);
                            }}
                            className="text-red-500 hover:text-red-700 text-sm"
                            title={userRole === 'ADMIN' ? 'Delete document (Admin)' : 'Delete document'}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        Created by: {document.createdBy?.username || 'Unknown'}
                      </p>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>Words: {document.metadata?.wordCount || 0}</div>
                        <div>Characters: {document.metadata?.characterCount || 0}</div>
                        <div>Collaborators: {document.collaborators?.length || 0}</div>
                        <div>Last modified: {new Date(document.lastModified).toLocaleDateString()}</div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
