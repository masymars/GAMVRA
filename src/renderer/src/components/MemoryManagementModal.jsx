import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  CheckCircle, 
  Circle, 
  ClipboardList, 
  FileText, 
  FileScan, 
  FolderClosed, 
  X,
  AlertCircle,
  Calendar,
  FileImage
} from 'lucide-react';

/**
 * Modal component for managing patient medical records
 * Allows selecting which records to include as context for the AI assistant
 */
const MemoryManagementModal = ({ isOpen, onClose, patientRecords, selectedRecords, onToggleRecord }) => {
  const [patientInfo, setPatientInfo] = useState(null);
  const [userInfo, setUserInfo] = useState({ name: '', age: '', sex: '', medicalHistory: '' });
  const modalRef = useRef(null);
  
  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Extract patient info from records
  useEffect(() => {
    const info = patientRecords.find(record => record.type === 'patient_info');
    if (info) {
      setPatientInfo(info);
      
      // Try to extract name, age, and sex information from the content
      try {
        const nameMatch = info.content?.match(/name:?\s*([^,\n]+)/i);
        const ageMatch = info.content?.match(/age:?\s*([^,\n]+)/i);
        const sexMatch = info.content?.match(/sex:?\s*([^,\n]+)/i);
        const medicalHistoryMatch = info.content?.match(/medical history:?\s*([^,\n]+)/i);
        
        setUserInfo({
          name: nameMatch?.[1]?.trim() || '',
          age: ageMatch?.[1]?.trim() || '',
          sex: sexMatch?.[1]?.trim() || '',
          medicalHistory: medicalHistoryMatch?.[1]?.trim() || ''
        });
      } catch (err) {
        console.error('Error parsing patient info:', err);
      }
    } else {
      // Try to load from localStorage if available
      try {
        const userData = localStorage.getItem('userData');
        if (userData) {
          const parsed = JSON.parse(userData);
          setUserInfo({
            name: parsed.name || '',
            age: parsed.age || '',
            sex: parsed.sex || '',
            medicalHistory: parsed.medicalHistory || ''
          });
          
          // Automatically include medical history in selected records if it exists
          if (parsed.medicalHistory && !selectedRecords.includes('user_medical_history')) {
            onToggleRecord('user_medical_history');
          }
        }
      } catch (err) {
        console.error('Error loading user data from storage:', err);
      }
    }
  }, [patientRecords, onToggleRecord, selectedRecords]);
  
  // Get record icon based on type
  const getRecordIcon = (type) => {
    switch (type) {
      case 'medical_history':
        return <ClipboardList className="w-4 h-4 text-blue-600" />;
      case 'user_medical_history':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'lab_report':
      case 'blood_work':
        return <FileText className="w-4 h-4 text-green-600" />;
      case 'radiology':
      case 'xray_analysis':
      case 'mri/ct_scan':
        return <FileScan className="w-4 h-4 text-purple-600" />;
      case 'patient_info':
        return <User className="w-4 h-4 text-orange-600" />;
      default:
        return <FolderClosed className="w-4 h-4 text-gray-600" />;
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateString; // Return as is if cannot parse
    }
  };
  
  // Generate medical history record from user info if it exists
  const getMedicalHistoryRecord = () => {
    if (!userInfo.medicalHistory) return null;
    
    return {
      id: 'user_medical_history',
      title: 'User Medical History',
      type: 'user_medical_history',
      content: userInfo.medicalHistory,
      date: new Date().toISOString(),
      analysis: userInfo.medicalHistory
    };
  };
  
  // Get first image URL from record files if available
  const getRecordImage = (record) => {
    if (record.files && Array.isArray(record.files)) {
      const imageFile = record.files.find(file => file.type === 'image' || (file.url && file.url.startsWith('data:image')));
      return imageFile?.url || null;
    }
    
    // Check for returnedImageUrl field which some records might have
    if (record.returnedImageUrl) {
      return record.returnedImageUrl;
    }
    
    return null;
  };
  
  // Get a preview of the analysis text (first 100 characters)
  const getAnalysisPreview = (record) => {
    const analysisText = record.analysis || record.content || record.notes || '';
    return analysisText.length > 100 
      ? analysisText.substring(0, 100) + '...' 
      : analysisText;
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-black/60 to-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col border border-white/20"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary-200">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-100 p-2 rounded-full">
              <User className="w-5 h-5 text-primary-700" />
            </div>
            <div>
              <h3 className="font-medium text-primary-800">Patient Memory Management</h3>
              {(userInfo.name || userInfo.age || userInfo.sex) && (
                <p className="text-sm text-primary-600">
                  {userInfo.name && <span>{userInfo.name}</span>}
                  {userInfo.age && <span> • {userInfo.age}</span>}
                  {userInfo.sex && <span> • {userInfo.sex}</span>}
                </p>
              )}
              {userInfo.medicalHistory && (
                <div className="mt-2 bg-primary-50 p-2 rounded-md border border-primary-200">
                  <p className="text-sm text-primary-700">
                    <span className="font-medium">Medical History:</span> {userInfo.medicalHistory}
                  </p>
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-primary-100 rounded-full text-primary-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-sm text-primary-600 mb-3">
            All records are selected by default to provide comprehensive context to the AI assistant:
          </p>
          
          {userInfo.medicalHistory && (
            <div className="bg-primary-50 p-3 rounded-lg border border-primary-200 mb-4">
              <p className="text-sm flex items-center text-primary-700">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span>Your medical history is included as context for the AI when selected below.</span>
              </p>
            </div>
          )}
          {patientRecords.length === 0 && !userInfo.medicalHistory ? (
            <div className="text-center py-6 text-primary-500">
              <FolderClosed className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No medical records found.</p>
              <p className="text-xs mt-1">Upload and analyze medical files from the Records page.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Show medical history record if it exists */}
              {userInfo.medicalHistory && getMedicalHistoryRecord() && (
                <div 
                  key="user_medical_history"
                  className={`flex flex-col border rounded-lg overflow-hidden hover:shadow-md transition-shadow ${
                    selectedRecords.includes('user_medical_history') ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                  }`}
                  onClick={() => onToggleRecord('user_medical_history')}
                >
                  <div className="p-3 flex items-center border-b border-gray-200">
                    <div className="mr-2">
                      {selectedRecords.includes('user_medical_history') ? 
                        <CheckCircle className="w-5 h-5 text-primary-600" /> : 
                        <Circle className="w-5 h-5 text-primary-300" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        {getRecordIcon('user_medical_history')}
                        <span className="ml-2 font-medium text-primary-800 truncate">Personal Medical History</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="text-sm text-gray-700 mb-1 bg-primary-50 p-2 rounded border border-primary-100">
                      {userInfo.medicalHistory}
                    </div>
                    
                    <div className="flex items-center mt-auto text-xs text-primary-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(new Date().toISOString())}
                    </div>
                  </div>
                </div>
              )}
              
              {patientRecords.map(record => (
                <div 
                  key={record.id}
                  className={`flex flex-col border rounded-lg overflow-hidden hover:shadow-md transition-shadow ${
                    selectedRecords.includes(record.id) ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                  }`}
                  onClick={() => onToggleRecord(record.id)}
                >
                  <div className="p-3 flex items-center border-b border-gray-200">
                    <div className="mr-2">
                      {selectedRecords.includes(record.id) ? 
                        <CheckCircle className="w-5 h-5 text-primary-600" /> : 
                        <Circle className="w-5 h-5 text-primary-300" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        {getRecordIcon(record.type)}
                        <span className="ml-2 font-medium text-primary-800 truncate">{record.title}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Record preview section */}
                  <div className="p-3 flex-1 flex flex-col">
                    {getRecordImage(record) ? (
                      <div className="mb-2 h-24 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                        <img 
                          src={getRecordImage(record)} 
                          alt={record.title}
                          className="h-full object-contain" 
                        />
                      </div>
                    ) : (
                      <div className="mb-2 h-24 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                        <FileImage className="w-10 h-10 opacity-30" />
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-600 mb-1 line-clamp-2">
                      {getAnalysisPreview(record)}
                    </div>
                    
                    <div className="flex items-center mt-auto text-xs text-primary-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(record.date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Modal Footer */}
        <div className="p-4 border-t border-primary-200 flex justify-between items-center">
          <div className="text-sm text-primary-600">
            {selectedRecords.length} record{selectedRecords.length !== 1 ? 's' : ''} selected
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemoryManagementModal;
