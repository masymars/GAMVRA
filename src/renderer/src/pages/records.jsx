import React, { useState, useEffect, useRef } from 'react';
import { Database, Search, ChevronDown, ChevronRight, Plus, FileText, ImageIcon, FileAudio, Eye, Trash2, Edit } from 'lucide-react';
import { useGemma } from '../api/gemma';
import { useRecordManagement, getFileIcon } from '../api/recordManagement.jsx';
import AddRecordModal from '../components/AddRecordModal';
import EditRecordModal from '../components/EditRecordModal';

const Records = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false); // State for webcam modal
  const [analysisMode, setAnalysisMode] = useState('ocr'); // 'ocr' or 'vision'

  const fileInputRef = useRef(null);
  const videoRef = useRef(null); // Ref for webcam video element
  const webcamStreamRef = useRef(null); // Ref to store the webcam stream

  // Get all the Gemma functions including OCR-specific ones
  const { 
    generateStructuredResponse, 
    isLoading,
    generateOCRResponse,
    isLoading: isLoadingGemma,
    progress: gemmaProgress
  } = useGemma();
  
  // Use the record management hook with both standard and OCR-specific functions
  const recordManager = useRecordManagement(
    generateStructuredResponse, 
    isLoading,
    generateOCRResponse,
    isLoadingGemma,
    gemmaProgress
  );
  
  useEffect(() => {
    try {
      const savedRecords = localStorage.getItem('medicalRecords');
      if (savedRecords) {
        setMedicalRecords(JSON.parse(savedRecords));
      }
    } catch (error) {
      console.error('Error loading saved records:', error);
    }
  }, []);
  
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    recordManager.addFilesToState(files);
  };

  // --- Webcam Functions ---
  const startWebcam = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Webcam is not supported by your browser.");
      return;
    }
    setShowWebcam(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      webcamStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      alert("Could not access the webcam. Please ensure camera permissions are enabled.");
      setShowWebcam(false);
    }
  };

  const stopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setShowWebcam(false);
  };
  
  const handleCapture = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `webcam-${timestamp}.jpg`;
      const imageFile = new File([blob], fileName, { type: 'image/jpeg' });
      recordManager.addFilesToState([imageFile]); // Use the centralized function in recordManager
      stopWebcam();
    }, 'image/jpeg');
  };

  const handleCloseModal = () => {
    if (showWebcam) {
      stopWebcam();
    }
    recordManager.resetAndCloseModal();
    setShowAddModal(false);
    setShowEditModal(false);
  };
  
  const handleSaveRecord = () => {
    const success = recordManager.saveRecord();
    if (success) {
      setShowAddModal(false);
    }
  };
  
  // Handle analysis with selected mode
  const handleAnalyzeWithMode = () => {
    recordManager.analyzeAndPopulate(analysisMode);
  };
  
  // Handle record deletion
  const handleDeleteRecord = (recordId, event) => {
    event.stopPropagation(); // Prevent expanding the record when clicking delete
    const success = recordManager.deleteRecord(recordId);
    if (success) {
      // Record was successfully deleted
      console.log(`Record ${recordId} deleted successfully`);
    }
  };
  
  // Handle edit record
  const handleEditRecord = (recordId, event) => {
    event.stopPropagation(); // Prevent expanding the record when clicking edit
    const recordToEdit = recordManager.prepareRecordForEdit(recordId);
    if (recordToEdit) {
      setShowEditModal(true);
    }
  };
  
  // Handle record update
  const handleUpdateRecord = () => {
    const success = recordManager.updateRecord();
    if (success) {
      setShowEditModal(false);
    }
  };
  
  // Get filtered records based on search term
  const filteredRecords = recordManager.getFilteredRecords(searchTerm);

  // Use the getFileIcon from recordManagement with the icons
  const renderFileIcon = (type) => {
    return getFileIcon(type, { ImageIcon, FileAudio, FileText });
  };



  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Medical Records</h1>
      
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          <span>Add Record</span>
        </button>
      </div>
      
      {/* Search bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-600" />
        </div>
        <input
          type="text"
          placeholder="Search records..."
          className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-600 text-gray-800"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {/* Records list or empty state */}
      {filteredRecords.length > 0 ? (
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <div 
              key={record.id} 
              className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
            >
              <div 
                className="flex items-center justify-between p-4 cursor-pointer bg-white"
                onClick={() => recordManager.toggleExpand(record.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-teal-600">
                    {renderFileIcon(record.type || 'text')}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">{record.title || 'Untitled Record'}</h3>
                    <p className="text-sm text-gray-500">
                      {record.date ? new Date(record.date).toLocaleDateString() : 'No date'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={(e) => handleEditRecord(record.id, e)}
                    className="p-1 text-gray-500 hover:text-teal-600 rounded"
                    title="Edit record"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteRecord(record.id, e)}
                    className="p-1 text-gray-500 hover:text-red-600 rounded"
                    title="Delete record"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  {record.expanded ? 
                    <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  }
                </div>
              </div>
              
              {record.expanded && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  {record.content && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                      <p className="text-gray-600">{record.content}</p>
                    </div>
                  )}
                  
                  {record.files && record.files.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Attached Files</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {record.files.map((file, index) => (
                          <div key={index} className="border border-gray-200 rounded p-2 bg-white">
                            <div className="flex items-center justify-center h-24 bg-gray-100 rounded mb-2">
                              {renderFileIcon(file.type || 'text')}
                            </div>
                            <p className="text-xs text-center text-gray-600 truncate">{file.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
          <Database className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Medical Records</h3>
          <p className="text-gray-500 text-center max-w-md mb-6">You don't have any medical records yet. Add your first record to get started.</p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            <span>Add Record</span>
          </button>
        </div>
      )}

      <AddRecordModal
        showModal={showAddModal}
        onClose={handleCloseModal}
        newRecord={recordManager.newRecord}
        setNewRecord={recordManager.setNewRecord}
        analysis={recordManager.analysis}
        setAnalysis={recordManager.setAnalysis}
        returnedImageUrl={recordManager.returnedImageUrl}
        setReturnedImageUrl={recordManager.setReturnedImageUrl}
        isAnalyzing={recordManager.isAnalyzing}
        setIsAnalyzing={recordManager.setIsAnalyzing}
        analysisProgress={recordManager.analysisProgress}
        showWebcam={showWebcam}
        setShowWebcam={setShowWebcam}
        isLoading={isLoading || isLoadingGemma}
        onSaveRecord={handleSaveRecord}
        onAnalyzeAndPopulate={handleAnalyzeWithMode}
        onStartWebcam={startWebcam}
        onStopWebcam={stopWebcam}
        onHandleCapture={handleCapture}
        videoRef={videoRef}
        addFilesToState={recordManager.addFilesToState}
        removeFile={recordManager.removeFile}
        getFileIcon={renderFileIcon}
        analysisMode={analysisMode}
        setAnalysisMode={setAnalysisMode}
 
      />

      <EditRecordModal
        showModal={showEditModal}
        onClose={handleCloseModal}
        recordToEdit={recordManager.newRecord}
        setNewRecord={recordManager.setNewRecord}
        analysis={recordManager.analysis}
        setAnalysis={recordManager.setAnalysis}
        returnedImageUrl={recordManager.returnedImageUrl}
        setReturnedImageUrl={recordManager.setReturnedImageUrl}
        isAnalyzing={recordManager.isAnalyzing}
        setIsAnalyzing={recordManager.setIsAnalyzing}
        analysisProgress={recordManager.analysisProgress}
        showWebcam={showWebcam}
        setShowWebcam={setShowWebcam}
        isLoading={isLoading || isLoadingGemma}
        onUpdateRecord={handleUpdateRecord}
        onAnalyzeAndPopulate={handleAnalyzeWithMode}
        onStartWebcam={startWebcam}
        onStopWebcam={stopWebcam}
        onHandleCapture={handleCapture}
        videoRef={videoRef}
        addFilesToState={recordManager.addFilesToState}
        removeFile={recordManager.removeFile}
        getFileIcon={renderFileIcon}
        analysisMode={analysisMode}
        setAnalysisMode={setAnalysisMode}
 
      />
    </div>
  );
};

export default Records;