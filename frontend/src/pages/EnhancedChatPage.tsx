import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CreateGroupModal from '../components/CreateGroupModal';
import ChatStats from '../components/ChatStats';
import UserProfile from '../components/UserProfile';
import QuickUserStats from '../components/QuickUserStats';
import UnifiedUserPanel from '../components/UnifiedUserPanel';
import SystemInfo from '../components/SystemInfo';
import ConnectionStatus from '../components/ConnectionStatus';
import { DocumentModal } from '../components/DocumentModal';
import { FileShareModal } from '../components/FileShareModal';
import { AdminPanel } from '../components/AdminPanel';
import { ModeratorPanel } from '../components/ModeratorPanel';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { fileService, type FileInfo } from '../services/fileService';
import { socketService } from '../services/socketService';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: 'TEXT' | 'SYSTEM' | 'IMAGE' | 'FILE';
  fileInfo?: FileInfo;
}

interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isOnline: boolean;
  lastSeen: Date;
  mutedUntil?: Date;
  muteReason?: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  type: string;
  ownerId: string;
  members: string[];
  admins: string[];
  memberCount?: number;
  settings: {
    maxMembers: number;
    allowFileUpload: boolean;
    allowAnonymous: boolean;
  };
  createdAt: Date;
}

const EnhancedChatPage: React.FC = () => {
  const { user, logout } = useAuth();
  
  // Helper functions for localStorage
  const saveGroupMessagesToStorage = (messages: {[groupId: string]: Message[]}) => {
    try {
      localStorage.setItem('groupMessages', JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving group messages to localStorage:', error);
    }
  };
  
  
  const saveFilesCacheToStorage = (cache: {[key: string]: FileInfo[]}) => {
    try {
      localStorage.setItem('filesCache', JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving files cache to localStorage:', error);
    }
  };
  
  const getCurrentChatKey = () => {
    return selectedGroup || `private_${selectedUser}`;
  };
  
  const loadFilesFromCache = (chatKey: string) => {
    const cachedFiles = filesCache[chatKey] || [];
    // Loading files from cache
    setSharedFiles(cachedFiles);
    return cachedFiles;
  };
  
  
  const saveFilesToCache = (chatKey: string, files: FileInfo[]) => {
    const newCache = { ...filesCache, [chatKey]: files };
    setFilesCache(newCache);
    saveFilesCacheToStorage(newCache);
    // Files saved to cache
  };
  
  
  const handleFileShared = async (file: FileInfo) => {
    // Verificar si el usuario está silenciado
    if ((user as any)?.mutedUntil) {
      setNotification({ 
        type: 'error', 
        message: 'You cannot share files because you are muted' 
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Add file message to current group or private chat
    if (selectedGroup || selectedUser) {
      // Check if it's an image to show inline preview
      const isImage = file.mimeType.startsWith('image/');
      
      const fileMessage: Message = {
        id: `file-${Date.now()}`,
        content: isImage ? 
          `🖼️ Shared image: ${file.originalName}` : 
          `📁 Shared file: ${file.originalName}`,
        senderId: user?.id || 'current-user',
        senderName: user?.username || 'You',
        timestamp: new Date(),
        type: isImage ? 'IMAGE' : 'FILE',
        fileInfo: isImage ? file : undefined
      };
      
      setMessages(prev => [...prev, fileMessage]);
      
      // Update cache for this group or private chat
      const cacheKey = selectedGroup || `private_${selectedUser}`;
      const newGroupMessages = {
        ...groupMessages,
        [cacheKey]: [...(groupMessages[cacheKey] || []), fileMessage]
      };
      setGroupMessages(newGroupMessages);
      saveGroupMessagesToStorage(newGroupMessages);
      
      // Update files cache
      const newFiles = [...sharedFiles, file];
      setSharedFiles(newFiles);
      saveFilesToCache(cacheKey, newFiles);
      // Files cache updated
      
      // Emit file shared event via socket
      if (selectedGroup) {
        socketService.shareFile(selectedGroup, file.id);
      } else if (selectedUser) {
        // For private chats, we might need a different socket event
        socketService.shareFile(`private_${selectedUser}`, file.id);
      }
      
      // Reload files list to show the newly uploaded file
      try {
        setIsLoadingFiles(true);
        await loadFiles();
        
        // Show success notification
        setNotification({
          type: 'success',
          message: 'File shared successfully!'
        });
        setTimeout(() => setNotification(null), 2000);
      } catch (error) {
        console.error('Error reloading files:', error);
        setNotification({
          type: 'error',
          message: 'Failed to update file list'
        });
        setTimeout(() => setNotification(null), 3000);
      } finally {
        setIsLoadingFiles(false);
      }
    }
  };
  
  const handleFileResent = async (file: FileInfo) => {
    // Verificar si el usuario está silenciado
    if ((user as any)?.mutedUntil) {
      setNotification({ 
        type: 'error', 
        message: 'You cannot resend files because you are muted' 
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Reuse the same logic as handleFileShared for consistency
    await handleFileShared(file);
  };
  
  const handleFilePreview = (file: FileInfo) => {
    setSelectedFile(file);
    setShowFilePreview(true);
  };
  
  
  const getFilePreviewUrl = (file: FileInfo): string => {
    const baseUrl = `http://localhost:3003/api/files/${file.id}/download`;
    
    // For images and PDFs, add preview=true to show inline instead of download
    if (file.mimeType.startsWith('image/') || file.mimeType.includes('pdf')) {
      return `${baseUrl}?preview=true`;
    }
    
    return baseUrl;
  };
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Welcome to the enhanced chat platform! This is a demo message.',
      senderId: 'system',
      senderName: 'System',
      timestamp: new Date(),
      type: 'SYSTEM'
    }
  ]);
  
  // Load group messages from localStorage on component mount
  const [groupMessages, setGroupMessages] = useState<{[groupId: string]: Message[]}>(() => {
    try {
      const saved = localStorage.getItem('groupMessages');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        const converted: {[groupId: string]: Message[]} = {};
        for (const [groupId, messages] of Object.entries(parsed)) {
          converted[groupId] = (messages as Message[]).map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        }
        return converted;
      }
      return {};
    } catch (error) {
      console.error('Error loading group messages from localStorage:', error);
      return {};
    }
  });
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUserList, setShowUserList] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showFileShare, setShowFileShare] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showModeratorPanel, setShowModeratorPanel] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [sharedFiles, setSharedFiles] = useState<FileInfo[]>(() => {
    try {
      const saved = localStorage.getItem('sharedFiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        return parsed.map((file: any) => ({
          ...file,
          uploadedAt: new Date(file.uploadedAt)
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading shared files from localStorage:', error);
      return [];
    }
  });
  
  // Cache de archivos por chat
  const [filesCache, setFilesCache] = useState<{[key: string]: FileInfo[]}>(() => {
    try {
      const saved = localStorage.getItem('filesCache');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        Object.keys(parsed).forEach(key => {
          parsed[key] = parsed[key].map((file: any) => ({
            ...file,
            uploadedAt: new Date(file.uploadedAt)
          }));
        });
        return parsed;
      }
      return {};
    } catch (error) {
      console.error('Error loading files cache from localStorage:', error);
      return {};
    }
  });
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [filesViewMode, setFilesViewMode] = useState<'list' | 'grid'>('list');
  const [selectedGroupForAddMember, setSelectedGroupForAddMember] = useState<Group | null>(null);
  const [selectedGroupForInfo, setSelectedGroupForInfo] = useState<Group | null>(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameInput, setRenameInput] = useState('');

  
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen for group updates via Socket.IO
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleGroupUpdate = (data: any) => {
      // Group update received
      
      if (data.action === 'member-added' || data.action === 'member-removed' || data.action === 'member-left') {
        // Update groups list
        setGroups(prevGroups => 
          prevGroups.map(group => 
            group.id === data.groupId 
              ? { ...group, memberCount: data.memberCount }
              : group
          )
        );
        
        // If this is the current user being added to a group, reload groups
        if (data.action === 'member-added' && data.userId === user?.id) {
          loadGroups();
        }
        
        // If this is the current user leaving a group, reload groups
        if (data.action === 'member-left' && data.userId === user?.id) {
          loadGroups();
        }
      }
      
      // Handle group deletion
      if (data.action === 'group-deleted') {
        // Remove group from list
        setGroups(prevGroups => 
          prevGroups.filter(group => group.id !== data.groupId)
        );
        
        // If we're currently in this group, switch to first available group
        if (selectedGroup === data.groupId) {
          const availableGroups = groups.filter(g => g.id !== data.groupId);
          if (availableGroups.length > 0) {
            const newSelectedGroup = availableGroups[0];
            setSelectedGroup(newSelectedGroup.id);
            loadGroupMessages(newSelectedGroup.id);
            loadFilesForGroup(newSelectedGroup.id);
          } else {
            setSelectedGroup('');
          }
        }
        
        // Show notification
        setNotification({ 
          type: 'success', 
          message: `Group "${data.groupName}" has been deleted` 
        });
        setTimeout(() => setNotification(null), 3000);
      }
    };

    socket.on('group-updated', handleGroupUpdate);
    socket.on('group-deleted', handleGroupUpdate);

    return () => {
      const currentSocket = socketService.getSocket();
      if (currentSocket) {
        currentSocket.off('group-updated', handleGroupUpdate);
        currentSocket.off('group-deleted', handleGroupUpdate);
      }
    };
  }, [user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {

  const initializeApp = async () => {
      // Initializing app
      
      // Small delay to ensure backend is ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Initialize socket connection
      try {
        const token = localStorage.getItem('authTokens');
        if (token) {
          const authData = JSON.parse(token);
          socketService.connect(authData.accessToken);
        }
      } catch (error) {
        console.error('Error initializing socket:', error);
      }
      
      await loadUsers();
      await loadGroups();
      // Messages and files will be loaded automatically when a group is selected
      await testConnection();
    };
    
    initializeApp();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const testConnection = async () => {
    try {
      const response = await fetch('http://localhost:3003/health');
      const data = await response.json();
      setIsConnected(true);
      setError(null);
    } catch (error) {
      setIsConnected(false);
      setError('Backend connection failed');
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/users');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter out users without valid IDs
      const validUsers = (data.users || []).filter((user: any) => user.id && user.username);
      setUsers(validUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
      
      // Retry after 2 seconds
      setTimeout(() => {
        loadUsers();
      }, 2000);
    }
  };

  // Add member to group
  const addMemberToGroup = async (groupId: string, userId: string) => {
    try {
      const response = await fetch(`http://localhost:3003/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add member');
      }

      const result = await response.json();
      
      // Don't update groups here - let Socket.IO handle it
      // The Socket.IO event will update the groups list automatically
      
      setNotification({ type: 'success', message: result.message });
      setTimeout(() => setNotification(null), 3000);
      
      return result;
    } catch (error) {
      console.error('Error adding member to group:', error);
      setNotification({ type: 'error', message: error instanceof Error ? error.message : 'Failed to add member' });
      setTimeout(() => setNotification(null), 3000);
      throw error;
    }
  };

  // Remove member from group
  const removeMemberFromGroup = async (groupId: string, userId: string) => {
    try {
      const response = await fetch(`http://localhost:3003/api/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove member');
      }

      const result = await response.json();
      
      // Don't update groups here - let Socket.IO handle it
      // The Socket.IO event will update the groups list automatically
      
      setNotification({ type: 'success', message: result.message });
      setTimeout(() => setNotification(null), 3000);
      
      return result;
    } catch (error) {
      console.error('Error removing member from group:', error);
      setNotification({ type: 'error', message: error instanceof Error ? error.message : 'Failed to remove member' });
      setTimeout(() => setNotification(null), 3000);
      throw error;
    }
  };

  // Leave group
  const leaveGroup = async (groupId: string) => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`http://localhost:3003/api/groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave group');
      }

      const result = await response.json();
      
      // Don't update groups here - let Socket.IO handle it
      // The Socket.IO event will update the groups list automatically
      
      setNotification({ type: 'success', message: result.message });
      setTimeout(() => setNotification(null), 3000);
      
      // If we're currently in this group, switch to General
      if (selectedGroup === groupId) {
        setSelectedGroup('68d41507d41aec61be1a3369'); // Switch to General
        loadGroupMessages('68d41507d41aec61be1a3369');
        loadFilesForGroup('68d41507d41aec61be1a3369');
      }
      
      return result;
    } catch (error) {
      console.error('Error leaving group:', error);
      setNotification({ type: 'error', message: error instanceof Error ? error.message : 'Failed to leave group' });
      setTimeout(() => setNotification(null), 3000);
      throw error;
    }
  };

  // Show group details
  const showGroupDetails = (group: Group) => {
    setSelectedGroupForInfo(group);
    setShowGroupInfo(true);
  };

  // Force reload groups (clear cache and reload)
  const clearAllFilesCache = () => {
    console.log('🧹 Clearing all files cache');
    setFilesCache({});
    setSharedFiles([]);
    localStorage.removeItem('filesCache');
  };

  const forceReloadGroups = async () => {
    try {
      // Clear localStorage cache
      localStorage.removeItem('groupMessages');
      localStorage.removeItem('sharedFiles');
      localStorage.removeItem('filesCache'); // Add files cache clearing
      
      // Clear in-memory cache
      setGroupMessages({});
      setSharedFiles([]);
      setFilesCache({}); // Clear files cache
      
      // Reload groups
      await loadGroups();
      
      setNotification({ type: 'success', message: 'Groups reloaded successfully' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error reloading groups:', error);
      setNotification({ type: 'error', message: 'Error al recargar grupos' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/groups');
      const data = await response.json();
      
      // Transform MongoDB groups to frontend format
      const validGroups = (data.groups || []).map((group: any) => ({
        id: group.id || group._id, // Use id if available, otherwise _id
        name: group.name,
        description: group.description,
        type: group.type,
        ownerId: group.ownerId,
        members: group.members || [],
        admins: group.admins || [],
        memberCount: group.memberCount || (group.members ? group.members.length : 0),
        createdAt: group.createdAt,
        settings: group.settings
      })).filter((group: any) => group.id && group.name);
      
      // Remove duplicates based on group ID and name
      const uniqueGroups = validGroups.reduce((acc: any[], current: any) => {
        const existingGroup = acc.find(group => 
          group.id === current.id || 
          (group.name === current.name && group.ownerId === current.ownerId)
        );
        if (!existingGroup) {
          acc.push(current);
        } else {
          // If we find a duplicate, keep the one with more members or newer creation date
          const existingIndex = acc.findIndex(group => 
            group.id === current.id || 
            (group.name === current.name && group.ownerId === current.ownerId)
          );
          if (existingIndex !== -1) {
            const existing = acc[existingIndex];
            // Keep the group with more members, or if equal, keep the newer one
            if (current.memberCount > existing.memberCount || 
                (current.memberCount === existing.memberCount && new Date(current.createdAt) > new Date(existing.createdAt))) {
              acc[existingIndex] = current;
            }
          }
        }
        return acc;
      }, []);
      
      setGroups(uniqueGroups);
      
      // Auto-select the first available group if none selected
      setTimeout(() => {
        if (!selectedGroup && groups.length > 0) {
          const firstGroup = groups[0];
          console.log('🎯 Auto-selecting first available group:', firstGroup.id, '(name:', firstGroup.name, ')');
          setSelectedGroup(firstGroup.id);
          loadGroupMessages(firstGroup.id);
          loadFilesForGroup(firstGroup.id);
        }
      }, 500);
    } catch (error) {
      console.error('Error loading groups:', error);
      setError('Failed to load groups');
    }
  };

  const loadMessages = async () => {
    if (!selectedGroup) {
      console.log('🚫 No group selected, skipping message load');
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3003/api/groups/${selectedGroup}/messages`);
      const data = await response.json();
      
      if (data.messages) {
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg._id,
          content: msg.content,
          senderId: msg.senderId,
          senderName: msg.senderName || 'Unknown',
          timestamp: new Date(msg.timestamp),
          type: 'TEXT'
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load messages');
    }
  };

  const loadFiles = async () => {
    if (!selectedGroup && !selectedUser) {
      console.log('🚫 No group or user selected, skipping file load');
      return;
    }
    
    try {
      setIsLoadingFiles(true);
      const roomId = selectedGroup || `private_${selectedUser}`;
      const chatKey = getCurrentChatKey();
      
      // Loading files for current chat
      
      // Cargar archivos del chat actual desde cache
      const cachedFiles = filesCache[chatKey] || [];
      // Using cached files
      
      // Mostrar archivos del cache inmediatamente
      setSharedFiles(cachedFiles);
      // Displaying cached files
      
      // Luego cargar desde servidor para actualizar
      const response = await fileService.getFilesByRoom(roomId);
      const files = response.files || [];
      console.log('📁 Server files loaded:', files.length, files);
      
      // Solo actualizar si el servidor tiene MÁS archivos que el cache
      if (files.length > cachedFiles.length) {
        // Server has more files, updating cache
        saveFilesToCache(chatKey, files);
        setSharedFiles(files);
      } else if (files.length === 0 && cachedFiles.length > 0) {
        // Server has no files, keeping cache
      } else if (files.length === cachedFiles.length && files.length > 0) {
        // Server and cache synchronized
      } else {
        // No files in server or cache
      }
      
    } catch (error) {
      console.error('❌ Error loading files:', error);
      // En caso de error, mantener archivos del cache
      const chatKey = getCurrentChatKey();
      const cachedFiles = filesCache[chatKey] || [];
      setSharedFiles(cachedFiles);
      console.log('📁 Error fallback to cache:', cachedFiles.length);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const loadFilesForGroup = async (groupId: string) => {
    try {
      setIsLoadingFiles(true);
      // Loading files for group
      
      // Primero cargar desde cache
      const cachedFiles = loadFilesFromCache(groupId);
      // Using cached group files
      
      // Mostrar archivos del cache inmediatamente
      setSharedFiles(cachedFiles);
      console.log('📁 Set sharedFiles to:', cachedFiles.length);
      
      // Luego cargar desde servidor
      const response = await fileService.getFilesByRoom(groupId);
      const files = response.files || [];
      // Server files loaded
      
      // Solo actualizar si el servidor tiene MÁS archivos que el cache
      if (files.length > cachedFiles.length) {
        // Updating group files cache
        saveFilesToCache(groupId, files);
        setSharedFiles(files);
      } else if (files.length === 0 && cachedFiles.length > 0) {
        // Keeping cached group files
      } else if (files.length === cachedFiles.length && files.length > 0) {
        // Group files synchronized
      } else if (files.length > 0 && cachedFiles.length === 0) {
        console.log('📁 Server has files but cache is empty, updating cache');
        saveFilesToCache(groupId, files);
        setSharedFiles(files);
      } else {
        // No group files available
      }
      
    } catch (error) {
      console.error('Error loading files:', error);
      // En caso de error, mantener archivos del cache
      const cachedFiles = filesCache[groupId] || [];
      setSharedFiles(cachedFiles);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const loadGroupMessages = async (groupId: string) => {
    try {
      // Check if messages are already cached
      if (groupMessages[groupId]) {
        setMessages(groupMessages[groupId]);
        return;
      }

      const response = await fetch(`http://localhost:3003/api/groups/${groupId}/messages`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.messages) {
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg._id,
          content: msg.content,
          senderId: msg.senderId,
          senderName: msg.senderName || 'Unknown',
          timestamp: new Date(msg.timestamp),
          type: 'TEXT'
        }));
        
        // Cache the messages for this group
        const newGroupMessages = {
          ...groupMessages,
          [groupId]: formattedMessages
        };
        setGroupMessages(newGroupMessages);
        saveGroupMessagesToStorage(newGroupMessages);
        
        // Set current messages
        setMessages(formattedMessages);
      } else {
        // Cache empty array
        const newGroupMessages = {
          ...groupMessages,
          [groupId]: []
        };
        setGroupMessages(newGroupMessages);
        saveGroupMessagesToStorage(newGroupMessages);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading group messages:', error);
      setError('Failed to load group messages');
      setMessages([]);
      
      // Retry after 2 seconds
      setTimeout(() => {
        loadGroupMessages(groupId);
      }, 2000);
    }
  };


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    // Verificar si el usuario está silenciado
    if ((user as any)?.mutedUntil) {
      setNotification({ 
        type: 'error', 
        message: 'You cannot send messages because you are muted' 
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Validate that either a group or user is selected
    if (!selectedGroup && !selectedUser) {
      setError('Please select a group or user to send a message to.');
      return;
    }

    try {
      let response;
      
      if (selectedUser) {
        // Send private message
        console.log('🚀 Sending private message to user:', selectedUser);
        console.log('📝 Message content:', newMessage.trim());
        
        response = await fetch(`http://localhost:3003/api/messages/private/${selectedUser}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: newMessage.trim(),
            senderId: user?.id,
            senderName: user?.username,
            type: 'TEXT'
          }),
        });
      } else {
        // Send group message
        console.log('🚀 Sending message to group:', selectedGroup);
        console.log('📝 Message content:', newMessage.trim());
        
        response = await fetch(`http://localhost:3003/api/messages/group/${selectedGroup}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: newMessage.trim(),
            senderId: user?.id,
            senderName: user?.username,
            type: 'TEXT'
          }),
        });
      }
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        
        const tempMessage: Message = {
          id: data.messageData?.id || `temp-${Date.now()}`,
          content: newMessage.trim(),
          senderId: user?.id || 'unknown',
          senderName: user?.username || 'You',
          timestamp: new Date(),
          type: 'TEXT'
        };
        
        setMessages(prev => [...prev, tempMessage]);
        
        // Update cache for this group
        const newGroupMessages = {
          ...groupMessages,
          [selectedGroup]: [...(groupMessages[selectedGroup] || []), tempMessage]
        };
        setGroupMessages(newGroupMessages);
        saveGroupMessagesToStorage(newGroupMessages);
        setNewMessage('');
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        selectedGroup,
        newMessage: newMessage.trim()
      });
      setError('Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const createGroup = async (groupData: { name: string; description?: string }) => {
    try {
      console.log('Creating group with data:', groupData);
      
      // Get auth token
      const authTokens = localStorage.getItem('authTokens');
      const token = authTokens ? JSON.parse(authTokens).accessToken : null;
      
      console.log('🔍 Auth tokens from localStorage:', authTokens);
      console.log('🔍 Token being sent:', token ? token.substring(0, 50) + '...' : 'null');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch('http://localhost:3003/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(groupData),
      });
      
      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);
      
      if (response.ok) {
        console.log('Group created successfully, reloading groups...');
        await loadGroups();
        setError(null);
        // Show success notification
        setNotification({
          type: 'success',
          message: 'Group created successfully!'
        });
        setTimeout(() => setNotification(null), 3000);
      } else {
        setError(responseData.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      setError('Failed to create group');
    }
  };


  const startPrivateChat = async (userId: string) => {
    setSelectedUser(userId);
    setSelectedGroup('');
    setMessages([]);
    setShowUserList(false);
    
    // Load private messages
    try {
      // Loading private messages
      const response = await fetch(`http://localhost:3003/api/messages/private/${userId}?currentUserId=${user?.id}`);
      const data = await response.json();
      
      if (data.messages) {
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg._id,
          content: msg.content,
          senderId: msg.senderId,
          senderName: msg.senderName || 'Unknown',
          timestamp: new Date(msg.timestamp),
          type: msg.type === 'text' ? 'TEXT' : 'TEXT'
        }));
        
        setMessages(formattedMessages);
        console.log('📨 Loaded private messages:', formattedMessages.length);
      }
    } catch (error) {
      console.error('Error loading private messages:', error);
      setError('Failed to load private messages');
    }
    
    // Load files for private chat using cache
    try {
      // Loading private chat files
      const chatKey = `private_${userId}`;
      const cachedFiles = filesCache[chatKey] || [];
      // Using cached private files
      
      // Mostrar archivos del chat privado inmediatamente
      setSharedFiles(cachedFiles);
      // Displaying private files
      
      // Also load from server to update cache
      await loadFiles();
    } catch (error) {
      console.error('Error loading private chat files:', error);
    }
  };

  const handleChangePassword = () => {
    setShowChangePassword(true);
  };


  const handleTestConnection = async () => {
    try {
      setIsConnected(false);
      const startTime = Date.now();
      const response = await fetch('http://localhost:3003/health');
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const data = await response.json();
      if (response.ok) {
        setIsConnected(true);
        setError(null);
        
        // Show detailed success notification
        setNotification({
          type: 'success',
          message: `Connection successful! Response time: ${responseTime}ms`
        });
        setTimeout(() => setNotification(null), 4000);
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      setIsConnected(false);
      setError('❌ Connection test failed!');
      
      // Show detailed error notification
      setNotification({
        type: 'error',
        message: 'Connection failed! Check if backend is running on port 3003'
      });
      setTimeout(() => setNotification(null), 4000);
    }
  };


  const themeClasses = {
    light: 'bg-gray-50 text-gray-900',
    dark: 'bg-gray-900 text-gray-100'
  };

  const fontSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  return (
    <div className={`h-screen flex flex-col ${themeClasses[theme]}`}>
      {/* Modern Header */}
      <header className={`shadow-xl border-b ${theme === 'dark' ? 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border-gray-600' : 'bg-gradient-to-r from-white via-gray-50 to-white border-gray-200'}`}>
        <div className="px-6 py-4">
          {/* Top Row - Branding and User Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                theme === 'dark' ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-green-400 to-green-500'
              }`}>
                <span className="text-white text-3xl">💬</span>
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Chat Platform
                </h1>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                  Welcome back, {user?.username}
                </p>
              </div>
            </div>
            
            {/* User Actions */}
            <div className="flex items-center space-x-3">
              {user && user.role === 'ADMIN' && (
                <button
                  onClick={() => setShowAdminPanel(true)}
                  className={`px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium shadow-md ${
                    theme === 'dark' 
                      ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-700 hover:to-orange-700 hover:shadow-lg' 
                      : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 hover:shadow-lg'
                  }`}
                >
                  👑 Admin
                </button>
              )}
              {user && ((user as any).role === 'MODERATOR' || user.role === 'ADMIN') && (
                <button
                  onClick={() => setShowModeratorPanel(true)}
                  className={`px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium shadow-md ${
                    theme === 'dark' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-lg' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 hover:shadow-lg'
                  }`}
                >
                  🔇 Mod
                </button>
              )}
              <button
                onClick={() => setShowProfile(true)}
                className={`px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium shadow-md ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 hover:shadow-lg' 
                    : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700 hover:shadow-lg'
                }`}
              >
                👤 Profile
              </button>
              <button
                onClick={() => setShowSystemInfo(true)}
                className={`px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium shadow-md ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 hover:shadow-lg' 
                    : 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white hover:from-indigo-600 hover:to-blue-600 hover:shadow-lg'
                }`}
              >
                ⚙️ System
              </button>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium shadow-md ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 hover:shadow-lg' 
                    : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700 hover:shadow-lg'
                }`}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button
                onClick={logout}
                className={`px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium shadow-md ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 hover:shadow-lg' 
                    : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:shadow-lg'
                }`}
              >
                🚪 Logout
              </button>
            </div>
          </div>
          
          {/* Bottom Row - Status and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Connection Status */}
              <div className="hidden lg:block">
                <ConnectionStatus 
                  theme={theme}
                  isConnected={isConnected}
                />
              </div>
              
              {/* Quick User Stats */}
              <QuickUserStats
                users={users}
                theme={theme}
                onClick={() => setShowUserList(true)}
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  loadGroups();
                  loadUsers();
                  setNotification({ type: 'success', message: 'Data reloaded' });
                  setTimeout(() => setNotification(null), 2000);
                }}
                className={`px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium shadow-md ${
                  theme === 'dark' 
                    ? 'bg-gray-600 text-white hover:bg-gray-700 hover:shadow-lg' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-lg'
                }`}
                title="Reload groups and users"
              >
                <span className="mr-2">🔄</span>
                Reload
              </button>
              <button
                onClick={() => setShowCreateGroup(true)}
                className={`px-6 py-3 rounded-xl transition-all duration-200 text-sm font-medium shadow-md ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg' 
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 hover:shadow-lg'
                }`}
              >
                <span className="mr-2">➕</span>
                Create Group
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className={`mx-6 mt-4 px-4 py-3 rounded-lg flex items-center ${
          theme === 'dark' 
            ? 'bg-red-900 border border-red-700 text-red-200' 
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`w-96 border-r flex flex-col shadow-lg ${
          theme === 'dark' ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-b from-gray-50 to-white border-gray-200'
        }`}>
          <div className={`p-4 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                👥 Groups ({groups.filter(group => {
                  if (user?.role === 'ADMIN') return true;
                  return group.members?.includes(user?.id || '') || group.admins?.includes(user?.id || '');
                }).length})
              </h2>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {/* Groups */}
              {groups.filter(group => {
                // Admin puede ver todos los grupos
                if (user?.role === 'ADMIN') return true;
                // Usuarios normales solo ven grupos donde son miembros
                return group.members?.includes(user?.id || '') || group.admins?.includes(user?.id || '');
              }).filter((group, index, self) => 
                // Remove duplicates based on group ID and name+owner
                index === self.findIndex(g => 
                  g.id === group.id || 
                  (g.name === group.name && g.ownerId === group.ownerId)
                )
              ).sort((a, b) => {
                // Sort by member count (descending), then by creation date (descending)
                if (a.memberCount !== b.memberCount) {
                  return (b.memberCount || 0) - (a.memberCount || 0);
                }
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              }).map((group, index) => (
                <div 
                  key={`group-${group.id || `temp-${index}`}`}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedGroup === group.id 
                      ? (theme === 'dark' ? 'bg-blue-900 border border-blue-700' : 'bg-primary-50 border border-primary-200')
                      : (theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                  }`}
                  onClick={() => {
                    setSelectedGroup(group.id);
                    setSelectedUser(null);
                    // Load messages for the specific group
                    loadGroupMessages(group.id);
                    // Load files for the specific group
                    loadFilesForGroup(group.id);
                  }}
                >
                  <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {group.name}
                    {group.ownerId === user?.id && (
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        theme === 'dark' 
                          ? 'bg-yellow-600 text-yellow-100' 
                          : 'bg-yellow-200 text-yellow-800'
                      }`}>
                        👑 Owner
                      </span>
                    )}
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {group.description}
                  </p>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {group.memberCount || 0} members
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    Owner: {users.find(u => u.id === group.ownerId)?.username || 'Unknown'}
                  </p>
                  <div className="flex justify-end mt-2 gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Group selected for member management
                        setSelectedGroupForAddMember(group);
                        setShowAddMemberModal(true);
                      }}
                      className={`px-2 py-1 text-xs rounded ${
                        theme === 'dark' 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-green-200 text-green-700 hover:bg-green-300'
                      }`}
                    >
                      + Member
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showGroupDetails(group);
                      }}
                      className={`px-2 py-1 text-xs rounded ${
                        theme === 'dark' 
                          ? 'bg-gray-600 text-white hover:bg-gray-700' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Info
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Private Chats Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  💬 Private Chats ({users.filter(u => u.id !== user?.id).length})
                </h2>
              </div>
              
              <div className="space-y-2">
                {/* Online Users */}
                {users.filter(u => u.id !== user?.id && u.isOnline).length > 0 && (
                  <div className="mb-3">
                    <h3 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                      🟢 Online ({users.filter(u => u.id !== user?.id && u.isOnline).length})
                    </h3>
                    <div className="space-y-1">
                      {users.filter(u => u.id !== user?.id && u.isOnline).map((user) => (
                        <div 
                          key={`private-online-${user.id}`}
                          className={`p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedUser === user.id 
                              ? (theme === 'dark' ? 'bg-blue-900 border border-blue-700' : 'bg-primary-50 border border-primary-200')
                              : (theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                          }`}
                          onClick={() => startPrivateChat(user.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs font-medium text-white">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {user.username}
                              </h4>
                              <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                {user.role === 'ADMIN' ? '👑 Admin' : 
                                 user.role === 'MODERATOR' ? '🔇 Moderator' : '👤 User'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Offline Users */}
                {users.filter(u => u.id !== user?.id && !u.isOnline).length > 0 && (
                  <div className="mb-3">
                    <h3 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      ⚫ Offline ({users.filter(u => u.id !== user?.id && !u.isOnline).length})
                    </h3>
                    <div className="space-y-1">
                      {users.filter(u => u.id !== user?.id && !u.isOnline).map((user) => (
                        <div 
                          key={`private-offline-${user.id}`}
                          className={`p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedUser === user.id 
                              ? (theme === 'dark' ? 'bg-blue-900 border border-blue-700' : 'bg-primary-50 border border-primary-200')
                              : (theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                          }`}
                          onClick={() => startPrivateChat(user.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-xs font-medium text-white">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {user.username}
                              </h4>
                              <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                {user.role === 'ADMIN' ? '👑 Admin' : 
                                 user.role === 'MODERATOR' ? '🔇 Moderator' : '👤 User'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {users.filter(u => u.id !== user?.id).length === 0 && (
                  <div className={`p-4 text-center rounded-lg ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      There are no other users available for private chat
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className={`border-b px-6 py-4 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {selectedUser ? `Private Chat with ${users.find(u => u.id === selectedUser)?.username}` : 
               groups.find(g => g.id === selectedGroup)?.name || 'Select a Group'}
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
              {selectedUser ? 'Private conversation' : 'Welcome to the discussion'}
            </p>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-transparent to-gray-50/50">
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div key={`message-main-${message.id || `temp-${index}`}`} className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  {/* Message Container */}
                  <div className={`flex flex-col ${message.senderId === user?.id ? 'items-end' : 'items-start'} max-w-xs lg:max-w-md`}>
                    
                    {/* Sender Name (only for other users) */}
                    {message.senderId !== user?.id && message.senderName && (
                      <div className={`text-xs font-medium mb-1 px-2 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {message.senderName}
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    <div className={`relative px-4 py-2 rounded-2xl shadow-sm ${
                      message.type === 'IMAGE' ? 'max-w-sm lg:max-w-lg' : 'max-w-xs lg:max-w-md'
                    } ${
                      message.senderId === user?.id 
                        ? 'bg-blue-500 text-white rounded-br-md' 
                        : message.type === 'SYSTEM'
                        ? (theme === 'dark' ? 'bg-gray-700 text-gray-200 rounded-lg' : 'bg-gray-200 text-gray-700 rounded-lg')
                        : (theme === 'dark' ? 'bg-gray-600 text-gray-100 rounded-bl-md' : 'bg-gray-200 text-gray-900 rounded-bl-md border border-gray-400')
                    } ${fontSizeClasses[fontSize]}`}>
                    
                    {/* Image Preview */}
                    {message.type === 'IMAGE' && message.fileInfo && (
                      <div className="mb-3">
                        <img
                          src={getFilePreviewUrl(message.fileInfo)}
                          alt={message.fileInfo.originalName}
                          className="max-w-full h-auto rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            setSelectedFile(message.fileInfo!);
                            setShowFilePreview(true);
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden text-center text-gray-500 py-4">
                          <p className="text-lg mb-2">🖼️</p>
                          <p>Image preview not available</p>
                          <button
                            onClick={() => {
                              setSelectedFile(message.fileInfo!);
                              setShowFilePreview(true);
                            }}
                            className="text-blue-600 hover:underline mt-2"
                          >
                            View in preview
                          </button>
                        </div>
                      </div>
                    )}
                    
                      {/* Message Content */}
                      <div className="break-words">
                        {message.content}
                      </div>
                      
                      {/* Timestamp */}
                      <div className={`text-xs mt-1 ${
                        message.senderId === user?.id 
                          ? 'text-blue-100 text-right' 
                          : (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Shared Files Section - Compact & Expandable */}
            {selectedGroup && sharedFiles.length > 0 && (
              <div className="mt-4 mx-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      theme === 'dark' ? 'bg-green-600' : 'bg-green-500'
                    }`}>
                      <span className="text-white text-sm">📁</span>
                    </div>
                    <div>
                      <h3 className={`text-sm font-semibold ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                      }`}>
                        Shared Files
                      </h3>
                      <p className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {sharedFiles.length} file{sharedFiles.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* View Mode Toggle */}
                    <div className={`flex rounded-lg p-1 ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      <button
                        onClick={() => setFilesViewMode('list')}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          filesViewMode === 'list' 
                            ? (theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-white text-gray-800')
                            : (theme === 'dark' ? 'text-gray-400' : 'text-gray-600')
                        }`}
                        title="List view"
                      >
                        ☰
                      </button>
                      <button
                        onClick={() => setFilesViewMode('grid')}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          filesViewMode === 'grid' 
                            ? (theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-white text-gray-800')
                            : (theme === 'dark' ? 'text-gray-400' : 'text-gray-600')
                        }`}
                        title="Grid view"
                      >
                        ⊞
                      </button>
                    </div>
                    <button
                  onClick={() => {
                    if ((user as any)?.mutedUntil) {
                      setNotification({ 
                        type: 'error', 
                        message: 'You cannot share files because you are muted' 
                      });
                      setTimeout(() => setNotification(null), 3000);
                      return;
                    }
                    setShowFileShare(true);
                  }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                        theme === 'dark' 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Files Display */}
                {filesViewMode === 'list' ? (
                  /* List View */
                  <div className="space-y-1">
                    {(showAllFiles ? sharedFiles : sharedFiles.slice(0, 3)).map((file, index) => (
                      <div 
                        key={`${file.id}-${index}`} 
                        className={`flex items-center space-x-3 p-2 rounded-lg transition-all duration-200 cursor-pointer ${
                          theme === 'dark' 
                            ? 'hover:bg-gray-700' 
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => handleFilePreview(file)}
                      >
                        {/* File Icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                          file.mimeType.startsWith('image/') ? 
                            (theme === 'dark' ? 'bg-green-600' : 'bg-green-500') :
                          file.mimeType.startsWith('video/') ? 
                            (theme === 'dark' ? 'bg-red-600' : 'bg-red-500') :
                          file.mimeType.startsWith('audio/') ? 
                            (theme === 'dark' ? 'bg-purple-600' : 'bg-purple-500') :
                          file.mimeType.includes('pdf') ? 
                            (theme === 'dark' ? 'bg-red-600' : 'bg-red-500') :
                          file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet') ? 
                            (theme === 'dark' ? 'bg-green-600' : 'bg-green-500') :
                          file.mimeType.includes('word') || file.mimeType.includes('document') ? 
                            (theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500') :
                          file.mimeType.includes('zip') ? 
                            (theme === 'dark' ? 'bg-yellow-600' : 'bg-yellow-500') :
                            (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-500')
                        }`}>
                          <span className="text-white text-xs">
                            {file.mimeType.startsWith('image/') ? '🖼️' : 
                             file.mimeType.startsWith('video/') ? '🎥' : 
                             file.mimeType.startsWith('audio/') ? '🎵' : 
                             file.mimeType.includes('pdf') ? '📄' : 
                             file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet') ? '📊' :
                             file.mimeType.includes('word') || file.mimeType.includes('document') ? '📝' :
                             file.mimeType.includes('zip') ? '📦' : '📄'}
                          </span>
                        </div>
                        
                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                          }`}>
                            {file.originalName}
                          </p>
                          <p className={`text-xs ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Show More/Less Button */}
                    {sharedFiles.length > 3 && (
                      <button
                        onClick={() => setShowAllFiles(!showAllFiles)}
                        className={`w-full py-2 text-xs font-medium rounded-lg transition-colors ${
                          theme === 'dark' 
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                        }`}
                      >
                        {showAllFiles 
                          ? `Ocultar archivos (mostrando ${sharedFiles.length})` 
                          : `Ver ${sharedFiles.length - 3} archivos más...`
                        }
                      </button>
                    )}
                  </div>
                ) : (
                  /* Grid View */
                  <div className="grid grid-cols-2 gap-2">
                    {sharedFiles.map((file, index) => (
                      <div 
                        key={`${file.id}-${index}`} 
                        className={`p-3 rounded-lg transition-all duration-200 cursor-pointer ${
                          theme === 'dark' 
                            ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' 
                            : 'bg-white hover:bg-gray-50 border border-gray-200 shadow-sm'
                        }`}
                        onClick={() => handleFilePreview(file)}
                      >
                        <div className="flex flex-col items-center text-center space-y-2">
                          {/* File Icon */}
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                            file.mimeType.startsWith('image/') ? 
                              (theme === 'dark' ? 'bg-green-600' : 'bg-green-500') :
                            file.mimeType.startsWith('video/') ? 
                              (theme === 'dark' ? 'bg-red-600' : 'bg-red-500') :
                            file.mimeType.startsWith('audio/') ? 
                              (theme === 'dark' ? 'bg-purple-600' : 'bg-purple-500') :
                            file.mimeType.includes('pdf') ? 
                              (theme === 'dark' ? 'bg-red-600' : 'bg-red-500') :
                            file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet') ? 
                              (theme === 'dark' ? 'bg-green-600' : 'bg-green-500') :
                            file.mimeType.includes('word') || file.mimeType.includes('document') ? 
                              (theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500') :
                            file.mimeType.includes('zip') ? 
                              (theme === 'dark' ? 'bg-yellow-600' : 'bg-yellow-500') :
                              (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-500')
                          }`}>
                            <span className="text-white text-sm">
                              {file.mimeType.startsWith('image/') ? '🖼️' : 
                               file.mimeType.startsWith('video/') ? '🎥' : 
                               file.mimeType.startsWith('audio/') ? '🎵' : 
                               file.mimeType.includes('pdf') ? '📄' : 
                               file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet') ? '📊' :
                               file.mimeType.includes('word') || file.mimeType.includes('document') ? '📝' :
                               file.mimeType.includes('zip') ? '📦' : '📄'}
                            </span>
                          </div>
                          
                          {/* File Name */}
                          <p className={`text-xs font-medium truncate w-full ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                          }`}>
                            {file.originalName}
                          </p>
                          
                          {/* File Size */}
                          <p className={`text-xs ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isLoadingFiles && (
              <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm text-gray-600">Loading files...</span>
                </div>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className={`border-t px-6 py-6 shadow-lg ${
            theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-r from-white to-gray-50 border-gray-200'
          }`}>
            <form onSubmit={handleSendMessage} className="flex space-x-4">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className={`flex-1 px-4 py-3 border rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:bg-gray-600' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-gray-50'
                }`}
              />
              
              {/* File Upload Button */}
              {selectedGroup && (
                <button
                  type="button"
                  onClick={() => {
                    if ((user as any)?.mutedUntil) {
                      setNotification({ 
                        type: 'error', 
                        message: 'You cannot share files because you are muted' 
                      });
                      setTimeout(() => setNotification(null), 3000);
                      return;
                    }
                    setShowFileShare(true);
                  }}
                  className={`px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    theme === 'dark' 
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800' 
                      : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                  }`}
                  title="Share Files"
                >
                  📁
                </button>
              )}
              
              {selectedGroup && (
                <button
                  type="button"
                  onClick={() => setShowDocuments(true)}
                  className={`px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    theme === 'dark' 
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800' 
                      : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700'
                  }`}
                  title="Collaborative Documents"
                >
                  📝
                </button>
              )}
              
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className={`px-6 py-3 rounded-xl font-medium shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800' 
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                }`}
              >
                <span className="mr-2">📤</span>
                Send
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Unified User Panel Modal */}
      {showUserList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl w-full max-w-2xl h-5/6 flex flex-col ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <UnifiedUserPanel
              users={users}
              theme={theme}
              onUserClick={startPrivateChat}
              onClose={() => setShowUserList(false)}
            />
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Profile Information
              </h3>
              <button
                onClick={() => setShowProfile(false)}
                className={`text-gray-400 hover:text-gray-600 ${theme === 'dark' ? 'hover:text-gray-200' : ''}`}
              >
                ✕
              </button>
            </div>
            <UserProfile 
              user={user} 
              theme={theme} 
              onChangePassword={handleChangePassword}
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowProfile(false)}
                className={`px-4 py-2 rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-96 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Theme
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Font Size
                </label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value as 'small' | 'medium' | 'large')}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowSettings(false)}
                className={`px-4 py-2 rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreateGroup={createGroup}
        theme={theme}
      />


      {/* File Share Modal */}
      <FileShareModal
        isOpen={showFileShare}
        onClose={() => setShowFileShare(false)}
        roomId={selectedGroup}
        userId={selectedUser || undefined}
        currentUserId={user?.id}
        onFileShared={handleFileShared}
        onFileResent={handleFileResent}
      />

      {/* Document Modal */}
      <DocumentModal
        isOpen={showDocuments}
        onClose={() => setShowDocuments(false)}
        userId={user?.id || ''}
        roomId={selectedGroup}
        userRole={user?.role}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        theme={theme}
        onSuccess={() => {
          setNotification({
            type: 'success',
            message: 'Contraseña cambiada exitosamente'
          });
          setTimeout(() => setNotification(null), 3000);
        }}
      />

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-5/6 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-t-2xl">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">👑</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
                  <p className="text-sm text-gray-600">Gestiona usuarios, grupos y moderación</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Admin Panel Content */}
            <div className="flex-1 overflow-hidden">
              <AdminPanel user={user as any} theme={theme} />
            </div>
          </div>
        </div>
      )}

      {/* Group Info Modal */}
      {showGroupInfo && selectedGroupForInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Group Information
              </h3>
              <button
                onClick={() => setShowGroupInfo(false)}
                className={`text-gray-400 hover:text-gray-600 ${theme === 'dark' ? 'hover:text-gray-200' : ''}`}
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  theme === 'dark' ? 'bg-purple-600' : 'bg-purple-500'
                }`}>
                  <span className="text-white text-lg font-medium">
                    {selectedGroupForInfo.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedGroupForInfo.name}
                  </h4>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {selectedGroupForInfo.description || 'No description available'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    👑 Group Owner
                  </label>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {users.find(u => u.id === selectedGroupForInfo.ownerId)?.username || 'Desconocido'}
                  </span>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Group Type
                  </label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedGroupForInfo.type === 'PUBLIC' ? 'text-green-600 bg-green-100' : 'text-blue-600 bg-blue-100'
                  }`}>
                    {selectedGroupForInfo.type}
                  </span>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Members
                  </label>
                  <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedGroupForInfo.members?.length || 0} members
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Created
                  </label>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {new Date(selectedGroupForInfo.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowGroupInfo(false)}
                className={`px-4 py-2 rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-96 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Platform Statistics
              </h3>
              <button
                onClick={() => setShowStats(false)}
                className={`text-gray-400 hover:text-gray-600 ${theme === 'dark' ? 'hover:text-gray-200' : ''}`}
              >
                ✕
              </button>
            </div>
            <ChatStats
              theme={theme}
              totalMessages={messages.length}
              totalUsers={users.length}
              totalGroups={groups.length}
              onlineUsers={users.filter(u => u.isOnline).length}
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowStats(false)}
                className={`px-4 py-2 rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Info Modal */}
      {showSystemInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                System Information
              </h3>
              <button
                onClick={() => setShowSystemInfo(false)}
                className={`text-gray-400 hover:text-gray-600 ${theme === 'dark' ? 'hover:text-gray-200' : ''}`}
              >
                ✕
              </button>
            </div>
            <SystemInfo 
              theme={theme}
              isConnected={isConnected}
              error={error}
              onTestConnection={handleTestConnection}
              onClearError={() => setError(null)}
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowSystemInfo(false)}
                className={`px-4 py-2 rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {showFilePreview && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-5/6 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {selectedFile.mimeType.startsWith('image/') ? '🖼️' : 
                     selectedFile.mimeType.includes('pdf') ? '📄' : 
                     selectedFile.mimeType.includes('excel') || selectedFile.mimeType.includes('spreadsheet') ? '📊' :
                     selectedFile.mimeType.includes('word') || selectedFile.mimeType.includes('document') ? '📝' : '📄'}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedFile.originalName}</h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                    <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                    <span>{selectedFile.mimeType}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <a
                  href={getFilePreviewUrl(selectedFile)}
                  download={selectedFile.originalName}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Download
                </a>
                <button
                  onClick={() => setShowFilePreview(false)}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 p-6 bg-gray-50 overflow-hidden">
              <div className="h-full bg-white rounded-xl shadow-inner border border-gray-200 overflow-hidden">
                {selectedFile.mimeType.startsWith('image/') ? (
                  <div className="h-full flex items-center justify-center p-4">
                    <img
                      src={getFilePreviewUrl(selectedFile)}
                      alt={selectedFile.originalName}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden text-center text-gray-500">
                      <p className="text-lg mb-2">🖼️</p>
                      <p>Image preview not available</p>
                      <a
                        href={getFilePreviewUrl(selectedFile)}
                        download={selectedFile.originalName}
                        className="text-blue-600 hover:underline mt-2 inline-block"
                      >
                        Download to view
                      </a>
                    </div>
                  </div>
                ) : selectedFile.mimeType.includes('pdf') ? (
                  <div className="h-full">
                    <iframe
                      src={getFilePreviewUrl(selectedFile)}
                      className="w-full h-full border-none rounded-lg"
                      title={selectedFile.originalName}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden h-full flex items-center justify-center text-center text-gray-500">
                      <div>
                        <p className="text-lg mb-2">📄</p>
                        <p>PDF preview not available</p>
                        <a
                          href={getFilePreviewUrl(selectedFile)}
                          download={selectedFile.originalName}
                          className="text-blue-600 hover:underline mt-2 inline-block"
                        >
                          Download to view
                        </a>
                      </div>
                    </div>
                  </div>
                ) : selectedFile.mimeType.includes('excel') || selectedFile.mimeType.includes('spreadsheet') ? (
                  <div className="h-full flex items-center justify-center text-center text-gray-500">
                    <div>
                      <p className="text-6xl mb-4">📊</p>
                      <h3 className="text-xl font-semibold mb-2">Excel Spreadsheet</h3>
                      <p className="mb-4">Preview not available for Excel files</p>
                      <a
                        href={getFilePreviewUrl(selectedFile)}
                        download={selectedFile.originalName}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
                      >
                        Download Excel File
                      </a>
                    </div>
                  </div>
                ) : selectedFile.mimeType.includes('word') || selectedFile.mimeType.includes('document') ? (
                  <div className="h-full flex items-center justify-center text-center text-gray-500">
                    <div>
                      <p className="text-6xl mb-4">📝</p>
                      <h3 className="text-xl font-semibold mb-2">Word Document</h3>
                      <p className="mb-4">Preview not available for Word documents</p>
                      <a
                        href={getFilePreviewUrl(selectedFile)}
                        download={selectedFile.originalName}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
                      >
                        Download Word Document
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-gray-500">
                    <div>
                      <p className="text-6xl mb-4">📄</p>
                      <h3 className="text-xl font-semibold mb-2">File Preview</h3>
                      <p className="mb-4">Preview not available for this file type</p>
                      <a
                        href={getFilePreviewUrl(selectedFile)}
                        download={selectedFile.originalName}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
                      >
                        Download File
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-[9999] animate-slide-in">
          <div className={`px-6 py-4 rounded-lg shadow-xl flex items-center space-x-3 max-w-sm ${
            notification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            <div className="text-xl flex-shrink-0">
              {notification.type === 'success' ? '✅' : '❌'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm break-words">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-white hover:text-gray-200 transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ModeratorPanel Modal */}
      {showModeratorPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-5/6 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">🛡️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Moderation Panel</h2>
                  <p className="text-sm text-gray-600">Manage muted users</p>
                </div>
              </div>
              <button
                onClick={() => setShowModeratorPanel(false)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Moderator Panel Content */}
            <div className="flex-1 overflow-hidden">
              <ModeratorPanel user={user as any} theme={theme} />
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Group Management Modal */}
      {showAddMemberModal && selectedGroupForAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-fadeIn`}>
            {/* Enhanced Header */}
            <div className={`relative p-6 ${theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50'} rounded-t-3xl`}>
              <button 
                onClick={() => setShowAddMemberModal(false)}
                className={`absolute top-4 right-4 p-2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600' : 'text-gray-600 hover:text-gray-800 hover:bg-white'} rounded-full transition-all duration-200`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="flex items-center space-x-3 mt-2">
                <div className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-100'}`}>
                  <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-white' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                  </svg>
                </div>
                 <div>
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Manage Group
                  </h2>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {selectedGroupForAddMember?.name}
                  </p>
                 </div>
                  {/* Owner-only Rename Button */}
                  {user && selectedGroupForAddMember && user.id === selectedGroupForAddMember.ownerId && (
                    <div className="ml-auto pl-4">
                      <button
                        onClick={() => setShowRenameDialog(true)}
                        className={`${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} px-3 py-1 rounded-lg text-sm`}
                        title="Rename group (owner only)"
                      >
                        ✏️ Rename
                      </button>
                    </div>
                  )}
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Debug Info removed in production */}

              {/* Member Count Summary */}
              <div className={`mb-6 p-4 rounded-xl ${theme === 'dark' ? 'bg-gradient-to-r from-gray-700 to-gray-600' : 'bg-gradient-to-r from-green-50 to-blue-50'} border ${theme === 'dark' ? 'border-gray-600' : 'border-green-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-green-600' : 'bg-green-100'}`}>
                      <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Members: {selectedGroupForAddMember.members?.length || 0}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Admins: {selectedGroupForAddMember.admins?.length || 0}
                      </p>
                    </div>
                  </div>
                  <div className={`text-right ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                    <span className="text-2xl font-bold">{selectedGroupForAddMember.members?.length || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    👥 Add New Member
                  </label>
                  <div className="relative">
                    <select 
                      className={`w-full p-4 rounded-xl border-2 transition-all duration-200 focus:ring-4 ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500' 
                          : 'bg-white border-gray-300 hover:border-blue-400 text-gray-900 focus:border-blue-500'
                      } focus:outline-none shadow-sm`}
                      onChange={(e) => {
                        if (e.target.value) {
                          addMemberToGroup(selectedGroupForAddMember.id, e.target.value);
                          setShowAddMemberModal(false);
                        }
                      }}
                    >
                      <option value="">🔍 Select user...</option>
                      {users.filter(user => {
                        const isMember = selectedGroupForAddMember.members?.includes(user.id);
                        const isAdmin = selectedGroupForAddMember.admins?.includes(user.id);
                        const shouldShow = !isMember && !isAdmin;
                        
                        // Filter users already in group
                        
                        return shouldShow;
                      }).map(user => (
                        <option key={user.id} value={user.id}>
                          👤 {user.username} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  {(users.filter(user => {
                    const isMember = selectedGroupForAddMember.members?.includes(user.id) || false;
                    const isAdmin = selectedGroupForAddMember.admins?.includes(user.id) || false;
                    return !isMember && !isAdmin;
                  }).length === 0) && (
                    <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      😅 No users available to add
                    </p>
                  )}
                </div>
                
                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h3 className={`text-sm font-semibold mb-3 flex items-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                    </svg>
                    Current Members ({selectedGroupForAddMember.members?.length || 0})
                  </h3>
                  <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
                    {selectedGroupForAddMember.members?.map(memberId => {
                      const member = users.find(u => u.id === memberId);
                      const isAdmin = selectedGroupForAddMember.admins?.includes(memberId);
                      return member ? (
                        <div key={memberId} className={`flex items-center justify-between p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-600' : 'bg-white'}`}>
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>
                              {member.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                {member.username}
                              </p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {member.email}
                              </p>
                            </div>
                          </div>
                          {isAdmin && (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${theme === 'dark' ? 'bg-yellow-600 text-yellow-200' : 'bg-yellow-100 text-yellow-700'}`}>
                              👑 Admin
                            </span>
                          )}
                        </div>
                      ) : null;
                    })}
                    {(selectedGroupForAddMember.members?.length || 0) === 0 && (
                      <div className={`text-center py-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                        </svg>
                        <p className="text-sm">No hay miembros en este grupo</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Footer with Leave Group Button - Always visible */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-t border-gray-700' : 'bg-gray-50 border-t border-gray-200'} p-6 rounded-b-3xl`}>
              <button
                onClick={() => {(window.confirm(`Are you sure you want to leave the group "${selectedGroupForAddMember.name}"?`)) ? (leaveGroup(selectedGroupForAddMember.id), setShowAddMemberModal(false)) : null}}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'border-red-600 text-red-400 hover:bg-red-900 hover:text-red-200 hover:border-red-500' 
                    : 'border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400'
                } font-medium focus:outline-none focus:ring-4 focus:ring-red-200`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Leave Group</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Group Dialog (Owner only) */}
      {showRenameDialog && selectedGroupForAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} rounded-2xl shadow-2xl w-full max-w-md`}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Rename Group</h3>
              <button onClick={() => setShowRenameDialog(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <label className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>New name</label>
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="Enter new name"
              />
            </div>
            <div className="p-5 border-t border-gray-200 flex items-center justify-end space-x-2">
              <button onClick={() => setShowRenameDialog(false)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
              <button
                onClick={async () => {
                  try {
                    const authTokens = localStorage.getItem('authTokens');
                    const token = authTokens ? JSON.parse(authTokens).accessToken : null;
                    const res = await fetch(`http://localhost:3003/api/groups/${selectedGroupForAddMember.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ name: renameInput })
                    });
                    if (!res.ok) throw new Error('Failed');
                    await loadGroups();
                    setShowRenameDialog(false);
                    setRenameInput('');
                  } catch (e) {
                    console.error('Rename failed', e);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EnhancedChatPage;
