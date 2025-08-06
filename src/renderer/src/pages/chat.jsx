import React from 'react';
import {
  Upload, Mic, MicOff, FileScan, FileText, Send, Trash2, Download,
  Settings, Stethoscope, BrainCircuit, FileAudio, BotMessageSquare,
  HeartPulse, ArrowLeft, Database
} from 'lucide-react';
import { useGemma } from '../api/gemma';
import { useConversationHandler } from '../api/conversationHandler';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import MemoryManagementModal from '../components/MemoryManagementModal';
import { usePatientRecords } from '../components/PatientRecordsContext';
import { MessageBubble } from '../components/MessageBubble'; // <-- Import the new component

// Mock data for UI display purposes
const MediGemmaModels = {
  'core-radiology-4b': {
    name: 'Gemma 3N ',
    description: 'Enhanced for analyzing radiological and diagnostic imagery.',
    capabilities: ['X-Ray Analysis', 'MRI/CT Scans', 'Pathology Slides', 'Audio Transcription'],
  }
};

// Simple debounce function
const debounce = (func, wait) => {
  let timeout;
  const debounced = (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
  debounced.cancel = () => clearTimeout(timeout);
  return debounced;
};

// MultimodalInput component (remains unchanged)
const MultimodalInput = ({ onSubmit, isLoading, waitingForResponse, ensureConversationExists }) => {
  const [textInput, setTextInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const fileInputRef = useRef(null);
  const filesCleanupRef = useRef(new Set());

  const isDisabled = isLoading || waitingForResponse;

  const cleanupFiles = useCallback(() => {
    filesCleanupRef.current.forEach(url => {
      URL.revokeObjectURL(url);
    });
    filesCleanupRef.current.clear();
  }, []);

  useEffect(() => {
    return cleanupFiles;
  }, [cleanupFiles]);

  const addFileWithCleanup = useCallback((file) => {
    const url = URL.createObjectURL(file);
    filesCleanupRef.current.add(url);
    return {
      file,
      type: file.type.split('/')[0] || file.type,
      name: file.name,
      url,
      id: Math.random().toString(36).substr(2, 9)
    };
  }, []);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setUploadedFiles(prev => [
      ...prev,
      ...files.map(addFileWithCleanup)
    ]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];
      mediaRecorder.ondataavailable = (event) => chunks.push(event.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const audioFile = new File([blob], "patient-audio-note.wav", { type: 'audio/wav' });
        setAudioBlob({ file: audioFile, type: 'audio', name: 'Patient Audio Note' });
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const removeFile = (id) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.url) {
        URL.revokeObjectURL(fileToRemove.url);
        filesCleanupRef.current.delete(fileToRemove.url);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const removeAudio = () => {
    setAudioBlob(null);
  }

  const handleSubmit = () => {
    if (!textInput.trim() && uploadedFiles.length === 0 && !audioBlob) return;
    ensureConversationExists();
    const inputData = { text: textInput, files: uploadedFiles, audioRecording: audioBlob };
    onSubmit(inputData);
    cleanupFiles();
    setTextInput('');
    setUploadedFiles([]);
    setAudioBlob(null);
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image')) return <FileScan className="w-4 h-4 text-teal-700" />;
    if (type.startsWith('audio')) return <FileAudio className="w-4 h-4 text-teal-700" />;
    return <FileText className="w-4 h-4 text-teal-700" />;
  };

  return (
    <div className="bg-white border border-primary-200 rounded-xl p-3 shadow-sm">
      <div className="space-y-3">
        {(uploadedFiles.length > 0 || audioBlob) && (
          <div className="p-3 bg-primary-50 rounded-lg">
            <h4 className="text-sm font-medium text-primary-800 mb-2">Attached Medical Data:</h4>
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center space-x-2 bg-primary-100 rounded-full px-3 py-1.5 text-sm">
                  {getFileIcon(file.type)}
                  <span className="text-primary-800 truncate max-w-40">{file.name}</span>
                  <button onClick={() => removeFile(file.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {audioBlob && (
                <div className="flex items-center space-x-2 bg-primary-100 rounded-full px-3 py-1.5 text-sm">
                  <FileAudio className="w-4 h-4 text-primary-700" />
                  <span className="text-primary-800">{audioBlob.name}</span>
                  <button onClick={removeAudio} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex items-start space-x-2">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter symptoms, ask about a diagnosis, or attach medical files (X-rays, lab reports)..."
            className="flex-1 p-3 border border-primary-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-primary-800"
            rows={3}
            disabled={isDisabled}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isDisabled) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex flex-col space-y-1">
            <button
              onClick={handleSubmit}
              disabled={isDisabled || (!textInput.trim() && uploadedFiles.length === 0 && !audioBlob)}
              className="px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center h-full"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex justify-start space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled}
            className="flex items-center space-x-2 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            <span>Attach File</span>
          </button>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isDisabled}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              isRecording
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isRecording ? 'Stop Recording' : 'Record Note'}</span>
          </button>
          <p className="text-xs text-primary-500 self-center">Supports images, audio notes, and text files.</p>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,audio/*,.txt,.pdf"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};


// AICoreSelector component (remains unchanged)
const AICoreSelector = ({ models }) => {
  const selectedCore = 'core-radiology-4b';
  return (
    <div className="bg-white border-b border-primary-200 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <HeartPulse className="w-8 h-8 text-primary-600" />
          <h1 className="text-2xl font-bold text-primary-800">MediGemma AI</h1>
          <span className="px-3 py-2 border border-primary-300 rounded-lg bg-primary-50 text-primary-700">
            {models[selectedCore].name}
          </span>
        </div>
      </div>
    </div>
  );
};


// Main Chat page component
const ChatPage = () => {
  const location = useLocation();
  const {
    modelStatus,
    initMessage,
    isModelReady,
    isLoading,
    messages,
    generateResponse,
    clearConversation,
    setMessages
  } = useGemma();

  const {
    currentConversationId,
    createNewConversation,
    loadConversation,
    autoSaveCurrentConversation,
    setCurrentConversationId
  } = useConversationHandler();

  const {
    patientRecords,
    selectedRecords,
    isMemoryModalOpen,
    handleToggleRecord,
    createSystemMessage,
    openMemoryModal,
    closeMemoryModal
  } = usePatientRecords();

  const debouncedAutoSave = useMemo(
    () => debounce((messages, conversationId) => {
      if (messages.length > 0 && conversationId) {
        autoSaveCurrentConversation(messages);
      }
    }, 500),
    [autoSaveCurrentConversation]
  );

  useEffect(() => {
    if (location.state?.selectedConversation) {
      const conversation = location.state.selectedConversation;
      setMessages(conversation.messages);
      setCurrentConversationId(conversation.id);
      window.history.replaceState({}, document.title);
    } else if (location.state?.createNew) {
      const newConv = createNewConversation();
      setMessages([]);
      setCurrentConversationId(newConv.id);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setMessages, setCurrentConversationId, createNewConversation]);

  useEffect(() => {
    debouncedAutoSave(messages, currentConversationId);
    return () => {
      debouncedAutoSave.cancel();
    };
  }, [messages, currentConversationId, debouncedAutoSave]);

  const ensureConversationExists = useCallback(() => {
    if (!currentConversationId) {
      const newConv = createNewConversation();
      setCurrentConversationId(newConv.id);
      return newConv.id;
    }
    return currentConversationId;
  }, [currentConversationId, createNewConversation, setCurrentConversationId]);

  const waitingForResponse = messages.length > 0 &&
    messages[messages.length - 1].role === 'assistant' &&
    !messages[messages.length - 1].complete;

  const handleGenerateResponse = useCallback((inputData) => {
    const systemMessage = createSystemMessage();
    if (systemMessage) {
      if (!sessionStorage.getItem('systemPromptNotified')) {
        setMessages(prev => [
          ...prev,
          {
            role: 'system',
            content: 'Using patient records and information as context for this conversation.',
            timestamp: new Date().toISOString(),
            complete: true,
            isNotification: true
          }
        ]);
        sessionStorage.setItem('systemPromptNotified', 'true');
      }
      generateResponse({
        ...inputData,
        systemPrompt: systemMessage
      });
    } else {
      generateResponse(inputData);
    }
  }, [generateResponse, createSystemMessage, setMessages]);

  const handleClearConversation = () => {
    clearConversation();
    setCurrentConversationId(null);
  };

  const exportCurrentConversation = () => {
    const exportData = {
      model: 'core-radiology-4b',
      timestamp: new Date().toISOString(),
      conversationId: currentConversationId,
      messages: messages.map(m => ({
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
    link.download = `medigemma-session-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-primary-50/50">
      <AICoreSelector models={MediGemmaModels} />

      <div className="bg-white border-b border-primary-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-primary-600 font-medium">Messages: {messages.length}</div>
          <div className="flex items-center space-x-2">
            <button
              onClick={openMemoryModal}
              className="flex items-center space-x-1.5 px-3 py-1 text-sm text-primary-600 hover:text-primary-800 hover:bg-primary-100 rounded-md"
            >
              <Database className="w-4 h-4" />
              <span>Patient Records ({selectedRecords.length})</span>
            </button>
            <button
              onClick={exportCurrentConversation}
              disabled={messages.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1 text-sm text-primary-600 hover:text-primary-800 hover:bg-primary-100 rounded-md disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={handleClearConversation}
              disabled={messages.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-primary-400">
            <BotMessageSquare className="w-16 h-16 mb-4 opacity-50" />
            <h3 className="text-xl font-medium mb-2">Start a new conversation</h3>
            <p className="max-w-md">Ask a medical question or upload diagnostic images like X-rays, CT scans, or lab reports for analysis.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* --- REFACTORED MESSAGE LIST --- */}
            {messages.map((msg, index) => (
              <MessageBubble key={index} message={msg} />
            ))}
            {/* --- END REFACTORED MESSAGE LIST --- */}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-3xl rounded-lg p-4 bg-white border border-primary-200 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-primary-200 p-4 bg-primary-50/50 mt-auto">
        <MultimodalInput
          onSubmit={handleGenerateResponse}
          isLoading={isLoading}
          waitingForResponse={waitingForResponse}
          ensureConversationExists={ensureConversationExists}
        />
      </div>

      <MemoryManagementModal
        isOpen={isMemoryModalOpen}
        onClose={closeMemoryModal}
        patientRecords={patientRecords}
        selectedRecords={selectedRecords}
        onToggleRecord={handleToggleRecord}
      />
    </div>
  );
};

export default ChatPage;