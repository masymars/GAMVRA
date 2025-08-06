import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';

// Initialize with empty records array
const initialPatientRecords = [];

// Create the context
const PatientRecordsContext = createContext();

/**
 * Provider component for patient records management
 * Handles the state and functions for patient records
 */
export const PatientRecordsProvider = ({ children }) => {
  const [patientRecords, setPatientRecords] = useState(initialPatientRecords);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  
  // Load medical records from localStorage
  useEffect(() => {
    try {
      const savedRecords = localStorage.getItem('medicalRecords');
      if (savedRecords) {
        const records = JSON.parse(savedRecords);
        // Transform the records to match the format expected by the memory manager
        const transformedRecords = records.map(record => ({
          id: record.id,
          type: record.category.toLowerCase().replace(/\s+/g, '_') || 'general',
          title: record.title || 'Medical Record',
          date: record.fileDate || record.createdDate || new Date().toISOString().split('T')[0],
          content: record.analysis || record.notes || '',
          files: record.files || [],
          returnedImageUrl: record.returnedImageUrl || null,
          analysis: record.analysis || '',
          notes: record.notes || '',
        }));
        setPatientRecords(transformedRecords);
        
        // Auto-select all records by default
        setSelectedRecords(transformedRecords.map(record => record.id));
      }
    } catch (error) {
      console.error('Error loading medical records:', error);
    }
  }, []);
  
  // Toggle selection of a patient record
  const handleToggleRecord = useCallback((recordId) => {
    setSelectedRecords(prev => {
      if (prev.includes(recordId)) {
        return prev.filter(id => id !== recordId);
      } else {
        return [...prev, recordId];
      }
    });
  }, []);
  
  // Create system message from selected records
  const createSystemMessage = useCallback(() => {
    if (selectedRecords.length === 0) return null;
    
    // Get the selected record objects
    const records = patientRecords.filter(record => selectedRecords.includes(record.id));
    
    // Get patient info record if available
    const patientInfoRecord = patientRecords.find(record => record.type === 'patient_info');
    let patientInfo = {};
    
    if (patientInfoRecord) {
      try {
        const nameMatch = patientInfoRecord.content?.match(/name:?\s*([^,\n]+)/i);
        const ageMatch = patientInfoRecord.content?.match(/age:?\s*([^,\n]+)/i);
        const sexMatch = patientInfoRecord.content?.match(/sex:?\s*([^,\n]+)/i);
        
        patientInfo = {
          name: nameMatch?.[1]?.trim() || 'Unknown',
          age: ageMatch?.[1]?.trim() || 'Unknown',
          sex: sexMatch?.[1]?.trim() || 'Unknown'
        };
      } catch (err) {
        console.error('Error parsing patient info:', err);
      }
    } else {
      // Try to load from localStorage if available
      try {
        const userData = localStorage.getItem('userData');
        if (userData) {
          const parsed = JSON.parse(userData);
          patientInfo = {
            name: parsed.name || 'Unknown',
            age: parsed.age || 'Unknown',
            sex: parsed.sex || 'Unknown'
          };
        } else {
          patientInfo = {
            name: 'Unknown',
            age: 'Unknown',
            sex: 'Unknown'
          };
        }
      } catch (err) {
        console.error('Error loading user data from storage:', err);
        patientInfo = {
          name: 'Unknown',
          age: 'Unknown',
          sex: 'Unknown'
        };
      }
    }
    
    // Format the system message
    let systemMessage = "You are a medical AI assistant trained to analyze medical data and provide healthcare insights. Respond in a professional, clear, and informative manner. Use this patient information:\n\n";
    
    systemMessage += `PATIENT INFORMATION:\n`;
    systemMessage += `Name: ${patientInfo.name}\n`;
    systemMessage += `Age: ${patientInfo.age}\n`;
    systemMessage += `Sex: ${patientInfo.sex}\n\n`;
    
    systemMessage += `MEDICAL RECORDS (${records.length}):\n\n`;
    
    records.forEach((record, index) => {
      systemMessage += `RECORD #${index + 1}: ${record.title.toUpperCase()}\n`;
      systemMessage += `Date: ${formatDate(record.date)}\n`;
      systemMessage += `Category: ${record.type.replace(/_/g, ' ').toUpperCase()}\n`;
      
      // Include analysis content
      if (record.analysis || record.content) {
        systemMessage += `Analysis: ${record.analysis || record.content}\n`;
      }
      
      // Include image information if available
      if (record.returnedImageUrl || (record.files && record.files.some(file => file.type === 'image'))) {
        systemMessage += `Images: This record includes medical imagery that has been analyzed\n`;
      }
      
      systemMessage += `\n`;
    });
    
    systemMessage += `Based on this information, provide accurate and helpful medical insights. Always clarify when more information might be needed for a definitive assessment.`;
    
    return systemMessage;
  }, [selectedRecords, patientRecords]);
  
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
  
  const openMemoryModal = useCallback(() => {
    setIsMemoryModalOpen(true);
  }, []);
  
  const closeMemoryModal = useCallback(() => {
    setIsMemoryModalOpen(false);
  }, []);
  
  // Add a new patient record
  const addPatientRecord = useCallback((record) => {
    setPatientRecords(prev => [...prev, {
      id: `rec${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ...record
    }]);
  }, []);
  
  // Delete a patient record
  const deletePatientRecord = useCallback((recordId) => {
    setPatientRecords(prev => prev.filter(record => record.id !== recordId));
    setSelectedRecords(prev => prev.filter(id => id !== recordId));
  }, []);
  
  // Update a patient record
  const updatePatientRecord = useCallback((updatedRecord) => {
    setPatientRecords(prev => 
      prev.map(record => 
        record.id === updatedRecord.id ? { ...record, ...updatedRecord } : record
      )
    );
  }, []);
  
  // Context value
  const contextValue = {
    patientRecords,
    selectedRecords,
    isMemoryModalOpen,
    handleToggleRecord,
    createSystemMessage,
    openMemoryModal,
    closeMemoryModal,
    addPatientRecord,
    deletePatientRecord,
    updatePatientRecord
  };
  
  return (
    <PatientRecordsContext.Provider value={contextValue}>
      {children}
    </PatientRecordsContext.Provider>
  );
};

/**
 * Custom hook to use the patient records context
 */
export const usePatientRecords = () => {
  const context = useContext(PatientRecordsContext);
  if (!context) {
    throw new Error('usePatientRecords must be used within a PatientRecordsProvider');
  }
  return context;
};

export default PatientRecordsContext;
