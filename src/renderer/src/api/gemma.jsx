import { useState, useEffect, useCallback } from 'react';

// The URL for the backend AI server
const API_URL = 'http://localhost:3010';

/**
 * Custom hook to manage interaction with the Gemma AI backend.
 * Handles conversation state, file uploads, and streaming responses.
 */
export const useGemma = () => {
  // State for the conversation messages array
  const [messages, setMessages] = useState([]);
  // State to track if a response is currently being generated
  const [isLoading, setIsLoading] = useState(false);
  // State to track the backend model's status ('loading', 'ready', 'error')
  const [modelStatus, setModelStatus] = useState('loading');
  // State for initial message to display to the user
  const [initMessage, setInitMessage] = useState('Welcome to MediGemma AI. How can I assist you with your medical data today?');

  // Memoized boolean to easily check if the model is ready
  const isModelReady = modelStatus === 'ready';

  // Function to check the health of the backend server on initial load
  const checkServerHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (!response.ok) {
        throw new Error(`Server health check failed: ${response.statusText}`);
      }
      const data = await response.json();
      // Check if both models are reported as loaded
      if (data?.models?.gemma_vision?.loaded && data?.models?.pose_estimation?.loaded) {
        setModelStatus('ready');
        console.log('AI server is healthy and models are loaded.');
      } else {
        setModelStatus('error');
        setInitMessage('AI server is online, but one or more models failed to load.');
        console.error('AI server is online, but one or more models failed to load.', data.models);
      }
    } catch (error) {
      console.error('Failed to connect to the AI server.', error);
      setModelStatus('error');
      setInitMessage('Error connecting to AI server. Please check if the server is running.');
    }
  }, []);

  // On component mount, check the server health
  useEffect(() => {
    checkServerHealth();
  }, [checkServerHealth]);

  // Function to clear the entire conversation
  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  /**
   * Main function to send user input to the backend and handle the response.
   * @param {object} inputData - The data from the input component.
   * @param {string} inputData.text - The user's text input.
   * @param {Array} inputData.files - An array of uploaded file objects.
   * @param {object} inputData.audioRecording - The recorded audio blob object.
   */
  const generateResponse = useCallback(async (inputData) => {
    // Prevent sending empty requests
    if (!inputData.text?.trim() && (!inputData.files || inputData.files.length === 0) && !inputData.audioRecording) {
      return;
    }

    if (!isModelReady) {
      console.warn('AI model is not ready yet. Please wait.');
      return;
    }

    setIsLoading(true);

    // Create the user's message object and add it to the conversation
    const userMessage = {
      role: 'user',
      content: inputData.text || '',
      files: inputData.files || [],
      audioRecording: inputData.audioRecording,
      timestamp: new Date().toISOString(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Use FormData to send text, files, and conversation history in a single request
    const formData = new FormData();
    formData.append('text', inputData.text || '');

    // Send the full conversation history (including the new user message)
    const conversationHistory = [...messages, userMessage].map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      // Include file names but not the actual file objects for history
      ...(msg.files && msg.files.length > 0 && { 
        files: msg.files.map(f => ({ name: f.name, type: f.type })) 
      }),
      ...(msg.audioRecording && { 
        audioRecording: { name: msg.audioRecording.name } 
      })
    }));
    
    // Add system prompt if provided
    if (inputData.systemPrompt) {
      console.log('💬 Adding system prompt to conversation');
      // Add the system message at the beginning of the conversation
      conversationHistory.unshift({
        role: 'system',
        content: inputData.systemPrompt,
        timestamp: new Date().toISOString()
      });
    }
    
    if (conversationHistory.length > 0) {
      console.log(`📜 Sending conversation history with ${conversationHistory.length} messages`);
      formData.append('conversation', JSON.stringify(conversationHistory));
    }

    // Append image files (server expects 'image' field)
    if (inputData.files && inputData.files.length > 0) {
      inputData.files.forEach(fileObj => {
        // Assuming your server can handle multiple files under the same field name
        if (fileObj.type?.startsWith('image')) {
          formData.append('image', fileObj.file, fileObj.name);
        }
      });
    }

    // Append audio file (server expects 'audio' field)
    if (inputData.audioRecording) {
      formData.append('audio', inputData.audioRecording.file, inputData.audioRecording.name);
    }

    // Add a placeholder for the assistant's response
    const assistantMessageId = Date.now();
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '', // Start with empty content
        timestamp: new Date().toISOString(),
        complete: false,
      },
    ]);

    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        body: formData, // FormData sets the 'Content-Type' to 'multipart/form-data' automatically
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      // Handle the streaming response from the server
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamDone = false;
      let imageUrl = null;
      let buffer = '';

      while (!streamDone) {
        const { value, done } = await reader.read();
        if (done) {
          streamDone = true;
          // Process any remaining buffer content
          if (buffer.trim()) {
            processBuffer(buffer);
          }
          // Mark the message as complete
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId 
              ? { ...m, complete: true, ...(imageUrl && { imageUrl }) } 
              : m
          ));
        } else {
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Process complete lines from the buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last potentially incomplete line in the buffer
          
          for (const line of lines) {
            if (!line.trim()) continue;
            processLine(line);
          }
        }
      }

      // Helper function to process a single line of response
      function processLine(line) {
        try {
          const parsed = JSON.parse(line);
          console.log('📥 Received JSON message:', parsed);
          
          if (parsed.type === 'metadata') {
            // Handle metadata (like image URL)
            if (parsed.imageUrl) {
              imageUrl = parsed.imageUrl;
            }
            if (parsed.message) {
              // Update message with processing status, but don't overwrite existing content
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === assistantMessageId
                    ? { 
                        ...msg, 
                        content: msg.content || parsed.message,
                        ...(imageUrl && { imageUrl })
                      }
                    : msg
                )
              );
            }
          } else if (parsed.type === 'chunk') {
            // Handle text chunks - replace "Processing..." with actual content
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === assistantMessageId
                  ? { 
                      ...msg, 
                      content: (msg.content && msg.content.includes('Processing...')) 
                        ? parsed.data 
                        : (msg.content || '') + parsed.data,
                      ...(imageUrl && { imageUrl })
                    }
                  : msg
              )
            );
          } else if (parsed.type === 'complete') {
            // Handle completion with final response
            if (parsed.fullResponse) {
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === assistantMessageId
                    ? { 
                        ...msg, 
                        content: parsed.fullResponse,
                        complete: true,
                        ...(parsed.imageUrl && { imageUrl: parsed.imageUrl })
                      }
                    : msg
                )
              );
            }
            if (parsed.imageUrl && !imageUrl) {
              imageUrl = parsed.imageUrl;
            }
          }
        } catch (parseError) {
          // If it's not JSON, treat it as plain text (fallback for older responses)
          // Only append if we haven't started JSON parsing for this message
          if (line.trim() && !line.includes('{"type":')) {
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: (msg.content || '') + line }
                  : msg
              )
            );
          }
        }
      }

      // Helper function to process the buffer (same logic as processLine)
      function processBuffer(bufferContent) {
        const lines = bufferContent.split('\n').filter(line => line.trim());
        for (const line of lines) {
          processLine(line);
        }
      }

    } catch (error) {
      console.error('Error generating response:', error);
      // Update the assistant's message with an error
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: `Error: Could not get response from the server. ${error.message}`, complete: true }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, isModelReady]);

  /**
   * NEW: Function to process prescription images using OCR + LLM
   * @param {File} imageFile - The prescription image file
   * @param {string} prompt - The user's prompt/question about the prescription
   * @returns {Promise<object>} - The processed prescription data
   */
  const generateOCRResponse = useCallback(async (imageFile, 
    prompt = `
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
        `) => {
    if (!imageFile || !(imageFile instanceof File)) {
      throw new Error('Invalid image file provided');
    }

    if (!isModelReady) {
      throw new Error('AI model is not ready yet. Please wait.');
    }

    setIsLoading(true);

    try {
      console.log('🔍 Processing prescription image with OCR endpoint:', imageFile.name);
      
      // Create FormData for the OCR endpoint
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('prompt', prompt);

      const response = await fetch(`${API_URL}/ocrgenerate`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR Server error: ${response.status} ${response.statusText}`);
      }

      // Handle the streaming response from the OCR endpoint
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let extractedText = '';
      let imageUrl = null;
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // Process any remaining buffer content
          if (buffer.trim()) {
            processOCRBuffer(buffer);
          }
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Process complete lines from the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last potentially incomplete line in the buffer
        
        for (const line of lines) {
          if (!line.trim()) continue;
          processOCRLine(line);
        }
      }

      // Helper function to process OCR response lines
      function processOCRLine(line) {
        try {
          const parsed = JSON.parse(line);
          console.log('📥 Received OCR JSON message:', parsed);
          
          if (parsed.type === 'metadata') {
            if (parsed.imageUrl) {
              imageUrl = parsed.imageUrl;
            }
            if (parsed.extractedText) {
              extractedText = parsed.extractedText;
            }
            console.log(`📝 OCR extracted ${parsed.extractedTextLength || 0} characters`);
          } else if (parsed.type === 'chunk') {
            fullResponse += parsed.data;
          } else if (parsed.type === 'complete') {
            if (parsed.fullResponse && !fullResponse) {
              fullResponse = parsed.fullResponse;
            }
            if (parsed.extractedText && !extractedText) {
              extractedText = parsed.extractedText;
            }
            if (parsed.imageUrl && !imageUrl) {
              imageUrl = parsed.imageUrl;
            }
          } else if (parsed.type === 'error') {
            throw new Error(parsed.error || 'OCR processing failed');
          }
        } catch (parseError) {
          // If it's not JSON, treat it as plain text (fallback)
          if (line.trim() && !line.includes('{"type":')) {
            fullResponse += line;
          }
        }
      }

      // Helper function to process the buffer
      function processOCRBuffer(bufferContent) {
        const lines = bufferContent.split('\n').filter(line => line.trim());
        for (const line of lines) {
          processOCRLine(line);
        }
      }

      console.log('✅ OCR processing complete');
      console.log(`📝 Extracted text: ${extractedText.length} characters`);
      console.log(`🤖 LLM response: ${fullResponse.length} characters`);

      // Return the complete OCR result
      return {
        success: true,
        extractedText,
        llmResponse: fullResponse,
        imageUrl,
        originalFilename: imageFile.name
      };

    } catch (error) {
      console.error('❌ Error in OCR generation:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isModelReady]);

  // Helper function to extract values from text using various patterns
  const extractValue = (text, field) => {
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

  // Helper function to validate and clean the response
 const validateAndCleanResponse = (response) => {
    // **** FIX: Add a check to handle the health score format FIRST ****
    if (response && typeof response.score === 'number' && typeof response.opinion === 'string') {
      // If it's a valid health score object, return it immediately.
      return response;
    }

    const allowedCategories = ['General', 'Radiology', 'Blood Work', 'Cardiology', 'Dermatology', 'Endocrinology', 'Neurology', 'Physical Therapy', 'Prescription', 'Other'];
    
    // If the response has medication field, return it as is for prescription processing
    if (response.medication) {
      return response;
    }
    
    // Fallback for general medical records
    return {
      title: typeof response.title === 'string' ? response.title.trim() : 'Medical Record Analysis',
      category: allowedCategories.includes(response.category) ? response.category : 'General',
      notes: typeof response.notes === 'string' ? response.notes.trim() : 'AI-generated medical document analysis',
      analysis: typeof response.analysis === 'string' ? response.analysis.trim() : 'Unable to generate detailed analysis from the provided document.',
      ...(response.imageUrl && { imageUrl: response.imageUrl })
    };
  };


  // Updated generateStructuredResponse function to handle server's JSON response format
  const generateStructuredResponse = useCallback(async (inputData) => {
    console.log('🔥 generateStructuredResponse called with:', inputData);
    
    if (!isModelReady) {
      throw new Error('AI model is not ready yet. Please wait.');
    }

    setIsLoading(true);

    try {
      // Check if the input is a File or Blob object from a prescription scan
      const isPrescriptionScan = inputData instanceof File || inputData instanceof Blob;
      
      // Create FormData for multipart upload
      const formData = new FormData();
      
      if (isPrescriptionScan) {
        console.log('📋 Processing prescription scan file:', inputData.name || 'unnamed file', inputData.type, inputData.size, 'bytes');
        
        // Add prescription-specific prompt
        const prescriptionPrompt = `
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
        `;
        
        formData.append('text', prescriptionPrompt);
        
        // Add the prescription image file
        formData.append('image', inputData, inputData.name || `prescription-${Date.now()}.${inputData.type.split('/')[1] || 'jpg'}`);
        console.log('📄 Added prescription image file');
      } else {
        // Handle normal text+file request
        formData.append('text', inputData.text || '');

        // Send the conversation history
        const conversationHistory = messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          // Include file names but not the actual file objects for history
          ...(msg.files && msg.files.length > 0 && { 
            files: msg.files.map(f => ({ name: f.name, type: f.type })) 
          }),
          ...(msg.audioRecording && { 
            audioRecording: { name: msg.audioRecording.name } 
          })
        }));
        
        if (conversationHistory.length > 0) {
          console.log(`📜 Sending conversation history with ${conversationHistory.length} messages to structured response`);
        }
        
        formData.append('conversation', JSON.stringify(conversationHistory));

        // Add files if they exist - using the SAME logic as generateResponse
        if (inputData.files && inputData.files.length > 0) {
          console.log(`📎 Adding ${inputData.files.length} files to FormData...`);
          
          // Process all files like in generateResponse
          inputData.files.forEach(fileObj => {
            if (fileObj.type.startsWith('image')) {
              formData.append('image', fileObj.file, fileObj.name);
              console.log(`📄 Added image file: ${fileObj.name}`);
            }
          });
          
          if (inputData.files.length > 1) {
            console.warn(`⚠️ Multiple files detected, server will process all image files`);
          }
        }

        // Add audio recording if it exists - using the SAME logic as generateResponse
        if (inputData.audioRecording) {
          formData.append('audio', inputData.audioRecording.file, inputData.audioRecording.name);
          console.log(`🎵 Added audio recording: ${inputData.audioRecording.name}`);
        }
      }

      console.log('📤 Sending request to /generate endpoint...');
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      // Handle the structured response from server (JSON chunks + metadata)
      let fullResponse = '';
      let imageUrl = null;
      let hasUploadedImage = false;
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // Check if this is a JSON response with metadata
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            
            if (parsed.type === 'metadata') {
              console.log('📸 Received image metadata:', parsed);
              imageUrl = parsed.imageUrl;
              hasUploadedImage = true;
            } else if (parsed.type === 'chunk') {
              fullResponse += parsed.data;
            } else if (parsed.type === 'complete') {
              console.log('✅ Received completion metadata');
              if (parsed.imageUrl && !imageUrl) {
                imageUrl = parsed.imageUrl;
                hasUploadedImage = true;
              }
              if (parsed.fullResponse && !fullResponse) {
                fullResponse = parsed.fullResponse;
              }
            }
          } catch (parseError) {
            // If it's not JSON, it's probably plain text response
            if (!hasUploadedImage) {
              fullResponse += chunk;
            }
          }
        }
      }

      console.log('📥 Full response received:', fullResponse);
      console.log('🖼️ Image URL received:', imageUrl);

      // Clean the response before parsing
      let cleanedResponse = fullResponse.trim();
      
      // Remove common markdown formatting that might interfere
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      cleanedResponse = cleanedResponse.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      
      // Try multiple JSON extraction strategies
      let jsonResponse = null;
      
      // Strategy 1: Direct JSON parse
      try {
        jsonResponse = JSON.parse(cleanedResponse);
        console.log('✅ Strategy 1 - Direct parse successful:', jsonResponse);
      } catch (parseError) {
        console.log('⚠️ Strategy 1 failed, trying Strategy 2...');
        
        // Strategy 2: Extract JSON from curly braces
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            jsonResponse = JSON.parse(jsonMatch[0]);
            console.log('✅ Strategy 2 - Extracted JSON successful:', jsonResponse);
          } catch (extractError) {
            console.log('⚠️ Strategy 2 failed, trying Strategy 3...');
            
            // Strategy 3: Find the largest valid JSON object
            const braceMatches = cleanedResponse.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
            if (braceMatches) {
              for (const match of braceMatches.reverse()) { // Try largest first
                try {
                  jsonResponse = JSON.parse(match);
                  console.log('✅ Strategy 3 - Found valid JSON:', jsonResponse);
                  break;
                } catch (e) {
                  continue;
                }
              }
            }
          }
        }
      }
      
      // If all JSON parsing strategies failed, create a structured response from the text
      if (!jsonResponse) {
        console.log('⚠️ All JSON strategies failed, creating structured response from text...');
        
        // Try to extract key information from the text response
        const lines = cleanedResponse.split('\n').filter(line => line.trim());
        
        jsonResponse = {
          title: extractValue(cleanedResponse, 'title') || 'AI Generated Analysis',
          category: extractValue(cleanedResponse, 'category') || 'General',
          notes: extractValue(cleanedResponse, 'notes') || 'AI analysis completed',
          analysis: cleanedResponse.length > 100 ? cleanedResponse : 'Detailed analysis was not provided in the expected format.'
        };
      }
      
      // Validate and clean the final response
      const validatedResponse = validateAndCleanResponse(jsonResponse);
      
      // Add the image URL to the response if we received one
      if (imageUrl) {
        validatedResponse.imageUrl = imageUrl;
        console.log('🖼️ Added image URL to response:', imageUrl);
      }
      
      console.log('✅ Final validated response:', validatedResponse);
      
      return validatedResponse;
      
    } catch (error) {
      console.error('❌ Error in generateStructuredResponse:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isModelReady, messages, extractValue, validateAndCleanResponse]);

  // Return the state and functions to be used by the UI components
  return {
    messages,
    setMessages, // Expose setMessages for loading conversations
    isLoading,
    isModelReady,
    modelStatus,
    generateResponse,
    generateStructuredResponse,
    generateOCRResponse, // NEW: Expose the OCR function
    clearConversation,
    initMessage,
  };
};