import React, { useState, useRef, useEffect } from 'react';

// Define the server URLs
const WEBSOCKET_URL = 'ws://localhost:3010';
const API_URL = 'http://localhost:3010'; // Kept for the initial health check

// Constant for FPS limit (10 frames per second)
const FPS_LIMIT = 5;
const FRAME_INTERVAL = 1000 / FPS_LIMIT; // in milliseconds

function SessionPage() {
    // State management
    const [isDetecting, setIsDetecting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [serverStatus, setServerStatus] = useState({ online: false, modelLoaded: false });
    const [currentFps, setCurrentFps] = useState(0);
    const [quality, setQuality] = useState('medium'); // Options: low, medium, high

    // Refs for DOM elements and WebSocket
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const imageRef = useRef(null);
    const requestRef = useRef(null);
    const socketRef = useRef(null);
    const lastFrameTimeRef = useRef(0);
    const frameCountRef = useRef(0);
    const lastFpsUpdateRef = useRef(0);

    // 1. Check server health only once on component mount
    useEffect(() => {
        const checkServer = async () => {
            try {
                const response = await fetch(`${API_URL}/health`);
                if (!response.ok) throw new Error('Server responded with an error');
                const data = await response.json();
                setServerStatus({
                    online: data.status === 'ok',
                    modelLoaded: data.models?.pose_estimation?.loaded || false,
                });
            } catch (err) {
                setError('Could not connect to the AI Core server. Is it running?');
            }
        };
        checkServer();
    }, []); // Empty array ensures this runs only once

    // 2. Main detection loop
    const detectPose = (timestamp) => {
        // Ensure the component is still mounted and video is ready
        if (!videoRef.current || videoRef.current.readyState !== 4) {
            requestRef.current = requestAnimationFrame(detectPose);
            return;
        }
        
        // Calculate time since last frame
        const elapsed = timestamp - lastFrameTimeRef.current;
        
        // Limit frame rate to FPS_LIMIT
        if (elapsed >= FRAME_INTERVAL) {
            // Update fps counter every second
            frameCountRef.current++;
            if (timestamp - lastFpsUpdateRef.current >= 1000) {
                setCurrentFps(Math.round((frameCountRef.current * 1000) / (timestamp - lastFpsUpdateRef.current)));
                frameCountRef.current = 0;
                lastFpsUpdateRef.current = timestamp;
            }
            
            // Correctly get the canvas element from the 'canvasRef'
            const canvas = canvasRef.current;
            const video = videoRef.current;

            // Now we can safely use the canvas and video variables
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert canvas to blob and send over WebSocket
            // Adjust JPEG quality based on the quality setting
            const jpegQuality = quality === 'low' ? 0.5 : quality === 'medium' ? 0.7 : 0.9;
            canvas.toBlob((blob) => {
                if (blob && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                    socketRef.current.send(blob);
                }
            }, 'image/jpeg', jpegQuality);
            
            // Update the timestamp reference
            lastFrameTimeRef.current = timestamp;
        }

        // Schedule the next frame
        requestRef.current = requestAnimationFrame(detectPose);
    };

    // 3. Functions to start and stop the detection process
    const startDetection = () => {
        setIsLoading(true);
        setError(null);

        socketRef.current = new WebSocket(WEBSOCKET_URL);

        socketRef.current.onopen = () => {
            console.log("WebSocket connection established.");
            navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
                .then(stream => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.onloadedmetadata = () => {
                            videoRef.current.play();
                            setIsLoading(false);
                            setIsDetecting(true);
                            // Initialize FPS tracking
                            frameCountRef.current = 0;
                            lastFrameTimeRef.current = performance.now();
                            lastFpsUpdateRef.current = performance.now();
                            requestRef.current = requestAnimationFrame(detectPose);
                        };
                    }
                })
                .catch(err => {
                    console.error("Webcam access error:", err);
                    setError("Could not access webcam. Please grant permission.");
                    setIsLoading(false);
                    socketRef.current.close();
                });
        };

        socketRef.current.onmessage = (event) => {
            // event.data is a Blob from the server
            const newImageUrl = URL.createObjectURL(event.data);
            if (imageRef.current) {
                if (imageRef.current.src) {
                    URL.revokeObjectURL(imageRef.current.src); // Prevent memory leaks
                }
                imageRef.current.src = newImageUrl;
            }
        };

        socketRef.current.onerror = (event) => {
            console.error("WebSocket error:", event);
            setError("Connection to the server failed. Please ensure the server is running.");
            setIsLoading(false);
            setIsDetecting(false);
        };

        socketRef.current.onclose = () => {
            console.log("WebSocket connection closed.");
            setIsDetecting(false);
            setIsLoading(false);
            cancelAnimationFrame(requestRef.current);
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
            }
        };
    };

    const stopDetection = () => {
        if (socketRef.current) {
            socketRef.current.close();
        }
    };

    const handleToggleDetection = () => {
        if (isDetecting) {
            stopDetection();
        } else {
            startDetection();
        }
    };

    const handleQualityChange = (newQuality) => {
        setQuality(newQuality);
    };

    // Determine button text for clarity
    let buttonText = '▶️ Start Detection';
    if (isLoading) buttonText = 'Connecting...';
    if (isDetecting) buttonText = '⏹️ Stop Detection';

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-100/30 to-indigo-50">
            {/* Header Section */}
            <div className="bg-primary-700 backdrop-blur-md border-b border-primary-800/20 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white">Pose Estimation Session</h1>
                            <p className="text-sm text-primary-100">Real-time analysis with {FPS_LIMIT} FPS optimization</p>
                        </div>
                        
                        {/* Status Indicators */}
                        <div className="flex items-center gap-x-4 bg-primary-800/50 px-4 py-2 rounded-full shadow-sm text-white border border-primary-600/50">
                            <span className="flex items-center gap-1 text-sm">
                                Server <span className={`inline-block w-2 h-2 rounded-full ${serverStatus.online ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            </span>
                            <span className="flex items-center gap-1 text-sm">
                                Model <span className={`inline-block w-2 h-2 rounded-full ${serverStatus.modelLoaded ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            </span>
                            {isDetecting && (
                                <span className="flex items-center gap-1 text-sm">
                                    <span className="font-mono">{currentFps} FPS</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Controls Section */}
                <div className="mb-8 flex flex-wrap items-center gap-4">
                    <button 
                        onClick={handleToggleDetection} 
                        disabled={!serverStatus.online || !serverStatus.modelLoaded || isLoading}
                        className="py-3 px-6 text-base font-semibold text-white bg-gradient-to-r from-primary-700 to-primary-600 rounded-lg shadow-md hover:shadow-lg transform transition-all duration-200 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                        {buttonText}
                    </button>
                    
                    {isDetecting && (
                        <div className="flex items-center gap-2 bg-primary-700 p-2 rounded-lg shadow-sm text-white">
                            <span className="text-sm font-medium">Quality:</span>
                            <div className="flex">
                                {['low', 'medium', 'high'].map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => handleQualityChange(q)}
                                        className={`px-3 py-1.5 text-sm border-0 rounded-md ${
                                            quality === q 
                                                ? 'bg-primary-500 text-white font-medium' 
                                                : 'bg-primary-800/70 text-primary-100 hover:bg-primary-800'
                                        } transition-colors mx-0.5`}
                                    >
                                        {q.charAt(0).toUpperCase() + q.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="bg-red-50 text-red-800 p-4 border border-red-200 rounded-lg mb-6 shadow-sm" role="alert">
                        <p className="font-bold">Error</p>
                        <p>{error}</p>
                    </div>
                )}

                {/* Video Feed Card */}
                <div className="bg-primary-800 rounded-xl shadow-lg overflow-hidden border border-primary-700/50">
                    <div className="border-b border-primary-700 p-4">
                        <h2 className="text-lg font-semibold text-white">Live Pose Tracking</h2>
                    </div>
                    
                    <div className="bg-gray-900 p-3 min-h-[480px] flex items-center justify-center relative">
                        <img 
                            ref={imageRef} 
                            alt="Pose estimation feed" 
                            className={`max-w-full h-auto rounded-lg object-contain ${isDetecting || isLoading ? 'block' : 'hidden'}`} 
                        />
                        
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                                <div className="flex flex-col items-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400 mb-4"></div>
                                    <p className="font-medium">Connecting to server...</p>
                                </div>
                            </div>
                        )}
                        
                        {(!isDetecting && !isLoading) && (
                            <div className="flex flex-col items-center text-primary-200 p-6">
                                <div className="w-20 h-20 rounded-full bg-primary-700 flex items-center justify-center mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <p className="text-xl font-medium text-primary-100">Ready to start session</p>
                                <p className="text-primary-300 mt-2">Click the start button above to begin pose tracking</p>
                            </div>
                        )}
                        
                        {/* Hidden elements for processing */}
                        <video ref={videoRef} style={{ display: 'none' }} playsInline></video>
                        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                    </div>
                    
                    {isDetecting && (
                        <div className="bg-primary-900/80 px-4 py-3 flex items-center justify-between text-sm text-primary-200">
                            <div>
                                <span className="font-medium text-primary-100">Active Session</span> • Quality: {quality}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-700 text-primary-100">
                                    {FPS_LIMIT} FPS Limit
                                </span>
                                <span className="text-primary-300">{new Date().toLocaleDateString()}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SessionPage;
