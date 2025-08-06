import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, Search, Trash2, Download, Upload, Edit3, 
  Calendar, Image, MoreVertical, ArrowLeft, Plus, Mic, FileText,
  Check, X, Filter, SortDesc, Clock, Hash
} from 'lucide-react';
import { useConversationHandler } from '../api/conversationHandler';
import { useNavigate } from 'react-router-dom';

// Sub-component for a single conversation item for better separation of concerns
const ConversationItem = ({
  conversation,
  isEditing,
  editingTitle,
  onSelect,
  onStartEdit,
  onSaveTitle,
  onCancelEdit,
  onSetEditingTitle,
  onDelete,
  onExport,
  currentConversationId
}) => {
  const { getConversationStats } = useConversationHandler();
  const [showActions, setShowActions] = useState(false);

  const stats = useMemo(() => getConversationStats(conversation.id), [conversation.id, getConversationStats]);
  
  const hasMediaType = useMemo(() => {
    const messages = conversation.messages || [];
    return {
      image: messages.some(m => m.files?.some(f => f.type.startsWith('image')) || m.imageUrl),
      audio: messages.some(m => m.audioRecording),
      file: messages.some(m => m.files?.length > 0 && !m.files?.every(f => f.type.startsWith('image')))
    };
  }, [conversation.messages]);

  const previewText = useMemo(() => {
    const lastMessage = [...(conversation.messages || [])].reverse().find(m => m.content);
    return lastMessage ? lastMessage.content : 'No messages yet.';
  }, [conversation.messages]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleCardClick = () => {
    onSelect(conversation);
  };

  const handleActionsClick = (e) => {
    e.stopPropagation();
    setShowActions(!showActions);
  };

  return (
    <div
      className={`bg-white rounded-xl border-2 transition-all duration-300 group relative cursor-pointer hover:shadow-lg hover:-translate-y-1 ${
        currentConversationId === conversation.id 
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 shadow-lg' 
          : 'border-gray-200 hover:border-blue-300'
      }`}
      onClick={handleCardClick}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {isEditing ? (
                <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => onSetEditingTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveTitle();
                      if (e.key === 'Escape') onCancelEdit();
                    }}
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={onSaveTitle}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={onCancelEdit}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-lg leading-tight group-hover:text-blue-700 transition-colors line-clamp-2">
                      {conversation.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                    {previewText}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center bg-gray-100 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3 mr-1" /> 
                        {formatDate(conversation.updatedAt)}
                      </span>
                      <span className="flex items-center bg-gray-100 px-2 py-1 rounded-full">
                        <Hash className="w-3 h-3 mr-1" /> 
                        {stats?.messageCount || 0} messages
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {hasMediaType.image && (
                        <div className="p-1.5 bg-green-100 rounded-full">
                          <Image className="w-3.5 h-3.5 text-green-600" />
                        </div>
                      )}
                      {hasMediaType.audio && (
                        <div className="p-1.5 bg-purple-100 rounded-full">
                          <Mic className="w-3.5 h-3.5 text-purple-600" />
                        </div>
                      )}
                      {hasMediaType.file && (
                        <div className="p-1.5 bg-orange-100 rounded-full">
                          <FileText className="w-3.5 h-3.5 text-orange-600" />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          
          {/* Actions Menu */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleActionsClick}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showActions && (
              <>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-20">
                  <button 
                    onClick={() => { onStartEdit(); setShowActions(false); }} 
                    className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Edit3 className="w-4 h-4 mr-3 text-gray-500" />
                    Rename conversation
                  </button>
                  <button 
                    onClick={() => { onExport(conversation.id); setShowActions(false); }} 
                    className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-3 text-gray-500" />
                    Export conversation
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button 
                    onClick={() => { onDelete(conversation.id); setShowActions(false); }} 
                    className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-3" />
                    Delete conversation
                  </button>
                </div>
                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)}></div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main History Page Component
const ConversationsHistory = ({ onSelectConversation, onCreateNew, currentConversationId }) => {
  const navigate = useNavigate();
  const {
    conversations, deleteConversation, exportConversation,
    importConversation, updateConversationTitle, searchConversations
  } = useConversationHandler();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'all', // all, today, week, month
    hasMedia: 'all', // all, images, audio, files
    sortBy: 'updated' // updated, created, title, messages
  });

  const filteredConversations = useMemo(() => {
    let filtered = searchConversations(searchQuery);
    
    // Apply date filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(conv => new Date(conv.updatedAt) >= cutoffDate);
    }
    
    // Apply media filter
    if (filters.hasMedia !== 'all') {
      filtered = filtered.filter(conv => {
        const messages = conv.messages || [];
        switch (filters.hasMedia) {
          case 'images':
            return messages.some(m => m.files?.some(f => f.type.startsWith('image')) || m.imageUrl);
          case 'audio':
            return messages.some(m => m.audioRecording);
          case 'files':
            return messages.some(m => m.files?.length > 0);
          default:
            return true;
        }
      });
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'created':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'messages':
          const aCount = a.messages?.length || 0;
          const bCount = b.messages?.length || 0;
          return bCount - aCount;
        case 'updated':
        default:
          return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
    });
  }, [searchQuery, conversations, searchConversations, filters]);

  const handleStartEdit = (conversation) => {
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
  };

  const handleSaveTitle = () => {
    if (editingId && editingTitle.trim()) {
      updateConversationTitle(editingId, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleSelectConversation = (conversation) => {
    if (onSelectConversation) {
      onSelectConversation(conversation);
    } else {
      // Navigate to chat page with the selected conversation
      navigate('/chat', { state: { selectedConversation: conversation } });
    }
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    } else {
      // Navigate to chat page with a flag to create a new conversation
      navigate('/chat', { state: { createNew: true } });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      deleteConversation(id);
    }
  };
  
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        importConversation(e.target.result);
        alert('Conversation imported successfully!');
      } catch (error) {
        alert('Error: Invalid file format.');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
               
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Conversations
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage your chat history and conversations
                </p>
              </div>
            </div>
            <button 
              onClick={handleCreateNew} 
              className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span>New Chat</span>
            </button>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="px-6 pb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Search conversations... (${conversations.length} total)`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl border transition-colors ${
                  showFilters ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>
              <label className="flex items-center space-x-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Import</span>
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 days</option>
                    <option value="month">Last 30 days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Media Type</label>
                  <select
                    value={filters.hasMedia}
                    onChange={(e) => setFilters(prev => ({ ...prev, hasMedia: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All conversations</option>
                    <option value="images">With images</option>
                    <option value="audio">With audio</option>
                    <option value="files">With files</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="updated">Last updated</option>
                    <option value="created">Date created</option>
                    <option value="title">Title (A-Z)</option>
                    <option value="messages">Message count</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              {searchQuery || Object.values(filters).some(f => f !== 'all' && f !== 'updated') ? 'No matches found' : 'No conversations yet'}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
              {searchQuery || Object.values(filters).some(f => f !== 'all' && f !== 'updated') 
                ? 'Try adjusting your search terms or filters to find what you\'re looking for.' 
                : 'Start a new conversation to begin chatting and see your history here.'}
            </p>
            {(searchQuery || Object.values(filters).some(f => f !== 'all' && f !== 'updated')) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilters({ dateRange: 'all', hasMedia: 'all', sortBy: 'updated' });
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>
                Showing {filteredConversations.length} of {conversations.length} conversations
              </span>
              <div className="flex items-center space-x-2">
                <SortDesc className="w-4 h-4" />
                <span>Sorted by {filters.sortBy === 'updated' ? 'last updated' : filters.sortBy}</span>
              </div>
            </div>
            {filteredConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isEditing={editingId === conv.id}
                editingTitle={editingTitle}
                currentConversationId={currentConversationId}
                onSelect={handleSelectConversation}
                onStartEdit={() => handleStartEdit(conv)}
                onSaveTitle={handleSaveTitle}
                onCancelEdit={() => setEditingId(null)}
                onSetEditingTitle={setEditingTitle}
                onDelete={handleDelete}
                onExport={exportConversation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationsHistory;