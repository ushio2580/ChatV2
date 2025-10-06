import React, { useState, useEffect, useRef } from 'react';

interface SimpleCollaborativeEditorProps {
  documentId: string;
  userId: string;
  onClose: () => void;
  onTitleChange?: (newTitle: string) => void;
}

interface Collaborator {
  id: string;
  username: string;
  color: string;
  cursorPosition?: number;
}

export const SimpleCollaborativeEditor: React.FC<SimpleCollaborativeEditorProps> = ({
  documentId,
  userId,
  onClose,
  onTitleChange
}) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Simulate real-time collaboration
  useEffect(() => {
    // Mock collaborators for demonstration
    const mockCollaborators: Collaborator[] = [
      { id: '1', username: 'Admin', color: '#3B82F6' },
      { id: '2', username: 'newuser', color: '#10B981' },
      { id: '3', username: 'Developer', color: '#F59E0B' }
    ];
    
    setCollaborators(mockCollaborators);
    setIsConnected(true);
    
    // Simulate cursor movements
    const interval = setInterval(() => {
      setCollaborators(prev => prev.map(collab => ({
        ...collab,
        cursorPosition: Math.floor(Math.random() * content.length)
      })));
    }, 2000);
    
    return () => clearInterval(interval);
  }, [content]);

  // Calculate statistics
  const calculateStats = (text: string) => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharCount(text.length);
  };

  // Convert Markdown to HTML for preview
  const markdownToHtml = (markdown: string): string => {
    return markdown
      // Bold: **text** -> <strong>text</strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic: *text* -> <em>text</em>
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Underline: __text__ -> <u>text</u>
      .replace(/__(.*?)__/g, '<u>$1</u>')
      // Links: [text](url) -> <a href="url">text</a>
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-600 hover:underline">$1</a>')
      // Images: ![alt](url) -> <img src="url" alt="alt">
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg shadow-md my-2" onerror="this.style.display=\'none\'">')
      // Line breaks
      .replace(/\n/g, '<br>');
  };

  // Load document content
  useEffect(() => {
    const loadDocument = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Using simple endpoint that doesn't require authentication
        
        const response = await fetch(`http://localhost:3003/api/documents/simple/${documentId}`);

        if (!response.ok) {
          throw new Error(`Failed to load document: ${response.status}`);
        }

        const data = await response.json();
        setContent(data.document?.content || '');
        setTitle(data.document?.title || 'Untitled Document');
        calculateStats(data.document?.content || '');
        console.log('Document loaded successfully:', data);
      } catch (err) {
        console.error('Error loading document:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [documentId]);

  // Auto-save functionality
  useEffect(() => {
    if (content && !isLoading) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for auto-save
      saveTimeoutRef.current = setTimeout(() => {
        saveDocument();
      }, 2000); // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, isLoading]);

  const saveDocument = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Using simple endpoint that doesn't require authentication

      const response = await fetch(`http://localhost:3003/api/documents/simple/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content,
          title: title || 'Untitled Document'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save document: ${response.status}`);
      }

      console.log('Document saved successfully');
      setLastSaved(new Date());
      calculateStats(content);
    } catch (err) {
      console.error('Error saving document:', err);
      setError(err instanceof Error ? err.message : 'Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    calculateStats(newContent);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    // Notify parent component about title change
    if (onTitleChange) {
      onTitleChange(newTitle);
    }
  };

  const handleSave = () => {
    saveDocument();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Formatting functions - Visual formatting
  const applyFormatting = (format: 'bold' | 'italic' | 'underline') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    if (!selectedText) {
      // If no text selected, insert placeholder
      let placeholder = '';
      switch (format) {
        case 'bold':
          placeholder = '**Texto en negrita**';
          break;
        case 'italic':
          placeholder = '*Texto en cursiva*';
          break;
        case 'underline':
          placeholder = '__Texto subrayado__';
          break;
      }
      
      const newContent = content.substring(0, start) + placeholder + content.substring(end);
      setContent(newContent);
      calculateStats(newContent);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
      return;
    }
    
    // Apply formatting to selected text
    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `__${selectedText}__`;
        break;
    }
    
    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);
    calculateStats(newContent);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  };

  // Insert content functions - Improved with prompts
  const insertContent = (type: 'image' | 'link') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    let insertText = '';
    let promptText = '';
    
    switch (type) {
      case 'image':
        promptText = prompt('Ingresa la URL de la imagen:');
        if (promptText) {
          const description = prompt('Ingresa la descripción de la imagen (opcional):') || 'Imagen';
          insertText = `![${description}](${promptText})`;
        } else {
          return; // User cancelled
        }
        break;
      case 'link':
        const linkUrl = prompt('Ingresa la URL del enlace:');
        if (linkUrl) {
          const linkText = prompt('Ingresa el texto del enlace (opcional):') || linkUrl;
          insertText = `[${linkText}](${linkUrl})`;
        } else {
          return; // User cancelled
        }
        break;
    }
    
    const newContent = content.substring(0, start) + insertText + content.substring(end);
    setContent(newContent);
    calculateStats(newContent);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertText.length, start + insertText.length);
    }, 0);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        applyFormatting('bold');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        applyFormatting('italic');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        applyFormatting('underline');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-100">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800">Loading Document</h3>
              <p className="text-sm text-gray-600 mt-1">Please wait while we fetch your content...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center z-50 ${isFullscreen ? 'p-0' : 'p-4'}`}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full mx-4 flex flex-col border border-gray-200 ${isFullscreen ? 'h-screen max-w-none' : 'max-w-6xl h-5/6'}`}>
        
        {/* Modern Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">📝</span>
            </div>
            <div>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                className="text-xl font-bold text-gray-800 bg-transparent border-none outline-none focus:ring-0"
                placeholder="Untitled Document"
              />
              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                <span>Document ID: {documentId.slice(-8)}</span>
                {lastSaved && (
                  <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Collaboration Status */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium text-gray-600">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {/* Collaborators */}
              {showCollaborators && collaborators.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Collaborators:</span>
                  <div className="flex -space-x-2">
                    {collaborators.slice(0, 3).map((collaborator) => (
                      <div
                        key={collaborator.id}
                        className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white shadow-lg"
                        style={{ backgroundColor: collaborator.color }}
                        title={collaborator.username}
                      >
                        {collaborator.username.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {collaborators.length > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-xs font-medium text-white shadow-lg">
                        +{collaborators.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Status Indicators */}
            <div className="flex items-center space-x-2">
              {isSaving ? (
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm font-medium">Saving...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Saved</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCollaborators(!showCollaborators)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Toggle Collaborators"
              >
                👥
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Toggle Fullscreen (Ctrl+F)"
              >
                {isFullscreen ? '⤓' : '⤢'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
                title="Save Document (Ctrl+S)"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close Editor"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
            <div className="flex items-center">
              <div className="text-red-400 mr-3">⚠️</div>
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Editor Area */}
        <div className="flex-1 p-6 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="h-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden relative">
            {/* Simplified Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Format:</span>
                  <button 
                    onClick={() => applyFormatting('bold')}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-bold"
                    title="Bold (Ctrl+B)"
                  >
                    B
                  </button>
                  <button 
                    onClick={() => applyFormatting('italic')}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors italic"
                    title="Italic (Ctrl+I)"
                  >
                    I
                  </button>
                  <button 
                    onClick={() => applyFormatting('underline')}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors underline"
                    title="Underline (Ctrl+U)"
                  >
                    U
                  </button>
                </div>
                <div className="w-px h-6 bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Insert:</span>
                  <button 
                    onClick={() => insertContent('image')}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Insert Image"
                  >
                    📷 Image
                  </button>
                  <button 
                    onClick={() => insertContent('link')}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Insert Link"
                  >
                    🔗 Link
                  </button>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    isPreviewMode 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title="Toggle Preview Mode"
                >
                  {isPreviewMode ? '✏️ Edit' : '👁️ Preview'}
                </button>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span>Auto-save enabled</span>
                </div>
              </div>
            </div>
            
            {/* Text Editor or Preview */}
            <div className="h-full p-6">
              {isPreviewMode ? (
                <div 
                  className="w-full h-full overflow-y-auto text-gray-800 leading-relaxed text-lg font-normal prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
                />
              ) : (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleContentChange}
                  placeholder="Start writing your document... Use formatting buttons or shortcuts (Ctrl+B, Ctrl+I, Ctrl+U)"
                  className="w-full h-full resize-none border-none outline-none text-gray-800 leading-relaxed text-lg font-normal"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                />
              )}
            </div>
            
            {/* Collaboration Overlay - Fixed positioning */}
            {showCollaborators && collaborators.length > 0 && (
              <div className="absolute top-16 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-xl border border-gray-200 z-10 max-w-48">
                <div className="text-xs text-gray-600 mb-2 font-medium">Active Collaborators:</div>
                <div className="flex flex-col space-y-2">
                  {collaborators.map((collaborator) => (
                    <div key={collaborator.id} className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: collaborator.color }}
                      ></div>
                      <span className="text-xs text-gray-700 font-medium">{collaborator.username}</span>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Simplified Footer */}
        <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <span>Words: <span className="font-semibold text-gray-800">{wordCount.toLocaleString()}</span></span>
                <span>Characters: <span className="font-semibold text-gray-800">{charCount.toLocaleString()}</span></span>
              </div>
              {collaborators.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>{collaborators.length} collaborator{collaborators.length > 1 ? 's' : ''} online</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>⌨️ Ctrl+S to save</span>
              <span>🔍 Ctrl+F for fullscreen</span>
              <span>👁️ Click Preview to see formatted text</span>
              <span>✏️ Select text and use B/I/U buttons</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
