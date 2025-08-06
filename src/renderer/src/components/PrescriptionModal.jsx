import React, { useState, useRef } from 'react';
import { X, Save, Camera, Upload, RotateCcw, Loader, Pill, Clock } from 'lucide-react';
import { useGemma } from '../api/gemma';

const PrescriptionModal = ({ 
  isOpen, 
  onClose, 
  prescription, 
  setPrescription, 
  onSave, 
  isEdit,
  scanPrescriptionImage,
  isAnalyzing,
  setIsAnalyzing,
  ocrProgress = 0
}) => {
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  
  // Get the Gemma hook functions directly - specifically using generateOCRResponse
  const { 
    generateOCRResponse, 
    isLoading: isLoadingGemma,
    progress: gemmaProgress
  } = useGemma();

  // Calculate total progress combining OCR and Gemma analysis
  const totalProgress = ocrProgress > 0 ? Math.min(ocrProgress, 100) : 
    (isAnalyzing && !isLoadingGemma ? 100 : gemmaProgress || 0);

  // Time slots for medication (24-hour format)
  const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', 
    '20:00', '21:00', '22:00', '23:00', '00:00'
  ];

  const colorOptions = [
    { value: '#4fd1c5', name: 'Teal', bg: 'bg-teal-400' },
    { value: '#38b2ac', name: 'Green', bg: 'bg-green-500' },
    { value: '#4299e1', name: 'Blue', bg: 'bg-blue-500' },
    { value: '#667eea', name: 'Indigo', bg: 'bg-indigo-500' },
    { value: '#9f7aea', name: 'Purple', bg: 'bg-purple-500' },
    { value: '#ed64a6', name: 'Pink', bg: 'bg-pink-500' },
    { value: '#f56565', name: 'Red', bg: 'bg-red-500' },
    { value: '#ed8936', name: 'Orange', bg: 'bg-orange-500' },
    { value: '#ecc94b', name: 'Yellow', bg: 'bg-yellow-500' }
  ];
  
  // Handle toggling a time slot for medication
  const handleToggleTimeSlot = (time) => {
    setPrescription(prev => {
      if (prev.timeSlots.includes(time)) {
        return {
          ...prev,
          timeSlots: prev.timeSlots.filter(t => t !== time)
        };
      } else {
        return {
          ...prev,
          timeSlots: [...prev.timeSlots, time].sort()
        };
      }
    });
  };

  // Handle image upload from file picker
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check if file is a valid PNG or JPG
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a PNG or JPG image only.');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      console.log('File selected:', file.name, file.type, file.size, 'bytes');
      
      // Create a preview for the UI
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        // Process the image with OCR then LLM
        processImageWithOCR(file);
      };
      reader.readAsDataURL(file);
    }
  };

  // State to manage camera stream and video display
  const [cameraStream, setCameraStream] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);

  // Handle camera activation
  const handleCameraCapture = async () => {
    try {
      // Only try to access camera if not already showing
      if (!showCamera) {
        console.log('Attempting to access camera...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',  // Prefer back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        console.log('Camera access successful, stream tracks:', stream.getTracks().length);
        setCameraStream(stream);
        setShowCamera(true);
        
        // Give a moment for the UI to update before setting srcObject
        setTimeout(() => {
          if (videoRef.current) {
            console.log('Setting video srcObject directly');
            videoRef.current.srcObject = stream;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check permissions or try uploading a PNG or JPG image instead.');
    }
  };

  // Capture the current frame from video
  const captureFrame = () => {
    if (videoRef.current && cameraStream) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Get the data URL for preview
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setImagePreview(imageDataUrl);
      
      // Convert canvas to Blob for OCR processing
      canvas.toBlob((blob) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `camera-${timestamp}.jpg`, { type: 'image/jpeg' });
        console.log('Created camera capture File:', file.name, file.type, file.size, 'bytes');
        processImageWithOCR(file);
      }, 'image/jpeg');
      
      // Stop and clean up camera stream
      stopCameraStream();
    }
  };
  
  // Stop the camera stream and reset state
  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setShowCamera(false);
    }
  };
  
  // Close camera view when modal is closed
  React.useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Process image with OCR and then LLM
  const processImageWithOCR = async (imageData) => {
    try {
      console.log('Starting OCR processing followed by LLM analysis...');
      console.log('Image data type:', imageData instanceof File ? 'File' : (imageData instanceof Blob ? 'Blob' : typeof imageData));
      
      // Add more detailed logging for debugging
      if (imageData instanceof File) {
        console.log(`File details: name=${imageData.name}, type=${imageData.type}, size=${imageData.size} bytes`);
      } else if (imageData instanceof Blob) {
        console.log(`Blob details: type=${imageData.type}, size=${imageData.size} bytes`);
      }
      
      // First check if we should use the direct Gemma's generateOCRResponse function
      if (generateOCRResponse && typeof generateOCRResponse === 'function') {
        console.log('Using Gemma generateOCRResponse for prescription analysis');
        // Show analyzing state
        setIsAnalyzing(true);
        
        // Call Gemma's generateOCRResponse with the image
        const result = await generateOCRResponse(imageData ,  `
          Analyze this medication image and extract ONLY the following information in JSON format:
          - medication name
          - dosage
          
          Return a JSON object with a "medication" field containing ONLY these attributes.
          Example format:
          {
            "medication": {
              "name": "Medication name",
              "dosage": "Dosage information"
            }
          }
        `);
        console.log('Gemma OCR analysis result:', result);
        
        // Update the prescription data with the extracted information
        updatePrescriptionFromOCR(result);
        
      } else if (scanPrescriptionImage && typeof scanPrescriptionImage === 'function') {
        // Fall back to the provided scanPrescriptionImage function
        console.log('Using provided scanPrescriptionImage function');
        // Show analyzing state
        setIsAnalyzing(true);
        
        // Send the image for OCR and then LLM processing
        const result = await scanPrescriptionImage(imageData);
        console.log('Analysis result received:', result);
        
        // Update the prescription data with the extracted information
        updatePrescriptionFromOCR(result);
      } else {
        throw new Error('No OCR function available. Please try again later or enter details manually.');
      }
    } catch (error) {
      console.error('Error analyzing medication image:', error);
      
      // Try to give a more specific error message based on the error
      let errorMessage = 'Failed to extract information from the image. Please try again or enter details manually.';
      
      if (error.message && error.message.includes('function is not available')) {
        errorMessage = 'The AI service is not currently available. Please enter details manually.';
      } else if (error.message && error.message.includes('model is not ready')) {
        errorMessage = 'The AI model is still loading. Please try again in a few moments.';
      } else if (error.message && error.message.includes('OCR could not extract')) {
        errorMessage = 'Text recognition failed. Please try a clearer image or enter details manually.';
      } else if (error.message && error.message.includes('NetworkError')) {
        errorMessage = 'Network error occurred. Please check your connection and try again.';
      }
      
      alert(errorMessage);
      
      // Still populate some fields to allow manual entry as a fallback
      setPrescription(prev => ({
        ...prev,
        // Keep existing values, only provide defaults for empty fields
        name: prev.name || '',
        dosage: prev.dosage || '',
        frequency: prev.frequency || 'daily',
        startDate: prev.startDate || new Date().toISOString().split('T')[0],
      }));
    } finally {
      // Always reset the analyzing state, whether successful or not
      setIsAnalyzing(false);
    }
  };

  // Helper function to update prescription state from OCR results
// Helper function to update prescription state from OCR results
const updatePrescriptionFromOCR = (result) => {
  let medicationData = null;
  
  // Try to parse the medication data from the response
  try {
    // Check if the result contains llmResponse (Gemma format)
    if (result && result.llmResponse) {
      // Extract JSON from the markdown code block
      const jsonString = result.llmResponse.replace(/```json\n|\n```/g, '');
      const parsedData = JSON.parse(jsonString);
      
      if (parsedData && parsedData.medication) {
        medicationData = parsedData.medication;
        console.log('Extracted medication data from llmResponse:', medicationData);
      }
    } 
    // Check for direct medication object (previous format)
    else if (result && result.medication) {
      medicationData = result.medication;
      console.log('Extracted medication data directly:', medicationData);
    }
    else {
      console.warn('Could not find medication data in the response:', result);
      throw new Error('Unexpected response format');
    }
    
    // Update prescription data with extracted information
    if (medicationData) {
      setPrescription(prev => {
        // Get today's date in YYYY-MM-DD format for default start date
        const todayFormatted = new Date().toISOString().split('T')[0];
        
        return {
          ...prev,
          name: medicationData.name || prev.name,
          dosage: medicationData.dosage || prev.dosage,
          frequency: medicationData.recommendedFrequency || prev.frequency || 'daily',
          startDate: medicationData.startDate || prev.startDate || todayFormatted,
          notes: prev.notes || medicationData.instructions || '',
          // Include any additional fields that might be returned
          prescriber: medicationData.prescriber || prev.prescriber || ''
        };
      });
      
      // If time slots can be inferred from the frequency, set them
      if (medicationData.recommendedFrequency) {
        const frequency = medicationData.recommendedFrequency.toLowerCase();
        let suggestedTimeSlots = [];
        
        // Check for numbers and common patterns in various languages
        if (frequency.includes('1') || 
            frequency.includes('once') || 
            frequency.includes('daily') || 
            frequency.includes('день') || 
            frequency.includes('раз в день') && !frequency.includes('2') && !frequency.includes('3') && !frequency.includes('4')) {
          suggestedTimeSlots = ['09:00']; // Morning - once a day
        } else if (frequency.includes('2') || 
                  frequency.includes('twice') || 
                  frequency.includes('two times') || 
                  frequency.includes('два раза') || 
                  frequency.includes('дважды') || 
                  frequency.includes('1-2')) {
          suggestedTimeSlots = ['09:00', '18:00']; // Morning and evening - twice a day
        } else if (frequency.includes('3') || 
                  frequency.includes('three times') || 
                  frequency.includes('три раза')) {
          suggestedTimeSlots = ['09:00', '13:00', '18:00']; // Morning, noon, evening - three times a day
        } else if (frequency.includes('4') || 
                  frequency.includes('four times') || 
                  frequency.includes('четыре раза')) {
          suggestedTimeSlots = ['09:00', '13:00', '18:00', '22:00']; // Four times throughout the day
        } else {
          // Default to once a day if we can't determine the frequency
          suggestedTimeSlots = ['09:00'];
        }
        
        if (suggestedTimeSlots.length > 0) {
          setPrescription(prev => ({
            ...prev,
            timeSlots: suggestedTimeSlots
          }));
        }
      } else if (medicationData.dosage && medicationData.dosage.toLowerCase().includes('capsule per day')) {
        // If dosage mentions "capsule per day", suggest a morning time slot
        setPrescription(prev => ({
          ...prev,
          timeSlots: ['09:00']
        }));
      }
    }
  } catch (error) {
    console.error('Error processing OCR result:', error);
    alert('The image analysis returned incomplete data. Please check and fill in any missing details.');
  }
};

  // Reset image and extracted data
  const handleResetImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    stopCameraStream(); // Make sure camera is stopped when image is reset
  };

  // Close everything if modal is closed
  React.useEffect(() => {
    if (!isOpen) {
      handleResetImage();
    }
  }, [isOpen]);

  // Initialize video element when camera stream is available
  React.useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      // Make sure to handle errors in play() since it returns a promise
      videoRef.current.play()
        .then(() => console.log("Camera video playback started"))
        .catch(err => {
          console.error("Error playing video:", err);
          // Try to recover by setting srcObject again
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.srcObject = cameraStream;
            }
          }, 100);
        });
    }
  }, [cameraStream, showCamera]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-black/60 to-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      {/* MODAL CONTAINER: Changed to a flex column to manage sticky header/footer */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 max-w-2xl w-full max-h-[90vh] flex flex-col transform transition-all duration-300 scale-100 relative">
        
        {/* STICKY CLOSE BUTTON: Stays visible on scroll. Increased z-index. */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-20" title="Close modal">
          <X className="w-6 h-6" />
        </button>
        
        {/* MODAL HEADER: Non-scrolling */}
        <div className="flex-shrink-0 mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            {isEdit ? 'Edit Prescription' : 'Add New Prescription'}
          </h2>
          <p className="text-gray-600 mt-2">Upload medication label for OCR and AI analysis</p>
        </div>

        {/* SCROLLABLE CONTENT AREA: This div now handles all scrolling */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-6 scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 scrollbar-track-gray-100 scrollbar-thumb-rounded-full">
          <div className="space-y-4 pr-4">
            
            {/* OCR and AI Scan Section */}
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OCR and AI Scan Medication Label
              </label>
              <div className="flex flex-col space-y-3">
                {imagePreview ? (
                  <div className="relative bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-4">
                    <img 
                      src={imagePreview} 
                      alt="Medication label preview" 
                      className="w-full h-48 object-contain border rounded-lg"
                    />
                    <button
                      onClick={handleResetImage}
                      className="absolute top-6 right-6 bg-white p-2 rounded-full shadow-md hover:bg-gray-100 border"
                      aria-label="Reset image"
                    >
                      <RotateCcw className="w-4 h-4 text-gray-700" />
                    </button>
                    
                    {isAnalyzing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-lg">
                        <div className="text-center text-white bg-black/50 p-4 rounded-lg shadow-lg w-5/6 max-w-xs">
                          <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
                          <p className="text-sm font-medium">
                            {totalProgress > 0 
                              ? `Processing: ${Math.round(totalProgress)}%` 
                              : 'Analyzing image...'}
                          </p>
                          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                            <div 
                              className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                              style={{width: `${totalProgress}%`}}
                            ></div>
                          </div>
                          <p className="text-xs mt-2">
                            {isLoadingGemma 
                              ? 'AI analyzing extracted text...' 
                              : 'First extracting text with OCR, then analyzing with AI'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : showCamera ? (
                  <div className="relative bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-col">
                      {/* Camera feed with loading state */}
                      <div className="relative">
                        <video 
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-48 object-cover border rounded-lg bg-black"
                        />
                        {!cameraStream && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                            <div className="text-white flex items-center">
                              <Loader className="w-5 h-5 mr-2 animate-spin" />
                              <span>Initializing camera...</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Camera controls */}
                      <div className="mt-4 flex justify-center space-x-4">
                        <button
                          onClick={captureFrame}
                          className="px-4 py-2 bg-teal-600 text-white rounded-full flex items-center shadow-md hover:bg-teal-700 transition-colors"
                        >
                          <Camera className="w-5 h-5 mr-2" />
                          Capture Photo
                        </button>
                        <button
                          onClick={stopCameraStream}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full flex items-center shadow-md hover:bg-gray-300 transition-colors"
                        >
                          <X className="w-5 h-5 mr-2" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 border-2 border-dashed border-teal-300 rounded-lg p-6 text-center hover:bg-teal-50 cursor-pointer transition-colors group" onClick={() => fileInputRef.current?.click()}>
                      <div className="flex flex-col items-center justify-center h-full">
                        <Upload className="w-10 h-10 text-teal-400 group-hover:text-teal-600 transition-colors mb-3" />
                        <p className="text-sm text-gray-600 font-medium">Click to upload</p>
                        <p className="text-xs text-gray-500">PNG or JPG only</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                    <button
                      onClick={handleCameraCapture}
                      className="sm:w-36 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      <Camera className="w-10 h-10 text-gray-400 group-hover:text-gray-600 transition-colors mb-3" />
                      <p className="text-sm text-gray-600 font-medium">Take Photo</p>
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-500 italic">
                  {generateOCRResponse 
                    ? "Using specialized OCR with Gemma AI for prescription analysis" 
                    : "Upload an image for offline OCR text extraction followed by AI analysis"}
                </p>
              </div>
            </div>

            {/* Form Section */}
            <div className="border-t border-gray-200 pt-6 mt-6 space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center">
                  <Pill className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Prescription Details (OCR+AI Assisted)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medication Name*
                  </label>
                  <input
                    type="text"
                    value={prescription.name}
                    onChange={e => setPrescription({...prescription, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors bg-white text-gray-900"
                    placeholder="Enter medication name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dosage*
                  </label>
                  <input
                    type="text"
                    value={prescription.dosage}
                    onChange={e => setPrescription({...prescription, dosage: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors bg-white text-gray-900"
                    placeholder="e.g., 10mg, 1 tablet, etc."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <select
                  value={prescription.frequency}
                  onChange={e => setPrescription({...prescription, frequency: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors bg-white text-gray-900"
                >
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays only</option>
                  <option value="weekends">Weekends only</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date*
                  </label>
                  <input
                    type="date"
                    value={prescription.startDate}
                    onChange={e => setPrescription({...prescription, startDate: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors bg-white text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={prescription.endDate}
                    onChange={e => setPrescription({...prescription, endDate: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors bg-white text-gray-900"
                  />
                </div>
              </div>
              
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 mr-2 text-teal-600" />
                  Select Time Slots
                </label>
                <div className="grid grid-cols-4 gap-2 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg border border-teal-100">
                  {timeSlots.map(time => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => handleToggleTimeSlot(time)}
                      className={`p-2 rounded text-xs font-medium border ${
                        prescription.timeSlots.includes(time)
                          ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                          : 'border-gray-300 hover:bg-white hover:shadow-sm text-gray-800 bg-white/80'
                      } transition-all`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Tag
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setPrescription({...prescription, color: color.value})}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all ${
                        prescription.color === color.value
                          ? 'border-gray-400 bg-gray-50 shadow-sm'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${color.bg}`}></div>
                      <span className="text-sm font-medium text-gray-700">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={prescription.notes}
                  onChange={e => setPrescription({...prescription, notes: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors resize-none bg-white text-gray-900"
                  rows="3"
                  placeholder="Additional information, instructions, etc."
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER: Non-scrolling */}
        <div className="flex-shrink-0 flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={isAnalyzing ? () => alert('Please wait for image processing to complete') : onSave}
            className={`px-6 py-2.5 ${isAnalyzing ? 'bg-gray-400' : 'bg-teal-600 hover:bg-teal-700'} text-white rounded-lg transition-colors font-medium shadow-sm flex items-center`}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                {totalProgress > 0 ? `Processing: ${Math.round(totalProgress)}%` : 'Analyzing...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEdit ? 'Update Prescription' : 'Save Prescription'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionModal;