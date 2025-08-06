import React from 'react';
import { Brain, AlertCircle, CheckCircle, X, Loader } from 'lucide-react';

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

const AnalysisModal = ({ 
  isOpen, 
  onClose, 
  analysisResult, 
  isLoading 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-black/60 to-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 max-w-3xl w-full max-h-[90vh] flex flex-col transform transition-all duration-300 scale-100 relative">
        
        {/* STICKY CLOSE BUTTON */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-20" title="Close modal">
          <X className="w-6 h-6" />
        </button>
        
        {/* MODAL HEADER */}
        <div className="flex-shrink-0 mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent flex items-center">
            <Brain className="w-6 h-6 text-teal-600 mr-2" />
            {analysisResult?.title || "Prescription Analysis"}
          </h2>
          <p className="text-gray-600 mt-2">AI-powered analysis of your medication regimen</p>
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-6 scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 scrollbar-track-gray-100 scrollbar-thumb-rounded-full">
          <div className="space-y-4 pr-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
                <h2 className="text-xl font-medium text-gray-800">Analyzing prescriptions...</h2>
                <p className="text-gray-500 mt-2">
                  This may take a moment. We're checking for interactions, timing issues, and optimization opportunities.
                </p>
              </div>
            ) : (
              <>
                {/* Display Category */}
                {analysisResult?.category && (
                  <div className="inline-block px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium mb-4">
                    {analysisResult.category}
                  </div>
                )}
                
                {/* Overall Assessment */}
                {analysisResult?.overallAssessment && (
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                    <h3 className="font-medium text-teal-800 mb-2">Overall Assessment</h3>
                    <p className="text-gray-700">{analysisResult.overallAssessment}</p>
                  </div>
                )}

                {/* Issues */}
                {analysisResult?.issues && analysisResult.issues.length > 0 && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center mb-3">
                      <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
                      Potential Issues
                    </h3>
                    <div className="space-y-2">
                      {analysisResult.issues.map((issue, index) => (
                        <div key={index} className="border border-red-200 rounded-lg p-3 bg-red-50">
                          <div className="flex items-start">
                            <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-red-800">
                                {issue.type === 'interaction' ? 'Drug Interaction' : 
                                 issue.type === 'timing' ? 'Timing Issue' : 
                                 issue.type}
                                {issue.severity && ` (${issue.severity} severity)`}
                              </p>
                              <p className="text-gray-700 mt-1">{issue.description}</p>
                              {issue.items && issue.items.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {issue.items.map((med, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                                      {med}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {analysisResult?.recommendations && analysisResult.recommendations.length > 0 && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center mb-3">
                      <CheckCircle className="w-4 h-4 mr-2 text-teal-600" />
                      Recommendations
                    </h3>
                    <div className="space-y-2">
                      {analysisResult.recommendations.map((recommendation, index) => (
                        <div key={index} className="border border-teal-200 rounded-lg p-3 bg-teal-50">
                          <div className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-teal-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-teal-800">
                                {recommendation.type === 'timing' ? 'Timing Adjustment' : 
                                 recommendation.type === 'dosage' ? 'Dosage Adjustment' : 
                                 recommendation.type === 'alternative' ? 'Alternative Medication' : 
                                 recommendation.type}
                              </p>
                              <p className="text-gray-700 mt-1">{recommendation.recommendation}</p>
                              {recommendation.items && recommendation.items.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {recommendation.items.map((med, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-teal-100 text-teal-800 text-xs rounded-full">
                                      {med}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analysis content (only if provided and other fields are missing) */}
                {(!analysisResult?.overallAssessment && !analysisResult?.issues && !analysisResult?.recommendations) && (
                  <div className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg text-sm text-gray-700 whitespace-pre-line border border-teal-100 min-h-[120px] shadow-sm">
                    {analysisResult?.analysis || "No detailed analysis available."}
                  </div>
                )}
                
                {/* Show raw JSON response for debugging */}
                <div className="mt-4 border-t pt-4">
                  <details>
                    <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                      Show raw JSON response
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(analysisResult, null, 2)}
                    </pre>
                  </details>
                </div>
              </>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="flex-shrink-0 flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;