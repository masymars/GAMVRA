import React, { useRef } from 'react';
import { FileText, ImageIcon, FileAudio, X, Upload, Save, Loader, Bot, Eye, Camera, Scan, BrainCircuit } from 'lucide-react';

/*
  NOTE: To enable the custom scrollbar styles (like `scrollbar-thin`), 
  you need to either:
  1. Install the `tailwind-scrollbar` plugin:
     `npm install -D tailwind-scrollbar`
     And add it to your `tailwind.config.js`:
     `plugins: [require('tailwind-scrollbar')],`

  2. Or, add the following CSS to your global stylesheet (e.g., `globals.css`):
     @layer utilities {
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: #a3a3a3 #f1f5f9;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background-color: #f1f5f9;
          border-radius: 100vh;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: #a3a3a3;
          border-radius: 100vh;
          border: 2px solid #f1f5f9;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
            background-color: #737373;
        }
     }
*/


const AddRecordModal = ({
  showModal,
  onClose,
  newRecord,
  setNewRecord,
  analysis,
  setAnalysis,
  returnedImageUrl,
  setReturnedImageUrl,
  isAnalyzing,
  setIsAnalyzing,
  showWebcam,
  setShowWebcam,
  isLoading,
  onSaveRecord,
  onAnalyzeAndPopulate,
  onStartWebcam,
  onStopWebcam,
  onHandleCapture,
  videoRef,
  addFilesToState,
  removeFile,
  getFileIcon,
  analysisMode,
  setAnalysisMode
}) => {
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    addFilesToState(files);
  };

  if (!showModal) return null;

  return (
    <>
      {/* Webcam Modal */}
      {showWebcam && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-4 shadow-xl w-full max-w-2xl">
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-md bg-gray-900"></video>
            <div className="mt-4 flex justify-center space-x-4">
              <button onClick={onHandleCapture} className="px-8 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors">Capture Photo</button>
              <button onClick={onStopWebcam} className="px-8 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal */}
      <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-black/60 to-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
        {/* MODAL CONTAINER: Changed to a flex column to manage sticky header/footer */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 max-w-3xl w-full max-h-[90vh] flex flex-col transform transition-all duration-300 scale-100 relative">
          
          {/* STICKY CLOSE BUTTON: Stays visible on scroll. Increased z-index. */}
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-20" title="Close modal">
            <X className="w-6 h-6" />
          </button>
          
          {/* MODAL HEADER: Non-scrolling */}
          <div className="flex-shrink-0 mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Add New Medical Record</h2>
            <p className="text-gray-600 mt-2">Upload your medical files and let AI analyze them for you</p>
          </div>

          {/* SCROLLABLE CONTENT AREA: This div now handles all scrolling */}
          <div className="flex-1 overflow-y-auto pr-2 -mr-6 scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 scrollbar-track-gray-100 scrollbar-thumb-rounded-full">
            <div className="space-y-4 pr-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Files*</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 border-2 border-dashed border-teal-300 rounded-lg p-6 text-center hover:bg-teal-50 cursor-pointer transition-colors group" onClick={() => fileInputRef.current?.click()}>
                    <div className="flex flex-col items-center justify-center h-full">
                      <Upload className="w-10 h-10 text-teal-400 group-hover:text-teal-600 transition-colors mb-3" />
                      <p className="text-sm text-gray-600 font-medium">Click to upload</p>
                      <p className="text-xs text-gray-500">or drag & drop</p>
                    </div>
                    <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" />
                  </div>
                  <button type="button" onClick={onStartWebcam} className="sm:w-36 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer transition-colors group">
                    <Camera className="w-10 h-10 text-gray-400 group-hover:text-gray-600 transition-colors mb-3" />
                    <p className="text-sm text-gray-600 font-medium">Webcam</p>
                  </button>
                </div>
              </div>

              {newRecord.files.length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-teal-600" />
                        Uploaded Files ({newRecord.files.length})
                      </h3>
                      
                      {/* Analysis Mode Selection */}
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                        <div className="flex items-center space-x-1">
                          <p className="text-xs text-gray-600 font-medium">Analysis Mode:</p>
                          <div className="flex bg-gray-100 rounded-md p-1">
                            <button
                              onClick={() => setAnalysisMode('ocr')}
                              className={`flex items-center text-xs px-2 py-1 rounded ${
                                analysisMode === 'ocr' 
                                  ? 'bg-teal-600 text-white' 
                                  : 'text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <Scan className="w-3 h-3 mr-1" />
                              OCR
                            </button>
                            <button
                              onClick={() => setAnalysisMode('vision')}
                              className={`flex items-center text-xs px-2 py-1 rounded ${
                                analysisMode === 'vision' 
                                  ? 'bg-teal-600 text-white' 
                                  : 'text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <BrainCircuit className="w-3 h-3 mr-1" />
                              Vision
                            </button>
                          </div>
                        </div>
                        
                        <button
                            onClick={onAnalyzeAndPopulate}
                            disabled={isAnalyzing || isLoading}
                            className="flex items-center space-x-2 px-3 py-1.5 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            {isAnalyzing || isLoading ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <Bot className="w-4 h-4" />
                            )}
                            <span>
                              {isAnalyzing || isLoading 
                                ? 'Analyzing...' 
                                : `Analyze with ${analysisMode === 'ocr' ? 'OCR' : 'Vision AI'}`
                              }
                            </span>
                        </button>
                      </div>
                  </div>
                  
                  {/* Analysis Mode Description */}
                  <div className="mb-3 text-xs text-gray-600 bg-gray-50 p-2 rounded-md">
                    {analysisMode === 'ocr' ? (
                      <p className="flex items-center">
                        <Scan className="w-3 h-3 mr-1 text-teal-600" />
                        <span>
                          <strong>OCR Mode:</strong> Best for documents with text like lab reports, prescriptions, or medical notes.
                        </span>
                      </p>
                    ) : (
                      <p className="flex items-center">
                        <BrainCircuit className="w-3 h-3 mr-1 text-teal-600" />
                        <span>
                          <strong>Vision Mode:</strong> Best for images like X-rays, skin conditions, wounds, or visual medical data.
                        </span>
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                    {newRecord.files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 border rounded-lg hover:bg-gray-100">
                        <div className="flex items-center min-w-0">
                          {file.type.startsWith('image') ? (
                            <img src={file.url} alt={file.name} className="flex-shrink-0 w-10 h-10 rounded object-cover mr-3 border" />
                          ) : (
                            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-200 rounded mr-3">
                              {getFileIcon(file.type)}
                            </div>
                          )}
                          <div className="truncate">
                            <span className="text-sm font-medium text-gray-700 block truncate">{file.name}</span>
                            <span className="text-xs text-gray-500">{file.size}</span>
                          </div>
                        </div>
                        <button onClick={() => removeFile(file.id)} className="ml-4 flex-shrink-0 p-1 hover:bg-red-100 rounded-full" title="Remove file">
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {returnedImageUrl && (
                <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-green-700 flex items-center">
                      <ImageIcon className="w-4 h-4 mr-2 text-green-600" />
                      AI Processed Image
                    </h3>
                    <a 
                      href={returnedImageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center text-green-600 hover:text-green-800 text-sm"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Full Size
                    </a>
                  </div>
                  <img 
                    src={returnedImageUrl} 
                    alt="AI Processed Medical Image"
                    className="max-w-full h-auto rounded border border-green-300 shadow-sm"
                    style={{ maxHeight: '200px' }}
                  />
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-6 mt-6 space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Record Details (AI Assisted with {analysisMode === 'ocr' ? 'OCR' : 'Vision'})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Record Title*</label>
                      <input 
                        type="text" 
                        value={newRecord.title} 
                        onChange={(e) => setNewRecord({...newRecord, title: e.target.value})} 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors bg-white text-gray-900" 
                        placeholder="e.g., Annual Check-up Results 2024" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Record Date*</label>
                      <input 
                        type="date" 
                        value={newRecord.fileDate} 
                        onChange={(e) => setNewRecord({...newRecord, fileDate: e.target.value})} 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors bg-white text-gray-900" 
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select 
                      value={newRecord.category} 
                      onChange={(e) => setNewRecord({...newRecord, category: e.target.value})} 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors bg-white text-gray-900"
                    >
                      <option value="">Select a category</option>
                      <option value="General">General</option>
                      <option value="Radiology">Radiology</option>
                      <option value="Blood Work">Blood Work</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="Skin Imaging">Skin Imaging</option>
                      <option value="Mole & Lesion Analysis">Mole & Lesion Analysis</option>
                      <option value="Wound Assessment">Wound Assessment</option>
                      <option value="Rash & Skin Condition">Rash & Skin Condition</option>
                      <option value="Body Part Examination">Body Part Examination</option>
                      <option value="Joint & Limb Analysis">Joint & Limb Analysis</option>
                      <option value="Posture Assessment">Posture Assessment</option>
                      <option value="X-Ray Analysis">X-Ray Analysis</option>
                      <option value="MRI/CT Scan">MRI/CT Scan</option>
                      <option value="Ultrasound Imaging">Ultrasound Imaging</option>
                      <option value="Endocrinology">Endocrinology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Physical Therapy">Physical Therapy</option>
                      <option value="Prescription">Prescription</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Summary</label>
                    <textarea 
                      value={newRecord.notes} 
                      onChange={(e) => setNewRecord({...newRecord, notes: e.target.value})} 
                      className="w-full p-3 border border-gray-300 rounded-lg h-24 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors resize-none bg-white text-gray-900"
                      placeholder="Brief summary or additional notes..."
                    ></textarea>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Detailed AI Analysis</label>
                      <div className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg text-sm text-gray-700 whitespace-pre-line border border-teal-100 min-h-[120px] shadow-sm">
                          {isAnalyzing ? (
                            <div className="flex items-center space-x-2">
                              <Loader className="w-4 h-4 animate-spin text-teal-600" />
                              <span className="text-teal-600">
                                Generating analysis with {analysisMode === 'ocr' ? 'OCR' : 'Vision AI'}...
                              </span>
                            </div>
                          ) : analysis || (
                            <span className="text-gray-500 italic">
                              Analysis will appear here after you upload files and click 'Analyze with {analysisMode === 'ocr' ? 'OCR' : 'Vision AI'}'.
                            </span>
                          )}
                      </div>
                  </div>
              </div>
            </div>
          </div>

          {/* MODAL FOOTER: Non-scrolling */}
          <div className="flex-shrink-0 flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
            <button onClick={onClose} className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700">
              Cancel
            </button>
            <button 
              onClick={onSaveRecord} 
              disabled={!newRecord.title || !newRecord.fileDate || isAnalyzing || isLoading} 
              className="px-6 py-2.5 bg-teal-600 text-white rounded-lg disabled:opacity-50 hover:bg-teal-700 transition-colors font-medium shadow-sm flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Record
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddRecordModal;