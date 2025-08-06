import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    Play, Square, Pause, Send, BotMessageSquare, User,
    Upload, Mic, MicOff, FileScan, FileText, FileAudio, Trash2,
    Volume2, VolumeX
} from 'lucide-react';

// --- CORE HOOKS FOR FUNCTIONALITY ---
import { useGemma } from '../api/gemma';
import { useConversationHandler } from '../api/conversationHandler';
import { useUserData } from '../api/userDataManagement';
import { MessageBubble } from '../components/MessageBubble'; // <-- Import the new component

// --- UI & ASSETS ---
import HeadImage from '../assets/head.png';
import ChestImage from '../assets/chest.png';
import ShouldersImage from '../assets/shoulders.png';
import SpineImage from '../assets/spine.png';

// --- CONSTANTS AND HELPERS ---
const FPS_LIMIT = 5;
const FRAME_INTERVAL = 1000 / FPS_LIMIT;
const EXAMINATION_TIME_PER_POINT = 15;

const BODY_PARTS = [
    {
        id: 'head', name: 'Head', image: HeadImage, active: true, endpoint: 'ws://localhost:3010',
        guidancePoints: [
            { id: 6, name: "Left Preauricular lymph node" }, { id: 7, name: "Right Preauricular lymph node" },
            { id: 8, name: "Left Submandibular lymph node" }, { id: 9, name: "Right Submandibular lymph node" },
            { id: 10, name: "Left Occipital lymph node" }, { id: 11, name: "Right Occipital lymph node" },
            { id: 12, name: "Left Superficial cervical lymph node" }, { id: 13, name: "Right Superficial cervical lymph node" },
        ]
    },
    {
        id: 'chest', name: 'Chest', image: ChestImage, active: true, endpoint: 'ws://localhost:3010',
        guidancePoints: [
            { id: 8, name: "Upper Left Quadrant" }, { id: 9, name: "Upper Right Quadrant" },
            { id: 10, name: "Lower Left Quadrant" }, { id: 11, name: "Lower Right Quadrant" },
            { id: 12, name: "Center Sternum Area" },
        ]
    },
    { id: 'shoulders', name: 'Shoulders', image: ShouldersImage, active: false, endpoint: null, guidancePoints: [] },
    { id: 'spine', name: 'Spine', image: SpineImage, active: false, endpoint: null, guidancePoints: [] },
];

const debounce = (func, wait) => {
  let timeout;
  const debounced = (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
  debounced.cancel = () => clearTimeout(timeout);
  return debounced;
};

// --- MultimodalInput Component Logic (Integrated) ---
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
    filesCleanupRef.current.forEach(url => { URL.revokeObjectURL(url); });
    filesCleanupRef.current.clear();
  }, []);

  useEffect(() => { return cleanupFiles; }, [cleanupFiles]);

  const addFileWithCleanup = useCallback((file) => {
    const url = URL.createObjectURL(file);
    filesCleanupRef.current.add(url);
    return { file, type: file.type.split('/')[0] || file.type, name: file.name, url, id: Math.random().toString(36).substr(2, 9) };
  }, []);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setUploadedFiles(prev => [...prev, ...files.map(addFileWithCleanup)]);
    if (fileInputRef.current) { fileInputRef.current.value = ''; }
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
    } catch (error) { console.error('Error accessing microphone:', error); }
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
      if (fileToRemove?.url) { URL.revokeObjectURL(fileToRemove.url); filesCleanupRef.current.delete(fileToRemove.url); }
      return prev.filter(f => f.id !== id);
    });
  };

  const removeAudio = () => { setAudioBlob(null); }

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
                  <button onClick={() => removeFile(file.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {audioBlob && (
                <div className="flex items-center space-x-2 bg-primary-100 rounded-full px-3 py-1.5 text-sm">
                  <FileAudio className="w-4 h-4 text-primary-700" />
                  <span className="text-primary-800">{audioBlob.name}</span>
                  <button onClick={removeAudio} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex items-start space-x-2">
          <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Enter symptoms, ask about a diagnosis, or attach medical files..." className="flex-1 p-3 border border-primary-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-primary-800" rows={3} disabled={isDisabled} onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isDisabled) { e.preventDefault(); handleSubmit(); } }} />
          <div className="flex flex-col space-y-1">
            <button onClick={handleSubmit} disabled={isDisabled || (!textInput.trim() && uploadedFiles.length === 0 && !audioBlob)} className="px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center h-full"><Send className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex justify-start space-x-2">
          <button onClick={() => fileInputRef.current?.click()} disabled={isDisabled} className="flex items-center space-x-2 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"><Upload className="w-4 h-4" /><span>Attach File</span></button>
          <button onClick={isRecording ? stopRecording : startRecording} disabled={isDisabled} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed ${isRecording ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'}`}>{isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}<span>{isRecording ? 'Stop' : 'Record'}</span></button>
          <p className="text-xs text-primary-500 self-center">Supports images, audio, and text.</p>
        </div>
      </div>
      <input ref={fileInputRef} type="file" multiple accept="image/*,audio/*,.txt,.pdf" onChange={handleFileUpload} className="hidden" />
    </div>
  );
};


// --- MAIN COMPONENT ---
function SessionPage() {
    // --- STATE MANAGEMENT ---
    const [mode, setMode] = useState('guidance');
    const [isGuidanceActive, setIsGuidanceActive] = useState(false);
    const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPart, setSelectedPart] = useState(null);
    const [guidanceLog, setGuidanceLog] = useState([]);
    const [countdown, setCountdown] = useState(EXAMINATION_TIME_PER_POINT);
    const [isPaused, setIsPaused] = useState(false);
    const [guidanceStepUI, setGuidanceStepUI] = useState(0);
    const [userInput, setUserInput] = useState('');
    const [isAwaitingUserInput, setIsAwaitingUserInput] = useState(false);
    const [isTtsEnabled, setIsTtsEnabled] = useState(true);
    const [isAdvancingStep, setIsAdvancingStep] = useState(false);

    // --- DATA & API HOOKS ---
    const [userData] = useUserData('userData', { name: "Guest", age: "", sex: "" });
    const {
      messages: gemmaMessages,
      setMessages: setGemmaMessages,
      generateResponse,
      isLoading: isGemmaLoading,
      waitingForResponse
    } = useGemma();
    const {
        currentConversationId,
        createNewConversation,
        autoSaveCurrentConversation,
        setCurrentConversationId
    } = useConversationHandler();

    // --- REFS ---
    const videoRef = useRef(null);
    const imageRef = useRef(null);
    const canvasRef = useRef(null);
    const socketRef = useRef(null);
    const guidanceIntervalRef = useRef(null);
    const frameRequestRef = useRef(null);
    const lastFrameTimeRef = useRef(0);
    const guidanceStepRef = useRef(0);
    const inputResolverRef = useRef(null);
    const inputRef = useRef(null);
    const chatScrollRef = useRef(null);
    const prevMessagesLengthRef = useRef(0);
    const sessionRunningRef = useRef(false);

    // --- AUTO-SAVING & SCROLLING FOR CHAT ---
    const debouncedAutoSave = useMemo(() => debounce((messages, id) => {
        if (messages.length > 0 && id) autoSaveCurrentConversation(messages);
    }, 500), [autoSaveCurrentConversation]);

    useEffect(() => {
        if (mode === 'chat') {
            debouncedAutoSave(gemmaMessages, currentConversationId);
            return () => debouncedAutoSave.cancel();
        }
    }, [gemmaMessages, currentConversationId, mode, debouncedAutoSave]);

    useEffect(() => {
        if (mode === 'chat' && chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [gemmaMessages, mode, isGemmaLoading]);

    // --- GUIDANCE & TTS CALLBACKS ---
    const speak = useCallback((text) => {
        return new Promise((resolve) => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.onend = resolve;
                utterance.onerror = (err) => { console.error("Speech error:", err); resolve(); };
                window.speechSynthesis.speak(utterance);
            } else { resolve(); }
        });
    }, []);

    useEffect(() => {
        if (mode === 'chat' && isTtsEnabled && gemmaMessages.length > prevMessagesLengthRef.current) {
            const lastMessage = gemmaMessages[gemmaMessages.length - 1];
            if (lastMessage.role === 'assistant') {
                speak(lastMessage.content);
            }
        }
        prevMessagesLengthRef.current = gemmaMessages.length;
    }, [gemmaMessages, mode, isTtsEnabled, speak]);


    const addMessageToGuidanceLog = useCallback((role, content) => { setGuidanceLog(prev => [...prev, { role, content }]); }, []);

    const promptForInput = useCallback(() => {
        setIsAwaitingUserInput(true);
        setTimeout(() => inputRef.current?.focus(), 100);
        return new Promise((resolve) => { inputResolverRef.current = resolve; });
    }, []);

    const startNewStep = useCallback((stepIndex) => {
        setGuidanceStepUI(stepIndex);
        setCountdown(EXAMINATION_TIME_PER_POINT);
    }, []);

    // --- CORE LOGIC ---
    const endGuidanceSession = useCallback(async (completedSuccessfully = false) => {
        sessionRunningRef.current = false;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        if (guidanceIntervalRef.current) clearInterval(guidanceIntervalRef.current);
        if (frameRequestRef.current) cancelAnimationFrame(frameRequestRef.current);
        if (socketRef.current) {
            socketRef.current.onclose = null;
            socketRef.current.close();
        }

        if (!isGuidanceActive) return;

        if (completedSuccessfully && selectedPart) {
            await speak("The examination is complete. Do you have any other symptoms or concerns?");
            const finalConcerns = await promptForInput();

            const newConv = createNewConversation();
            setCurrentConversationId(newConv.id);
            
            setGemmaMessages([
              {
                role: 'system',
                content: `You are a helpful, empathetic, and professional medical assistant AI. Your role is to act like a doctor reviewing a patient's self-examination notes.
    
IMPORTANT: Do not mention that you are an AI or language model. Do not use disclaimers about not being a real doctor. Engage directly with the patient's concerns as a medical professional would.

Your task is to analyze the following patient-provided summary. Based on the findings, provide a preliminary analysis, suggest potential next steps, and request specific medical tests or additional information that would be necessary for a diagnosis. Maintain a caring and professional tone.` ,
 isNotification: true
              }
            ]);

            const systemPrompt = `You are a helpful, empathetic, and professional medical assistant AI. Your role is to act like a doctor reviewing a patient's self-examination notes.
    
IMPORTANT: Do not mention that you are an AI or language model. Do not use disclaimers about not being a real doctor. Engage directly with the patient's concerns as a medical professional would.

Your task is to analyze the following patient-provided summary. Based on the findings, provide a preliminary analysis, suggest potential next steps, and request specific medical tests or additional information that would be necessary for a diagnosis. Maintain a caring and professional tone.`;
            
            let userReport = `Here is the patient's data:\n\n**Patient Profile:**\n- Name: ${userData.name}\n- Age: ${userData.age}\n- Sex: ${userData.sex}\n\n`;
            userReport += `**Guided Examination Area:** ${selectedPart.name}\n\n`;
            userReport += `**Examination Findings:**\n`;
            
            const userFeedback = guidanceLog.filter(msg => msg.role === 'user');
            selectedPart.guidancePoints.forEach((point, index) => {
                const feedback = userFeedback[index + 1]?.content || "No feedback provided.";
                userReport += `- **${point.name}:** *"${feedback}"*\n`;
            });
            userReport += `\n**Final Stated Concerns:** *"${finalConcerns}"*`;

            // --- CORRECTED API CALL ---
            // This now sends the system prompt and user data as separate fields,
            // which the useGemma hook is designed to handle correctly.
            generateResponse({
              systemPrompt: systemPrompt,
              text: userReport,
              files: [],
              audioRecording: null
            });
            
            setMode('chat');

        } else {
            addMessageToGuidanceLog('assistant', 'Guidance session has been stopped.');
        }

        setIsGuidanceActive(false);
        setIsLoadingGuidance(false);
        setIsPaused(false);
        setCountdown(EXAMINATION_TIME_PER_POINT);
        guidanceStepRef.current = 0;
    }, [selectedPart, userData, guidanceLog, generateResponse, speak, promptForInput, addMessageToGuidanceLog, createNewConversation, setCurrentConversationId, setGemmaMessages, isGuidanceActive]);

    const advanceToNextStep = useCallback(async () => {
        const currentStep = guidanceStepRef.current;
        const points = selectedPart.guidancePoints;
        const point = points[currentStep];

        const feedbackPrompt = `Time's up for the ${point.name}. Did you notice anything unusual?`;
        addMessageToGuidanceLog('assistant', feedbackPrompt);
        await speak(feedbackPrompt);
        if (!sessionRunningRef.current) return;

        await promptForInput();
        if (!sessionRunningRef.current) return;

        if (currentStep + 1 < points.length) {
            const nextStep = currentStep + 1;
            guidanceStepRef.current = nextStep;
            const nextPrompt = `Okay. Now, please move to the ${points[nextStep].name}.`;
            addMessageToGuidanceLog('assistant', nextPrompt);
            await speak(nextPrompt);
            startNewStep(nextStep);
        } else {
            setCountdown(1);
            endGuidanceSession(true);
        }
    }, [selectedPart, addMessageToGuidanceLog, speak, promptForInput, endGuidanceSession, startNewStep]);

    const detectPose = useCallback((timestamp, bodyPart) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
        frameRequestRef.current = requestAnimationFrame((ts) => detectPose(ts, bodyPart));
        if (timestamp - lastFrameTimeRef.current < FRAME_INTERVAL) return;
        lastFrameTimeRef.current = timestamp;
        if (!videoRef.current || videoRef.current.readyState < 4) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            if (!blob || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Frame = reader.result.split(',')[1];
                const currentStep = guidanceStepRef.current;
                const currentGuidancePoint = bodyPart?.guidancePoints[currentStep];
                const pointsToHighlight = currentGuidancePoint ? [currentGuidancePoint.id] : [];
                const payload = { frame: base64Frame, points: pointsToHighlight, bodyPart: bodyPart.id };
                socketRef.current.send(JSON.stringify(payload));
            };
            reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.7);
    }, []);

    const runGuidanceFlow = useCallback(async (bodyPart) => {
        addMessageToGuidanceLog('assistant', `Welcome, ${userData.name}! Let's begin the guidance session.`);
        await speak(`Welcome, ${userData.name}! Let's begin the guidance session.`);
        if (!sessionRunningRef.current) return;

        if (userData.age && userData.sex) {
            const confirmationPrompt = `For our records, please confirm: are you age ${userData.age} and gender ${userData.sex}?`;
            addMessageToGuidanceLog('assistant', confirmationPrompt);
            await speak(confirmationPrompt);
            if (!sessionRunningRef.current) return;
            await promptForInput();
            if (!sessionRunningRef.current) return;
        } else {
            addMessageToGuidanceLog('assistant', "To start, please state your age.");
            await speak("To start, please state your age.");
            if (!sessionRunningRef.current) return;
            await promptForInput();
            if (!sessionRunningRef.current) return;

            addMessageToGuidanceLog('assistant', "Thank you. Now, please state your gender.");
            await speak("Thank you. Now, please state your gender.");
            if (!sessionRunningRef.current) return;
            await promptForInput();
            if (!sessionRunningRef.current) return;
        }

        addMessageToGuidanceLog('assistant', "Great, thank you for confirming. Let's begin the examination.");
        await speak("Great, thank you for confirming. Let's begin the examination.");
        if (!sessionRunningRef.current) return;

        const points = bodyPart.guidancePoints;
        guidanceStepRef.current = 0;
        const startPrompt = `Please start with the ${points[0].name}.`;
        addMessageToGuidanceLog('assistant', startPrompt);
        await speak(startPrompt);
        startNewStep(0);
    }, [addMessageToGuidanceLog, speak, userData, startNewStep, promptForInput]);

    const handleInputSubmit = (e) => {
        e.preventDefault();
        if (!inputResolverRef.current || !userInput.trim()) return;
        addMessageToGuidanceLog('user', userInput.trim());
        inputResolverRef.current(userInput.trim());
        inputResolverRef.current = null;
        setUserInput('');
        setIsAwaitingUserInput(false);
    };

    const startGuidance = useCallback((bodyPart) => {
        setIsModalOpen(false);
        setIsLoadingGuidance(true);
        setError(null);
        setGuidanceLog([]);
        guidanceStepRef.current = 0;
        sessionRunningRef.current = true;
        setSelectedPart(bodyPart);
        socketRef.current = new WebSocket(bodyPart.endpoint);
        socketRef.current.onopen = () => {
            setIsLoadingGuidance(false);
            setIsGuidanceActive(true);
            runGuidanceFlow(bodyPart);
        };
        socketRef.current.onmessage = (event) => {
            if (event.data instanceof Blob && imageRef.current) {
                const newImageUrl = URL.createObjectURL(event.data);
                if (imageRef.current.src) URL.revokeObjectURL(imageRef.current.src);
                imageRef.current.src = newImageUrl;
            }
        };
        socketRef.current.onerror = (err) => {
            setError("Connection to the guidance server failed.");
            endGuidanceSession(false);
        };
        socketRef.current.onclose = () => { endGuidanceSession(false); };
    }, [runGuidanceFlow, endGuidanceSession]);

    const handleGemmaSubmit = (inputData) => { generateResponse(inputData); };
    const ensureConversationExists = useCallback(() => {
        if (!currentConversationId) {
            const newConv = createNewConversation();
            setCurrentConversationId(newConv.id);
            return newConv.id;
        }
        return currentConversationId;
    }, [currentConversationId, createNewConversation, setCurrentConversationId]);

    // --- LIFECYCLE EFFECTS ---
    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(e => console.error("Video play failed:", e)); } })
            .catch(err => setError("Could not access webcam."));
        return () => {
            if (socketRef.current) socketRef.current.close();
            if (videoRef.current && videoRef.current.srcObject) { videoRef.current.srcObject.getTracks().forEach(track => track.stop()); }
        };
    }, []);

    useEffect(() => {
        if (!isGuidanceActive || isPaused || isAwaitingUserInput) { clearInterval(guidanceIntervalRef.current); return; }
        guidanceIntervalRef.current = setInterval(() => { setCountdown(prev => prev > 0 ? prev - 1 : 0); }, 1000);
        return () => clearInterval(guidanceIntervalRef.current);
    }, [isGuidanceActive, isPaused, isAwaitingUserInput]);

    useEffect(() => {
        if (isGuidanceActive && countdown <= 0 && !isAdvancingStep) {
            setIsAdvancingStep(true);
            advanceToNextStep().finally(() => {
                setIsAdvancingStep(false);
            });
        }
    }, [countdown, isGuidanceActive, isAdvancingStep, advanceToNextStep]);

    useEffect(() => {
        if (isGuidanceActive && !isPaused) { frameRequestRef.current = requestAnimationFrame((ts) => detectPose(ts, selectedPart)); }
        else { if (frameRequestRef.current) cancelAnimationFrame(frameRequestRef.current); }
        return () => { if (frameRequestRef.current) cancelAnimationFrame(frameRequestRef.current); };
    }, [isGuidanceActive, isPaused, selectedPart, detectPose]);

    return (
        <div className="h-screen w-full overflow-hidden flex flex-col bg-gradient-to-br from-primary-50 via-primary-100/30 to-indigo-50 text-gray-800">
            {isModalOpen && (
                 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 max-w-2xl w-full">
                        <h2 className="text-3xl font-bold mb-2 text-primary-800">Select Examination Area</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            {BODY_PARTS.map(part => (
                                <div key={part.id} className="text-center">
                                    <button onClick={() => part.active && startGuidance(part)} disabled={!part.active} className={`w-full p-4 border rounded-xl flex flex-col items-center justify-center gap-3 transition-all duration-200 ${part.active ? 'bg-primary-50 hover:bg-primary-100 border-primary-200 hover:border-primary-400' : 'bg-gray-100 opacity-50 cursor-not-allowed'}`}>
                                        <img src={part.image} alt={part.name} className="w-16 h-16 object-contain" />
                                        <span className={`font-semibold ${part.active ? 'text-primary-800' : 'text-gray-500'}`}>{part.name}</span>
                                    </button>
                                     {!part.active && <span className="inline-block mt-2 text-xs font-medium text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">Coming Soon</span>}
                                </div>
                            ))}
                        </div>
                         <div className="text-center mt-6"><button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-800 font-semibold">Cancel</button></div>
                    </div>
                </div>
            )}

            <header className="bg-primary-700 shadow-md">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <h1 className="text-xl font-bold text-white">VR Gemma - {mode === 'guidance' ? 'Guided Examination' : 'Diagnostic Chat'}</h1>
                </div>
            </header>

            {mode === 'guidance' ? (
                <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-6 flex flex-col lg:flex-row gap-6 min-h-0">
                    <div className="flex-grow flex flex-col bg-primary-800 rounded-xl shadow-lg overflow-hidden border border-primary-700/50 relative">
                        <div className="flex-grow bg-gray-900 relative min-h-0 flex items-center justify-center">
                            <img ref={imageRef} alt="Guidance Feed" className={`w-full h-full object-contain ${(isGuidanceActive || isLoadingGuidance) ? 'block' : 'hidden'}`} />
                            <video ref={videoRef} className={`w-full h-full object-contain ${!(isGuidanceActive || isLoadingGuidance) ? 'block' : 'hidden'}`} playsInline muted/>
                            <div className="absolute inset-0 flex items-center justify-center">
                                {error && (<div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white z-20 p-4"><div className="text-center"><p className="font-semibold text-red-400">An Error Occurred</p><p className="mt-2 text-gray-200">{error}</p><button onClick={() => window.location.reload()} className="mt-4 bg-primary-600 px-4 py-2 rounded-lg font-bold">Refresh Page</button></div></div>)}
                                {isLoadingGuidance && (<div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white z-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div><p className="ml-4 text-lg">Connecting to Server...</p></div>)}
                                {(!isGuidanceActive && !isLoadingGuidance && !error) && (<div className="w-full h-full flex flex-col items-center justify-center z-10 p-6 bg-black/30"><button onClick={() => setIsModalOpen(true)} className="group flex items-center justify-center gap-3 bg-gradient-to-r from-primary-700 to-primary-600 text-white font-bold text-lg py-4 px-8 rounded-full shadow-lg hover:scale-105 transition-transform"><Play className="h-6 w-6" /> Start Guidance</button></div>)}
                                {isGuidanceActive && isPaused && (<div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-30"><Pause size={64} className="opacity-80" /><p className="text-3xl font-bold mt-4 tracking-widest">PAUSED</p></div>)}
                            </div>
                            {isGuidanceActive && !isAwaitingUserInput && (<div className="absolute top-4 right-4 text-white bg-black/50 p-4 rounded-lg text-center shadow-lg z-40"><div className="text-sm font-bold uppercase text-primary-300 tracking-wider">Time Left</div><div className="text-5xl font-mono">{countdown}s</div></div>)}
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent flex justify-between items-center z-40">
                               <h2 className="text-lg font-semibold text-white">{isGuidanceActive ? `Guiding: ${selectedPart?.guidancePoints[guidanceStepUI]?.name}` : 'Ready for Guidance'}</h2>
                               {isGuidanceActive && (<div className="flex items-center gap-2"><button onClick={() => setIsPaused(!isPaused)} className="bg-yellow-500 text-black py-2 px-4 rounded-lg flex items-center gap-2 text-sm font-semibold hover:bg-yellow-400 transition-colors">{isPaused ? <Play size={16}/> : <Pause size={16} />} {isPaused ? 'Resume' : 'Pause'}</button><button onClick={() => endGuidanceSession(false)} className="bg-red-600 text-white py-2 px-4 rounded-lg flex items-center gap-2 text-sm font-semibold hover:bg-red-500 transition-colors"><Square size={16} /> End</button></div>)}
                            </div>
                        </div>
                    </div>
                    <div className={`flex-shrink-0 w-full lg:w-96 flex-col bg-primary-800 rounded-xl shadow-lg border border-primary-700/50 min-h-0 ${isGuidanceActive || guidanceLog.length > 0 ? 'flex' : 'hidden'}`}>
                        <h2 className="text-lg font-semibold text-white p-4 border-b border-primary-700 flex items-center gap-2">{isAwaitingUserInput ? (<><Send size={18} className="text-yellow-400 animate-pulse" /><span>Awaiting your response...</span></>) : ('Guidance Log')}</h2>
                        <div className="p-4 flex-grow flex flex-col-reverse overflow-y-auto"><div className="space-y-4">{guidanceLog.map((msg, index) => (<div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`p-3 rounded-lg max-w-xs ${msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-primary-900/80 text-primary-100'}`}>{msg.content}</div></div>))}</div></div>
                        {isAwaitingUserInput && (<div className="p-4 border-t border-primary-700"><form onSubmit={handleInputSubmit} className="flex items-center gap-2"><input ref={inputRef} type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Type your response..." className="flex-grow bg-primary-900/80 text-white placeholder-primary-300/60 rounded-lg px-4 py-2 border border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400" autoComplete="off" /><button type="submit" className="bg-primary-600 hover:bg-primary-500 text-white font-bold p-2 rounded-lg transition-colors flex-shrink-0"><Send size={20} /></button></form></div>)}
                    </div>
                </main>
            ) : (
                <main className="flex-1 flex flex-col min-h-0 bg-white">
                    <div className="p-4 border-b bg-white flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-700">Diagnostic Chat</h2>
                        <button
                            onClick={() => setIsTtsEnabled(prev => !prev)}
                            className={`p-2 rounded-full transition-colors ${isTtsEnabled ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            title={isTtsEnabled ? 'Disable Text-to-Speech' : 'Enable Text-to-Speech'}
                        >
                            {isTtsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                        </button>
                    </div>
                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
    {/* Map over the messages and render the MessageBubble component for each one */}
    {gemmaMessages.map((msg, index) => (
        <MessageBubble key={index} message={msg} />
    ))}

    {/* Display a loading indicator while the assistant is generating a response */}
    {isGemmaLoading && (
        <div className="flex items-start gap-3 justify-start">
           <div className="p-2 bg-primary-600 rounded-full text-white flex-shrink-0"><BotMessageSquare size={20}/></div>
           <div className="max-w-2xl rounded-lg p-4 bg-white shadow-sm border">
               {/* Animated dots for loading state */}
               <div className="flex items-center space-x-2">
                   <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                   <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
               </div>
           </div>
       </div>
    )}
</div>

                    <div className="border-t bg-white p-4">
                        <MultimodalInput onSubmit={handleGemmaSubmit} isLoading={isGemmaLoading} waitingForResponse={waitingForResponse} ensureConversationExists={ensureConversationExists}/>
                    </div>
                </main>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
        </div>
    );
}

export default SessionPage;