import React from 'react';
import { useState, useEffect } from 'react';
import { usePatientRecords } from '../components/PatientRecordsContext';

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

// Helper function to extract field values from text when JSON parsing fails
const extractFieldFromText = (text, field) => {
  const patterns = [
    new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`, 'i'),
    new RegExp(`${field}\\s*:\\s*"([^"]*)"`, 'i'),
    new RegExp(`${field}\\s*:\\s*([^\\n,}]*)`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
};

export const useRecordManagement = (generateStructuredResponse, isLoading, 
  generateOCRResponse, isLoadingGemma, gemmaProgress) => {
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [expandedRecords, setExpandedRecords] = useState({});
  const [newRecord, setNewRecord] = useState({
    title: '',
    category: '',
    notes: '',
    files: [],
    fileDate: '',
  });
  const [analysis, setAnalysis] = useState('');
  const [returnedImageUrl, setReturnedImageUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const { addPatientRecord, deletePatientRecord, updatePatientRecord } = usePatientRecords();
  
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
  
  // Update the progress based on the mode
  useEffect(() => {
    if (isLoadingGemma && gemmaProgress) {
      setAnalysisProgress(gemmaProgress);
    }
  }, [isLoadingGemma, gemmaProgress]);

  // Centralized function to process files into Base64 and add to state
  const addFilesToState = (files) => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = {
          file, // Keep original file object for AI processing
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.type.split('/')[0] || 'file',
          size: formatFileSize(file.size),
          url: e.target.result, // Use Base64 Data URL for persistence
        };
        
        setNewRecord(prev => ({
          ...prev,
          files: [...prev.files, fileData]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (fileId) => {
    setNewRecord(prev => ({
      ...prev,
      files: prev.files.filter(file => file.id !== fileId)
    }));
  };

  const analyzeAndPopulate = async (mode = 'ocr') => {
    console.log(`🔍 Starting analysis with ${mode.toUpperCase()} mode...`);
    console.log('Files to analyze:', newRecord.files);
    
    if (newRecord.files.length === 0) {
      console.log('❌ No files to analyze');
      alert('Please upload files before analyzing.');
      return;
    }
    
    if (newRecord.files.length > 1) {
      const proceed = confirm(`Note: The AI can currently analyze one file at a time. Only the first file (${newRecord.files[0].name}) will be analyzed. Do you want to continue?`);
      if (!proceed) return;
    }
    
    setIsAnalyzing(true);
    setAnalysis('');
    setReturnedImageUrl('');
    setAnalysisProgress(0);
    console.log(`✅ Analysis state set to true (${mode} mode)`);

    try {
      const fileToAnalyze = newRecord.files[0].file;
      let structuredData;
      
      if (mode === 'ocr' && generateOCRResponse) {
        console.log('🚀 Using generateOCRResponse for OCR analysis...');
        
        const prompt = `Analyze this medical document and extract ALL relevant information.
        Return a JSON object with the following structure:
        {
          "title": "A descriptive title for the medical record",
          "category": "Choose from: General, Radiology, Blood Work, Cardiology, Dermatology, Prescription, etc.",
          "notes": "A brief summary of the document",
          "analysis": "A detailed interpretation of the medical document"
        }
        
        Focus on extracting text information and interpreting medical values, results, or instructions.
        Return ONLY the JSON object without any additional text or formatting.`;
        
        const ocrResponse = await generateOCRResponse(fileToAnalyze, prompt);
        console.log('📊 Received OCR response:', ocrResponse);
        
        structuredData = processOCRResponse(ocrResponse);

      } else {
        console.log(`🚀 Using generateStructuredResponse for ${mode.toUpperCase()} analysis...`);
        
        const prompt = mode === 'ocr'

? `You are a medical document analyzer with OCR capabilities. Analyze the attached medical document and extract all relevant textual information. Return ONLY a valid JSON object with no additional text, explanations, or formatting.



CRITICAL INSTRUCTIONS:

- Return ONLY raw JSON - no markdown, no backticks, no explanatory text

- Do not include any text before or after the JSON object

- Follow the exact schema provided below

- Ensure all string values are properly quoted

- Do not include any line breaks within string values

- ANALYSIS GUIDELINES: Focus on extracting and interpreting text information from the document. Identify key measurements, values, and what they typically represent.



Required JSON Schema:

{

"title": "A concise, descriptive title for the medical record based on textual content (e.g., 'Annual Check-up Results 2024', 'MRI Report for Left Knee')",

"category": "Choose exactly one: General, Radiology, Blood Work, Cardiology, Dermatology, Skin Imaging, Mole & Lesion Analysis, Wound Assessment, Rash & Skin Condition, Body Part Examination, Joint & Limb Analysis, Posture Assessment, X-Ray Analysis, MRI/CT Scan, Ultrasound Imaging, Endocrinology, Neurology, Physical Therapy, Prescription, Other",

"notes": "A brief 1-2 sentence summary of the document's purpose or key findings based on text extraction",

"analysis": "A detailed factual interpretation of the text extracted from the document. Focus on numeric values, measurements, test results, prescriptions, and clinical observations found in the document text."

}



Return the JSON object now:`

: `You are a medical image analyzer with computer vision capabilities. Analyze the attached medical image and focus on visual features, anomalies, and patterns. Return ONLY a valid JSON object with no additional text, explanations, or formatting.



CRITICAL INSTRUCTIONS:

- Return ONLY raw JSON - no markdown, no backticks, no explanatory text

- Do not include any text before or after the JSON object

- Follow the exact schema provided below

- Ensure all string values are properly quoted

- Do not include any line breaks within string values

- ANALYSIS GUIDELINES: Focus on visual features, patterns, and anomalies in the image. Describe what you see without making diagnostic claims. Identify visible structures, areas of interest, and notable visual characteristics.



Required JSON Schema:

{

"title": "A concise, descriptive title for the medical image (e.g., 'Chest X-Ray', 'Skin Lesion Image', 'Wound Assessment')",

"category": "Choose exactly one: General, Radiology, Blood Work, Cardiology, Dermatology, Skin Imaging, Mole & Lesion Analysis, Wound Assessment, Rash & Skin Condition, Body Part Examination, Joint & Limb Analysis, Posture Assessment, X-Ray Analysis, MRI/CT Scan, Ultrasound Imaging, Endocrinology, Neurology, Physical Therapy, Prescription, Other",

"notes": "A brief 1-2 sentence summary of what the image shows visually",

"analysis": "A detailed description of the visual features in the image. Include observations about colors, shapes, patterns, structures, anatomical features, or any notable visual characteristics. Describe the image in clinical terms but do not provide a diagnosis."

}



Return the JSON object now:`;



        const promptFiles = [{
          file: fileToAnalyze,
          name: newRecord.files[0].name,
          type: fileToAnalyze.type
        }];
        
        const inputData = { text: prompt, files: promptFiles, mode: mode };
        console.log('Input data:', inputData);
        
        const response = await generateStructuredResponse(inputData);
        console.log('📊 Received structured response:', response);
        
        structuredData = processStructuredResponse(response);
      }
      
      console.log('📝 Updating form fields with:');
      console.log('- Title:', structuredData.title);
      console.log('- Category:', structuredData.category);
      console.log('- Notes:', structuredData.notes);
      
      setNewRecord(prev => ({
        ...prev,
        title: structuredData.title || '',
        category: structuredData.category || '',
        notes: structuredData.notes || '',
      }));
      
      setAnalysis(structuredData.analysis || `No detailed ${mode} analysis was provided by the AI.`);
      
      if (structuredData.imageUrl) {
        setReturnedImageUrl(structuredData.imageUrl);
        console.log('🖼️ Received and set image URL from AI:', structuredData.imageUrl);
      }
      
      console.log(`✅ Analysis with ${mode.toUpperCase()} completed successfully`);
      setAnalysisProgress(100);
      
    } catch (error) {
      console.error(`❌ ${mode.toUpperCase()} analysis error:`, error);
      setAnalysis(`Error analyzing files with ${mode.toUpperCase()}: ${error.message}`);
      alert(`${mode.toUpperCase()} analysis failed: ${error.message}`);
      setAnalysisProgress(0);
    } finally {
      setIsAnalyzing(false);
      console.log(`🏁 Analysis state set to false (${mode} mode)`);
    }
  };

  // Helper function to process OCR response from Gemma
  const processOCRResponse = (response) => {
    let structuredResult = {};
    // **FIX**: Capture imageUrl at the beginning
    const potentialImageUrl = response.imageUrl || null;

    try {
      if (response && typeof response === 'object') {
        if (response.llmResponse) {
          const jsonString = response.llmResponse.replace(/```json\n|\n```/g, '');
          try {
            structuredResult = validateResponseData(JSON.parse(jsonString));
          } catch (parseError) {
            console.error('❌ Failed to parse JSON from llmResponse:', parseError);
            structuredResult = {
              title: extractFieldFromText(response.llmResponse, 'title') || 'Medical Document Analysis',
              category: extractFieldFromText(response.llmResponse, 'category') || 'General',
              notes: extractFieldFromText(response.llmResponse, 'notes') || 'AI-generated OCR analysis',
              analysis: response.llmResponse || response.extractedText || 'Unable to generate detailed analysis'
            };
          }
        } else {
          structuredResult = validateResponseData(response);
        }
      } else if (typeof response === 'string') {
        let cleanResponse = response.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) cleanResponse = jsonMatch[0];
        try {
            structuredResult = validateResponseData(JSON.parse(cleanResponse));
        } catch (e) {
            structuredResult = { analysis: response }; // Fallback
        }
      }
    } catch (error) {
        console.error('❌ Error processing OCR response:', error);
        structuredResult = { analysis: 'Error processing OCR response.' };
    }
    
    // **FIX**: Add the captured imageUrl back to the final object
    if (potentialImageUrl) {
      structuredResult.imageUrl = potentialImageUrl;
    }
    
    return structuredResult;
  };

  // Helper function to process structured response from general API
  const processStructuredResponse = (response) => {
    let structuredResult = {};
    // **FIX**: Capture imageUrl at the beginning
    const potentialImageUrl = response.imageUrl || null;

    try {
      if (response && typeof response === 'object') {
        structuredResult = validateResponseData(response);
      } else if (typeof response === 'string') {
        let cleanResponse = response.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) cleanResponse = jsonMatch[0];
        try {
          structuredResult = validateResponseData(JSON.parse(cleanResponse));
        } catch (parseError) {
          console.error('❌ Failed to parse string response as JSON:', parseError);
          structuredResult = {
            title: extractFieldFromText(response, 'title') || 'Medical Image Analysis',
            category: extractFieldFromText(response, 'category') || 'General',
            notes: extractFieldFromText(response, 'notes') || 'AI-generated vision analysis',
            analysis: response
          };
        }
      }
    } catch (error) {
        console.error('❌ Error processing response:', error);
        structuredResult = { analysis: 'Error processing response.' };
    }

    // **FIX**: Add the captured imageUrl back to the final object
    if (potentialImageUrl) {
      structuredResult.imageUrl = potentialImageUrl;
    }
    
    return structuredResult;
  };

  // (The rest of your code: validateResponseData, saveRecord, etc. remains the same)
  // ...
  const validateResponseData = (data) => {
    // Validate and set defaults for missing fields
    const requiredFields = ['title', 'category', 'notes', 'analysis'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      console.warn('⚠️ Missing required fields:', missingFields);
      // Create a new object to avoid mutating the input
      const validatedData = { ...data };
      if (!validatedData.title) validatedData.title = 'Medical Analysis';
      if (!validatedData.category) validatedData.category = 'General';
      if (!validatedData.notes) validatedData.notes = 'AI-generated analysis';
      if (!validatedData.analysis) validatedData.analysis = 'Unable to generate detailed analysis';
      
      return validatedData;
    }
    
    // If all fields are present, validate category
    const allowedCategories = [
      'General', 'Radiology', 'Blood Work', 'Cardiology', 'Dermatology', 
      'Skin Imaging', 'Mole & Lesion Analysis', 'Wound Assessment', 'Rash & Skin Condition',
      'Body Part Examination', 'Joint & Limb Analysis', 'Posture Assessment',
      'X-Ray Analysis', 'MRI/CT Scan', 'Ultrasound Imaging',
      'Endocrinology', 'Neurology', 'Physical Therapy', 'Prescription', 'Other'
    ];
    
    // Create a new object to avoid mutating the input
    const validatedData = { ...data };
    
    if (!allowedCategories.includes(validatedData.category)) {
      console.warn('⚠️ Invalid category received:', validatedData.category);
      validatedData.category = 'General';
    }
    
    return validatedData;
  };

  const resetAndCloseModal = () => {
    setNewRecord({ title: '', category: '', notes: '', files: [], fileDate: '' });
    setAnalysis('');
    setReturnedImageUrl('');
    setAnalysisProgress(0);
    return false; // Return false to allow the component to handle the modal state
  };
  
  const saveRecord = () => {
    if (!newRecord.title) {
      alert('Please provide a title for this record.');
      return false;
    }
    if (!newRecord.fileDate) {
      alert('Please provide a date for this record.');
      return false;
    }
    if (newRecord.files.length === 0) {
      alert('Please upload at least one file.');
      return false;
    }
    if (!analysis) {
      alert('Please analyze the files before saving.');
      return false;
    }
    if (isAnalyzing || isLoading || isLoadingGemma) {
      alert('Please wait for analysis to complete.');
      return false;
    }
    
    const newId = `REC-${new Date().getFullYear()}-${String(medicalRecords.length + 1).padStart(3, '0')}`;
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    const record = {
      id: newId,
      category: newRecord.category || "General",
      createdDate: today,
      fileDate: newRecord.fileDate, // Save the new record date
      title: newRecord.title,
      notes: newRecord.notes || "",
      files: newRecord.files.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        size: f.size,
        url: f.url
      })),
      analysis: analysis,
      ...(returnedImageUrl && { returnedImageUrl: returnedImageUrl })
    };
    
    const updatedRecords = [record, ...medicalRecords];
    setMedicalRecords(updatedRecords);
    
    try {
      localStorage.setItem('medicalRecords', JSON.stringify(updatedRecords));
      
      // Also add to PatientRecordsContext
      addPatientRecord({
        id: record.id,
        type: record.category.toLowerCase().replace(/\s+/g, '_') || 'general',
        title: record.title,
        date: record.fileDate || record.createdDate,
        content: record.analysis || record.notes || '',
      });
    } catch (e) {
      console.error('Error saving to localStorage:', e);
      alert('Error saving record. The file(s) might be too large for local storage.');
      return false;
    }
    
    return true; // Return true to indicate successful save
  };
  
  const getFilteredRecords = (searchTerm) => {
    return medicalRecords
      .filter(record =>
        (record.title && record.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.category && record.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.id && record.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.notes && record.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .map(record => ({
        ...record,
        expanded: expandedRecords[record.id] || false
      }));
  };
  
  const toggleExpand = (recordId) => {
    setExpandedRecords(prev => ({ ...prev, [recordId]: !prev[recordId] }));
  };
  
  // Delete a record
  const deleteRecord = (recordId) => {
    if (window.confirm("Are you sure you want to delete this record? This action cannot be undone.")) {
      const updatedRecords = medicalRecords.filter(record => record.id !== recordId);
      setMedicalRecords(updatedRecords);
      
      // Also update localStorage
      try {
        localStorage.setItem('medicalRecords', JSON.stringify(updatedRecords));
        
        // Also update PatientRecordsContext
        deletePatientRecord(recordId);
      } catch (e) {
        console.error('Error saving to localStorage:', e);
        alert('Error deleting record.');
        return false;
      }
      
      return true;
    }
    return false;
  };
  
  // Prepare record for editing
  const prepareRecordForEdit = (recordId) => {
    const recordToEdit = medicalRecords.find(record => record.id === recordId);
    if (!recordToEdit) return null;
    
    // Set the current record data to the form state
    setNewRecord({
      id: recordToEdit.id, // Include ID for editing mode
      title: recordToEdit.title || '',
      category: recordToEdit.category || '',
      notes: recordToEdit.notes || '',
      files: recordToEdit.files || [],
      fileDate: recordToEdit.fileDate || '',
    });
    
    // Set analysis if available
    if (recordToEdit.analysis) {
      setAnalysis(recordToEdit.analysis);
    }
    
    // Set returned image URL if available
    if (recordToEdit.returnedImageUrl) {
      setReturnedImageUrl(recordToEdit.returnedImageUrl);
    }
    
    return recordToEdit;
  };
  
  // Update an existing record
  const updateRecord = () => {
    if (!newRecord.id) {
      console.error('Cannot update record: No record ID provided');
      return false;
    }
    
    if (!newRecord.title) {
      alert('Please provide a title for this record.');
      return false;
    }
    
    if (!newRecord.fileDate) {
      alert('Please provide a date for this record.');
      return false;
    }
    
    if (newRecord.files.length === 0) {
      alert('Please upload at least one file.');
      return false;
    }
    
    if (!analysis) {
      alert('Please analyze the files before saving.');
      return false;
    }
    
    if (isAnalyzing || isLoading || isLoadingGemma) {
      alert('Please wait for analysis to complete.');
      return false;
    }
    
    // Find index of record to update
    const recordIndex = medicalRecords.findIndex(record => record.id === newRecord.id);
    if (recordIndex === -1) {
      console.error('Record not found for update');
      return false;
    }
    
    // Create updated record object
    const updatedRecord = {
      ...medicalRecords[recordIndex],
      category: newRecord.category || "General",
      fileDate: newRecord.fileDate,
      title: newRecord.title,
      notes: newRecord.notes || "",
      files: newRecord.files.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        size: f.size,
        url: f.url
      })),
      analysis: analysis,
      ...(returnedImageUrl && { returnedImageUrl: returnedImageUrl })
    };
    
    // Update the records array
    const updatedRecords = [...medicalRecords];
    updatedRecords[recordIndex] = updatedRecord;
    setMedicalRecords(updatedRecords);
    
    // Update localStorage
    try {
      localStorage.setItem('medicalRecords', JSON.stringify(updatedRecords));
      
      // Update PatientRecordsContext
      updatePatientRecord({
        id: updatedRecord.id,
        type: updatedRecord.category.toLowerCase().replace(/\s+/g, '_') || 'general',
        title: updatedRecord.title,
        date: updatedRecord.fileDate || updatedRecord.createdDate,
        content: updatedRecord.analysis || updatedRecord.notes || '',
      });
    } catch (e) {
      console.error('Error saving to localStorage:', e);
      alert('Error updating record. The file(s) might be too large for local storage.');
      return false;
    }
    
    return true;
  };
  
  return {
    medicalRecords,
    expandedRecords,
    newRecord,
    setNewRecord,
    analysis,
    setAnalysis,
    returnedImageUrl,
    setReturnedImageUrl,
    isAnalyzing,
    setIsAnalyzing,
    analysisProgress,
    addFilesToState,
    removeFile,
    analyzeAndPopulate,
    resetAndCloseModal,
    saveRecord,
    getFilteredRecords,
    toggleExpand,
    deleteRecord,
    prepareRecordForEdit,
    updateRecord,
  };
};

// Helper function to get file icon based on file type
export const getFileIcon = (type, { ImageIcon, FileAudio, FileText }) => {
  if (type.startsWith('image')) return <ImageIcon className="w-8 h-8 text-blue-500" />;
  if (type.startsWith('audio')) return <FileAudio className="w-8 h-8 text-purple-500" />;
  return <FileText className="w-8 h-8 text-gray-500" />;
};