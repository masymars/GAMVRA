import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to manage conversation persistence and history.
 * Handles saving, loading, updating, and deleting conversations from localStorage.
 */
export const useConversationHandler = () => {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);

  // Load conversations from localStorage on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load all conversations from localStorage
  const loadConversations = useCallback(() => {
    try {
      const saved = localStorage.getItem('medigemma_conversations');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConversations(parsed);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, []);

  // Save conversations to localStorage
  const saveConversationsToStorage = useCallback((conversationList) => {
    try {
      localStorage.setItem('medigemma_conversations', JSON.stringify(conversationList));
    } catch (error) {
      console.error('Error saving conversations:', error);
    }
  }, []);

  // Create a new conversation
  const createNewConversation = useCallback((title = null, saveImmediately = false) => {
    const newConversation = {
      id: Date.now().toString(),
      title: title || `New Conversation ${new Date().toLocaleDateString()}`,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model: 'core-radiology-4b'
    };

    if (saveImmediately) {
      setConversations(prevConversations => {
        const updatedConversations = [newConversation, ...prevConversations];
        saveConversationsToStorage(updatedConversations);
        return updatedConversations;
      });
    }
    
    return newConversation;
  }, [saveConversationsToStorage]);

  // Save current conversation with messages
  const saveConversation = useCallback((conversationId, messages, title = null) => {
    setConversations(prevConversations => {
      const updatedConversations = prevConversations.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: messages,
            updatedAt: new Date().toISOString(),
            ...(title && { title })
          };
        }
        return conv;
      });

      saveConversationsToStorage(updatedConversations);
      return updatedConversations;
    });
  }, [saveConversationsToStorage]);

  // Load a specific conversation
  const loadConversation = useCallback((conversationId) => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      setCurrentConversationId(conversationId);
      return conversation;
    }
    return null;
  }, [conversations]);

  // Update conversation title
  const updateConversationTitle = useCallback((conversationId, newTitle) => {
    setConversations(prevConversations => {
      const updatedConversations = prevConversations.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            title: newTitle,
            updatedAt: new Date().toISOString()
          };
        }
        return conv;
      });

      saveConversationsToStorage(updatedConversations);
      return updatedConversations;
    });
  }, [saveConversationsToStorage]);

  // Delete a conversation
  const deleteConversation = useCallback((conversationId) => {
    setConversations(prevConversations => {
      const updatedConversations = prevConversations.filter(conv => conv.id !== conversationId);
      saveConversationsToStorage(updatedConversations);
      return updatedConversations;
    });
    
    // If we're deleting the current conversation, clear the current ID
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
    }
  }, [currentConversationId, saveConversationsToStorage]);

  // Export conversation to JSON
  const exportConversation = useCallback((conversationId) => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (!conversation) return null;

    const exportData = {
      title: conversation.title,
      model: conversation.model,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        hasFiles: !!(m.files?.length > 0),
        hasAudio: !!m.audioRecording,
        ...(m.imageUrl && { imageUrl: m.imageUrl })
      }))
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${conversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    return exportData;
  }, [conversations]);

  // Import conversation from JSON
  const importConversation = useCallback((jsonData) => {
    try {
      const conversationData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      
      const importedConversation = {
        id: Date.now().toString(),
        title: `${conversationData.title || 'Imported Conversation'} (Imported)`,
        messages: conversationData.messages || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: conversationData.model || 'core-radiology-4b'
      };

      setConversations(prevConversations => {
        const updatedConversations = [importedConversation, ...prevConversations];
        saveConversationsToStorage(updatedConversations);
        return updatedConversations;
      });
      
      return importedConversation;
    } catch (error) {
      console.error('Error importing conversation:', error);
      throw new Error('Invalid conversation file format');
    }
  }, [saveConversationsToStorage]);

  // Get conversation statistics
  const getConversationStats = useCallback((conversationId) => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (!conversation) return null;

    const messageCount = conversation.messages.length;
    const userMessages = conversation.messages.filter(m => m.role === 'user').length;
    const assistantMessages = conversation.messages.filter(m => m.role === 'assistant').length;
    const filesUploaded = conversation.messages.reduce((count, m) => count + (m.files?.length || 0), 0);
    const audioRecordings = conversation.messages.filter(m => m.audioRecording).length;

    return {
      messageCount,
      userMessages,
      assistantMessages,
      filesUploaded,
      audioRecordings,
      duration: new Date(conversation.updatedAt) - new Date(conversation.createdAt)
    };
  }, [conversations]);

  // Search conversations
  const searchConversations = useCallback((query) => {
    if (!query.trim()) return conversations;

    const searchTerm = query.toLowerCase();
    return conversations.filter(conv => 
      conv.title.toLowerCase().includes(searchTerm) ||
      conv.messages.some(msg => 
        msg.content.toLowerCase().includes(searchTerm)
      )
    );
  }, [conversations]);

  // Auto-save current conversation (to be called from chat component)
  const autoSaveCurrentConversation = useCallback((messages) => {
    if (currentConversationId && messages.length > 0) {
      // Check if conversation exists in the conversations array
      let conversation = conversations.find(conv => conv.id === currentConversationId);
      
      if (!conversation) {
        // If conversation doesn't exist in localStorage yet, create it
        conversation = {
          id: currentConversationId,
          title: `New Conversation ${new Date().toLocaleDateString()}`,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          model: 'core-radiology-4b'
        };
        
        // Add to conversations array
        setConversations(prevConversations => {
          const updatedConversations = [conversation, ...prevConversations];
          saveConversationsToStorage(updatedConversations);
          return updatedConversations;
        });
      }
      
      // Auto-generate title from first user message if not set or is default
      let shouldUpdateTitle = conversation.title.startsWith('New Conversation');
      
      if (shouldUpdateTitle) {
        const firstUserMessage = messages.find(m => m.role === 'user');
        if (firstUserMessage) {
          const autoTitle = firstUserMessage.content.slice(0, 50) + 
            (firstUserMessage.content.length > 50 ? '...' : '');
          updateConversationTitle(currentConversationId, autoTitle);
        }
      }
      
      // Always save the messages
      saveConversation(currentConversationId, messages);
    }
  }, [currentConversationId, conversations, saveConversation, updateConversationTitle, saveConversationsToStorage]);

  // Get current conversation
  const getCurrentConversation = useCallback(() => {
    if (currentConversationId) {
      return conversations.find(conv => conv.id === currentConversationId) || null;
    }
    return null;
  }, [currentConversationId, conversations]);

  return {
    conversations,
    currentConversationId,
    createNewConversation,
    saveConversation,
    loadConversation,
    updateConversationTitle,
    deleteConversation,
    exportConversation,
    importConversation,
    getConversationStats,
    searchConversations,
    autoSaveCurrentConversation,
    getCurrentConversation,
    setCurrentConversationId
  };
};