import React, { useState, useEffect, useCallback } from 'react';
import { X, HeartPulse, CheckCircle, AlertCircle } from 'lucide-react';

// API Base URL for health checks
const API_BASE_URL = 'http://localhost:3010';

/**
 * LoadingModal - Optimized component that loads model directly without connection phase
 * Faster polling and quicker response to ready state
 */
const LoadingModal = ({
  isLoading,
  loadingStatus: initialLoadingStatus,
  initMessage: initialMessage,
  delayBeforeHide = 800 // Reduced from 2000ms to 800ms
}) => {
  const [progressPercent, setProgressPercent] = useState(20); // Start higher
  const [showModal, setShowModal] = useState(isLoading);
  const [currentStep, setCurrentStep] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('loading'); // Start directly with loading
  const [statusMessage, setStatusMessage] = useState('Loading medical AI model...');
  const [isPolling, setIsPolling] = useState(true);
  const [consecutiveReadyCount, setConsecutiveReadyCount] = useState(0);

  // Simplified loading steps - removed initializing step
  const loadingSteps = [
    { status: 'loading', label: 'Loading Medical AI', icon: HeartPulse },
    { status: 'finalizing', label: 'Almost Ready', icon: HeartPulse },
    { status: 'ready', label: 'Ready to Assist', icon: CheckCircle }
  ];

  // Faster health polling with immediate ready detection
  const pollServerHealth = useCallback(async () => {
    if (!isPolling) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Check if model is ready - more aggressive ready detection
        const isModelReady = (data.status === 'ready' || data.status === 'ok') && 
                            (data.modelLoaded === true || data.model_loaded === true);
        
        if (isModelReady) {
          setConsecutiveReadyCount(prev => prev + 1);
          
          // Close modal immediately after first ready confirmation
          if (consecutiveReadyCount >= 0) { // Changed from >= 1 to >= 0
            console.log('✅ Model ready, closing modal immediately');
            setLoadingStatus('ready');
            setStatusMessage('AI Ready!');
            setProgressPercent(100);
            setIsPolling(false);
            
            // Much faster hide delay
            setTimeout(() => {
              setShowModal(false);
            }, delayBeforeHide);
            return;
          }
        } else {
          setConsecutiveReadyCount(0);
          
          // Update status based on progress or default to loading
          if (data.progress && data.progress > 50) {
            setLoadingStatus('finalizing');
            setProgressPercent(Math.max(progressPercent, data.progress));
          } else {
            setLoadingStatus('loading');
            if (data.progress) {
              setProgressPercent(Math.max(20, data.progress));
            }
          }
          
          setStatusMessage(data.message || 'Loading medical AI model...');
        }
      }
    } catch (error) {
      console.error('Health check failed:', error);
      // Don't show error messages during normal loading
      setStatusMessage('Loading medical AI model...');
    }
  }, [delayBeforeHide, isPolling, consecutiveReadyCount, progressPercent]);

  // Faster polling interval - check every 1 second instead of 2
  useEffect(() => {
    let intervalId;
    
    if (showModal && isPolling) {
      // Run immediately
      pollServerHealth();
      
      // Then poll every 1 second for faster response
      intervalId = setInterval(pollServerHealth, 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [showModal, isPolling, pollServerHealth]);

  // Start modal immediately in loading state
  useEffect(() => {
    if (isLoading) {
      setShowModal(true);
      setProgressPercent(20); // Start with some progress
      setLoadingStatus('loading'); // Skip initializing
      setCurrentStep(0);
      setIsPolling(true);
      setConsecutiveReadyCount(0);
    }
  }, [isLoading]);
  
  // Reduced maximum wait time to 15 seconds
  useEffect(() => {
    if (showModal) {
      const maxWaitTimer = setTimeout(() => {
        console.log('Maximum wait time reached, auto-closing modal');
        setLoadingStatus('ready');
        setProgressPercent(100);
        setIsPolling(false);
        setTimeout(() => setShowModal(false), 500);
      }, 15000); // Reduced from 30s to 15s
      
      return () => clearTimeout(maxWaitTimer);
    }
  }, [showModal]);

  // Update current step based on loading status
  useEffect(() => {
    const stepIndex = loadingSteps.findIndex(step => step.status === loadingStatus);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex);
    }
  }, [loadingStatus]);

  // Faster progress animation
  useEffect(() => {
    if (showModal && loadingStatus !== 'ready' && progressPercent < 90) {
      const intervalId = setInterval(() => {
        setProgressPercent(prev => {
          let target = 40; // Default target
          
          switch (loadingStatus) {
            case 'loading':
              target = 70;
              break;
            case 'finalizing':
              target = 85;
              break;
            case 'ready':
              target = 100;
              break;
          }
          
          if (prev < target) {
            return Math.min(prev + 2, target); // Faster increment
          }
          return prev;
        });
      }, 50); // Faster animation interval

      return () => clearInterval(intervalId);
    }
  }, [showModal, loadingStatus, progressPercent]);

  if (!showModal) return null;

  const isError = loadingStatus === 'error';
  const isReady = loadingStatus === 'ready';

  const forceCloseModal = () => {
    setIsPolling(false);
    setShowModal(false);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-black/60 to-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 max-w-md w-full mx-4 transform transition-all duration-300 scale-100 relative">
        <button 
          onClick={forceCloseModal}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          title="Force close"
        >
          <X size={20} />
        </button>
        
        <div className="flex flex-col items-center text-center">
          {/* Icon Section */}
          <div className="relative mb-6">
            {isError ? (
              <div className="bg-red-50 rounded-full p-4 border-2 border-red-100">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
            ) : isReady ? (
              <div className="bg-emerald-50 rounded-full p-4 border-2 border-emerald-100 animate-pulse">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
              </div>
            ) : (
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-full p-4 border-2 border-teal-100 relative overflow-hidden">
                <HeartPulse className="w-12 h-12 text-teal-600 animate-pulse relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-teal-200/30 to-cyan-200/30 animate-pulse rounded-full"></div>
              </div>
            )}
            
            {/* Floating particles effect */}
            {!isError && !isReady && (
              <div className="absolute -inset-4">
                <div className="absolute top-0 left-1/2 w-2 h-2 bg-teal-400 rounded-full animate-ping opacity-75"></div>
                <div className="absolute bottom-0 right-1/4 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping opacity-50" style={{ animationDelay: '0.3s' }}></div>
                <div className="absolute top-1/2 left-0 w-1 h-1 bg-teal-300 rounded-full animate-ping opacity-60" style={{ animationDelay: '0.6s' }}></div>
              </div>
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-3">
            {isError ? 'Loading Error' : isReady ? 'AI Ready!' : 'GAMVRA'}
          </h2>

          {/* Status Message */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            {isError
              ? 'Unable to load the AI model.'
              : isReady
              ? 'Medical AI is ready to assist you!'
              : statusMessage}
          </p>

          {/* Progress Section */}
          {!isError && (
            <div className="w-full mb-6">
              {/* Progress Bar */}
              <div className="w-full bg-gray-100 rounded-full h-3 mb-4 overflow-hidden shadow-inner">
                <div
                  className="h-3 rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-teal-500 to-cyan-500 shadow-sm"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="w-full h-full bg-white/30 animate-pulse rounded-full"></div>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="flex justify-between items-center text-xs">
                {loadingSteps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index <= currentStep;
                  const isCurrent = index === currentStep;
                  
                  return (
                    <div key={step.status} className="flex flex-col items-center space-y-2 flex-1">
                      <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300
                        ${isActive 
                          ? isCurrent 
                            ? 'bg-teal-500 text-white scale-110 shadow-lg' 
                            : 'bg-teal-100 text-teal-600'
                          : 'bg-gray-100 text-gray-400'
                        }
                      `}>
                        <StepIcon className="w-3 h-3" />
                      </div>
                      <span className={`
                        text-center transition-colors duration-300 px-1
                        ${isActive ? 'text-teal-600 font-medium' : 'text-gray-400'}
                      `}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Status */}
          <div className="flex items-center justify-center space-x-3 text-sm">
            {isError ? (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">Loading failed</span>
              </div>
            ) : isReady ? (
              <div className="flex items-center space-x-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">System ready</span>
              </div>
            ) : (
              <div className="flex items-center space-x-3 text-teal-600 bg-teal-50 px-4 py-2 rounded-lg border border-teal-200">
                <div className="relative">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal-600 border-t-transparent"></div>
                </div>
                <span className="font-medium">
                  {loadingSteps[currentStep]?.label || 'Loading AI model...'}
                </span>
              </div>
            )}
          </div>

          {/* Percentage Display */}
          {!isError && (
            <div className="mt-4 text-xs text-gray-500 font-mono">
              {Math.round(progressPercent)}% complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingModal;