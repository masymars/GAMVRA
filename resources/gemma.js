import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import { WebSocketServer } from 'ws';
import Tesseract from 'tesseract.js';

import {
    AutoProcessor,
    AutoModelForImageTextToText,
    TextStreamer,
    load_image,
} from "@huggingface/transformers";

import wavefile from 'wavefile';
import onnx from 'onnxruntime-node';
import { createCanvas, loadImage } from 'canvas';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Server and Middleware Setup ---
const app = express();
const port = 3010;
const upload = multer({ storage: multer.memoryStorage() }); // Use memory storage

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Serve static files from uploads directory ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// --- Model Configuration ---
let processor, model;
const LOCAL_MODEL_PATH = path.join(__dirname, '/models/gemma-3n-E2B-it-ONNX');

console.log("Starting server and loading local model...");
console.log(`Model path: ${LOCAL_MODEL_PATH}`);

if (!fs.existsSync(LOCAL_MODEL_PATH)) {
    console.error(`❌ Model directory not found: ${LOCAL_MODEL_PATH}`);
    console.error("Please download the model first.");
    process.exit(1);
}

// --- Progress Callback ---
const progress_callback = (progress) => {
    const { status, file, progress: loaded, total } = progress;
    if (status === 'initiate') return;
    let sizeText = '';
    if (total > 0) {
        const loadedMB = (loaded / 1024 / 1024).toFixed(2);
        const totalMB = (total / 1024 / 1024).toFixed(2);
        const percentage = ((loaded / total) * 100).toFixed(2);
        sizeText = `[${percentage}%] (${loadedMB}MB / ${totalMB}MB)`;
    }
    if (status === 'loading') {
        process.stdout.write(`- Loading: ${file} ${sizeText}\r`);
    } else if (status === 'done') {
        process.stdout.write(`- Loaded: ${file.padEnd(50)} ${sizeText}\n`);
    }
};

try {
    console.log("Loading processor from local path...");
    processor = await AutoProcessor.from_pretrained(LOCAL_MODEL_PATH, {
        progress_callback,
        local_files_only: true
    });

    console.log("Loading model from local path...");
    model = await AutoModelForImageTextToText.from_pretrained(LOCAL_MODEL_PATH, {
        dtype: {
            embed_tokens: "q8",
            audio_encoder: "q4", 
            vision_encoder: "fp16",
            decoder_model_merged: "q4",
        },
        device: "cpu",
        progress_callback,
        local_files_only: true
    });
    console.log("✅ Local model loaded successfully!");
} catch (e) {
    console.error("❌ Failed to load local model:", e);
    process.exit(1);
}

// =================================================================
// ## 2. ONNX Pose Estimation Model Configuration & Loading
// =================================================================
let poseSession;
const POSE_MODEL_PATH = path.join(__dirname, 'head.onnx');
const MODEL_INPUT_WIDTH = 640;
const MODEL_INPUT_HEIGHT = 640;

async function loadPoseModel() {
    console.log("\n--- Loading YOLOv8 Pose Estimation Model ---");
    if (!fs.existsSync(POSE_MODEL_PATH)) {
        console.error(`❌ Pose estimation model not found: ${POSE_MODEL_PATH}`);
        return;
    }
    try {
        poseSession = await onnx.InferenceSession.create(POSE_MODEL_PATH);
        console.log("✅ Pose estimation model loaded successfully!");
    } catch (e) {
        console.error("❌ Failed to load the ONNX pose model:", e);
    }
}

// --- Helper function to process audio ---
async function processAudio(buffer) {
    const wav = new wavefile.WaveFile(buffer);
    wav.toBitDepth("32f");
    wav.toSampleRate(processor.feature_extractor.config.sampling_rate);
    let audioData = wav.getSamples();
    if (Array.isArray(audioData)) {
        if (audioData.length > 1) { // Stereo to mono
            const mono = new Float32Array(audioData[0].length);
            for (let i = 0; i < audioData[0].length; ++i) {
                mono[i] = (audioData[0][i] + audioData[1][i]) / 2;
            }
            return mono;
        }
        audioData = audioData[0];
    }
    return audioData;
}

// =================================================================
// ## 3. Helper Functions for Pose Estimation
// =================================================================
async function preProcessPoseImage(image) {
    const canvas = createCanvas(MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT);
    const imageData = ctx.getImageData(0, 0, MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT);
    const { data } = imageData;
    const red = [], green = [], blue = [];
    for (let i = 0; i < data.length; i += 4) {
        red.push(data[i] / 255);
        green.push(data[i + 1] / 255);
        blue.push(data[i + 2] / 255);
    }
    const input = [...red, ...green, ...blue];
    return new onnx.Tensor('float32', input, [1, 3, MODEL_INPUT_HEIGHT, MODEL_INPUT_WIDTH]);
}

function processPoseOutput(output, originalWidth, originalHeight) {
    const boxes = [];
    const [batchSize, numChannels, numBoxes] = output.dims;
    for (let i = 0; i < numBoxes; i++) {
        const boxData = [];
        for (let j = 0; j < numChannels; j++) boxData.push(output.data[j * numBoxes + i]);
        boxes.push(boxData);
    }
    let bestBox = null, maxConfidence = -1;
    for (const box of boxes) {
        const confidence = box[4];
        if (confidence > maxConfidence) {
            maxConfidence = confidence;
            bestBox = box;
        }
    }
    if (!bestBox || maxConfidence < 0.25) return [];
    const keypoints = [];
    const keypointData = bestBox.slice(5);
    for (let i = 0; i < 17; i++) {
        const x = keypointData[i * 3] * (originalWidth / MODEL_INPUT_WIDTH);
        const y = keypointData[i * 3 + 1] * (originalHeight / MODEL_INPUT_HEIGHT);
        const confidence = keypointData[i * 3 + 2];
        keypoints.push({ x, y, confidence });
    }
    return keypoints;
}

function drawKeypoints(ctx, keypoints) {
    ctx.fillStyle = '#00FF00';
    ctx.lineWidth = 3;
    keypoints.forEach(kp => {
        if (kp.confidence > 0.5) {
            ctx.beginPath();
            ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
}

async function getPoseEstimationFrame(imageBuffer) {
    if (!poseSession) {
        throw new Error("Pose estimation model is not loaded.");
    }
    const image = await loadImage(imageBuffer);
    const { width: originalWidth, height: originalHeight } = image;
    const inputTensor = await preProcessPoseImage(image);
    const feeds = { 'images': inputTensor };
    const results = await poseSession.run(feeds);
    const keypoints = processPoseOutput(results.output0, originalWidth, originalHeight);
    const canvas = createCanvas(originalWidth, originalHeight);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, originalWidth, originalHeight);
    if (keypoints.length > 0) {
        drawKeypoints(ctx, keypoints);
    }
    return canvas.toBuffer('image/jpeg');
}

// =================================================================
// ## 4. API Endpoints
// =================================================================

// --- FIX: Refactored /generate endpoint with robust resource cleanup and full response logging ---
// Modify the /generate endpoint to handle conversation history
// Update the /generate endpoint to correctly process conversation history
// Update the /generate endpoint to correctly handle alternating conversation roles
app.post(
    '/generate',
    upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]),
    async (req, res) => {
        // --- Define all potential resource variables here to ensure they are accessible in 'finally'
        let image = null;
        let audio = null;
        let inputs = null;
        let tempImagePath = null;
        let imageUrl = null;
        let fullResponse = ''; // Variable to capture the complete response

        try {
            const { text, imageUrl: providedImageUrl } = req.body;
            const imageFile = req.files?.image?.[0];
            const audioFile = req.files?.audio?.[0];
            const conversationJson = req.body.conversation;

            console.log(`Request received: ${text ? 'With text' : 'No text'}, ${imageFile ? 'With image' : 'No image'}, ${audioFile ? 'With audio' : 'No audio'}`);
            console.log(`Conversation history: ${conversationJson ? 'Present' : 'Missing'}`);

            if (!text && !providedImageUrl && !imageFile && !audioFile) {
                return res.status(400).json({ error: "Please provide text, an image, or an audio file." });
            }

            // --- Handle Image Loading ---
            if (imageFile) {
                console.log(`Processing uploaded image: ${imageFile.originalname}`);
                const uploadDir = path.join(__dirname, 'uploads');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                
                // Generate unique filename to avoid conflicts
                const timestamp = Date.now();
                const fileExtension = path.extname(imageFile.originalname);
                const fileName = `${timestamp}-${imageFile.originalname}`;
                tempImagePath = path.join(uploadDir, fileName);
                
                fs.writeFileSync(tempImagePath, imageFile.buffer);
                image = await load_image(tempImagePath);
                
                // Create accessible URL for the uploaded image
                imageUrl = `http://localhost:${port}/uploads/${fileName}`;
                console.log(`📸 Image accessible at: ${imageUrl}`);
                
            } else if (providedImageUrl) {
                console.log(`Loading image from URL: ${providedImageUrl}`);
                image = await load_image(providedImageUrl);
                imageUrl = providedImageUrl;
            }

            // --- Handle Audio Loading ---
            if (audioFile) {
                console.log(`Processing uploaded audio: ${audioFile.originalname}`);
                audio = await processAudio(audioFile.buffer);
            }

            // --- Process Conversation History ---
            let rawConversation = [];
            if (conversationJson) {
                try {
                    rawConversation = JSON.parse(conversationJson);
                    console.log(`📚 Successfully parsed conversation history with ${rawConversation.length} messages`);
                    
                    // Log the first few messages for debugging
                    if (rawConversation.length > 0) {
                        console.log("First message:", JSON.stringify(rawConversation[0]));
                        if (rawConversation.length > 1) {
                            console.log("Last message:", JSON.stringify(rawConversation[rawConversation.length - 1]));
                        }
                    }
                } catch (error) {
                    console.error("❌ Failed to parse conversation history:", error);
                    rawConversation = [];
                }
            }

            // --- Fix: Ensure proper alternating user/assistant messages ---
            const messages = [];

            // Simple but robust approach to ensure alternating roles
            if (rawConversation.length === 0) {
                // If no history, just add the current user message
                console.log("📝 No conversation history, creating a new conversation");
                
                const currentUserContent = [];
                if (image) currentUserContent.push({ type: "image" });
                if (audio) currentUserContent.push({ type: "audio" });
                if (text) currentUserContent.push({ type: "text", text });
                
                messages.push({
                    role: "user",
                    content: currentUserContent
                });
                
                console.log("🔄 Final message count being sent to model: 1");
                console.log("Role sequence: user");
            } 
            else {
                // Force alternating roles by rebuilding the conversation
                let expectedRole = "user";
                
                // Process each message in the history
                for (let i = 0; i < rawConversation.length; i++) {
                    const msg = rawConversation[i];
                    
                    // If role doesn't match what we expect, insert a placeholder
                    if (msg.role !== expectedRole) {
                        console.log(`⚠️ Found unexpected ${msg.role} message, inserting placeholder ${expectedRole} message`);
                        messages.push({
                            role: expectedRole,
                            content: [{ type: "text", text: "" }]
                        });
                    }
                    
                    // Add the current message
                    messages.push({
                        role: msg.role,
                        content: [{ type: "text", text: msg.content || "" }]
                    });
                    
                    // Update expected role for next iteration
                    expectedRole = (msg.role === "user") ? "assistant" : "user";
                }
                
                // Before adding the current message, ensure we're expecting a user message
                if (expectedRole !== "user") {
                    console.log("⚠️ Last message was a user message, inserting placeholder assistant message");
                    messages.push({
                        role: "assistant",
                        content: [{ type: "text", text: "" }]
                    });
                }
                
                // Add the current user message with any media
                const currentUserContent = [];
                if (image) currentUserContent.push({ type: "image" });
                if (audio) currentUserContent.push({ type: "audio" });
                if (text) currentUserContent.push({ type: "text", text });
                
                messages.push({
                    role: "user",
                    content: currentUserContent
                });
                
                console.log(`🔄 Final message count being sent to model: ${messages.length}`);
                console.log("Role sequence:", messages.map(m => m.role).join(", "));
            }
            
            // Format the messages using the chat template
            const prompt = processor.apply_chat_template(messages, { add_generation_prompt: true });
            
            // DEBUG - Print a portion of the prompt to verify structure
            console.log("🔍 Prompt structure (first 500 chars):", prompt.substring(0, 500) + "...");

            // This creates the tensors that MUST be disposed of later
            inputs = await processor(prompt, image, audio, { add_special_tokens: false });
            
            // --- Set headers before any response is sent ---
            if (imageUrl && imageFile) {
                res.setHeader('Content-Type', 'application/json');
            } else {
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            }
            res.setHeader('Transfer-Encoding', 'chunked');

            // --- Send initial metadata if image was uploaded ---
            if (imageUrl && imageFile) {
                res.write(JSON.stringify({ 
                    type: 'metadata', 
                    imageUrl: imageUrl,
                    message: 'Processing...\n\n'
                }) + '\n');
            }

            const streamer = new TextStreamer(processor.tokenizer, {
                skip_prompt: true,
                skip_special_tokens: true,
                callback_function: (chunk) => {
                    // Capture each chunk to build the full response
                    fullResponse += chunk;
                    // Send chunk to client
                    if (imageUrl && imageFile) {
                        // Send as JSON chunk for clients that need to parse metadata
                        res.write(JSON.stringify({ type: 'chunk', data: chunk }) + '\n');
                    } else {
                        res.write(chunk);
                    }
                },
            });
            
            await model.generate({
                ...inputs,
                max_new_tokens: `32000`,
                do_sample: false,
                streamer: streamer,
            });

            // Send final metadata if image was uploaded
            if (imageUrl && imageFile) {
                res.write(JSON.stringify({ 
                    type: 'complete', 
                    imageUrl: imageUrl,
                    fullResponse: fullResponse
                }) + '\n');
            }

        } catch (error) {
            console.error("❌ Error during generation:", error);
            if (!res.headersSent) {
                res.status(500).json({ error: "An internal server error occurred during generation." });
            } else {
                // If headers are already sent, try to send error as part of the stream
                try {
                    if (imageUrl && imageFile) {
                        res.write(JSON.stringify({ 
                            type: 'error', 
                            error: error.message 
                        }) + '\n');
                    } else {
                        res.write("\n\nError: " + error.message);
                    }
                } catch (e) {
                    console.error("Failed to send error in stream:", e);
                }
            }
        } finally {
            console.log("🧹 Cleaning up resources...");
            
            // --- Log the full Gemma response ---
            if (fullResponse.trim()) {
                console.log("\n" + "=".repeat(80));
                console.log("📝 FULL GEMMA RESPONSE:");
                console.log("=".repeat(80));
                console.log(fullResponse);
                console.log("=".repeat(80) + "\n");
            }
            
            // --- Explicitly dispose of all tensors to prevent memory leaks ---
            if (inputs) {
                console.log("🗑️ Disposing of model input tensors...");
                for (const key in inputs) {
                    if (inputs[key] && typeof inputs[key].dispose === 'function') {
                        inputs[key].dispose();
                    }
                }
                console.log("✅ Tensors disposed.");
            }
            
            // Release memory-intensive variables for garbage collection
            image = null;
            audio = null;
            inputs = null;
            fullResponse = ''; // Clear the response variable

            // Ensure the response stream is properly closed
            if (res.writable && !res.writableEnded) {
                res.end();
            }
            console.log("✅ Cleanup complete. Server is ready for the next request.");
        }
    }
);

// --- Health check endpoint ---
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'AI Core is online.',
        models: {
            gemma_vision: { loaded: !!model, path: LOCAL_MODEL_PATH },
            pose_estimation: { loaded: !!poseSession, path: POSE_MODEL_PATH }
        }
    });
});

// --- Pose estimation endpoint ---
app.post('/pose-estimation', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No image file uploaded." });
    }
    try {
        const finalImageBuffer = await getPoseEstimationFrame(req.file.buffer);
        res.setHeader('Content-Type', 'image/jpeg');
        res.send(finalImageBuffer);
    } catch (error) {
        console.error("Error during HTTP pose estimation:", error);
        res.status(500).json({ error: "An internal server error occurred during pose estimation." });
    }
});



app.post(
    '/ocrgenerate',
    upload.single('image'),
    async (req, res) => {
        let inputs = null;
        let tempImagePath = null;
        let imageUrl = null;
        let fullResponse = '';
        let image = null;

        try {
            const { prompt } = req.body;
            const imageFile = req.file;

            console.log(`OCR Request received: ${prompt ? 'With prompt' : 'No prompt'}, ${imageFile ? 'With image' : 'No image'}`);

            if (!imageFile) {
                return res.status(400).json({ error: "Please provide an image file for OCR processing." });
            }

            if (!prompt) {
                return res.status(400).json({ error: "Please provide a prompt to combine with the OCR text." });
            }

            // --- Process uploaded image ---
            console.log(`Processing uploaded image for OCR: ${imageFile.originalname}`);
            const uploadDir = path.join(__dirname, 'uploads');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            // Generate unique filename to avoid conflicts
            const timestamp = Date.now();
            const fileExtension = path.extname(imageFile.originalname);
            const fileName = `ocr-${timestamp}-${imageFile.originalname}`;
            tempImagePath = path.join(uploadDir, fileName);
            
            fs.writeFileSync(tempImagePath, imageFile.buffer);
            
            // Create accessible URL for the uploaded image
            imageUrl = `http://localhost:${port}/uploads/${fileName}`;
            console.log(`📸 Image accessible at: ${imageUrl}`);

            // --- Perform OCR on the image ---
            console.log("🔍 Starting OCR processing...");
            const ocrResult = await Tesseract.recognize(imageFile.buffer, 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });

            const extractedText = ocrResult.data.text.trim();
            console.log("✅ OCR completed");
            console.log(`📝 Extracted text length: ${extractedText.length} characters`);
            
            if (extractedText.length === 0) {
                console.log("⚠️ No text extracted from image");
            } else {
                console.log("📄 Extracted text preview:", extractedText.substring(0, 200) + "...");
            }

            // --- Combine OCR text with user prompt ---
            const combinedMessage = extractedText.length > 0 
                ? `Here is the text I extracted from the image:\n\n"${extractedText}"\n\nUser request: ${prompt}`
                : `I couldn't extract any text from the image. User request: ${prompt}`;

            console.log("🔄 Combined message created, sending to model...");

            // --- Prepare message for the model ---
            const messages = [{
                role: "user",
                content: [{ type: "text", text: combinedMessage }]
            }];

            // Format the messages using the chat template
            const modelPrompt = processor.apply_chat_template(messages, { add_generation_prompt: true });

            // Create model inputs
            inputs = await processor(modelPrompt, null, null, { add_special_tokens: false });
            
            // --- Set response headers ---
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Transfer-Encoding', 'chunked');

            // --- Send initial metadata ---
            res.write(JSON.stringify({ 
                type: 'metadata', 
                imageUrl: imageUrl,
                extractedText: extractedText,
                extractedTextLength: extractedText.length,
                message: 'OCR completed, generating response...\n\n'
            }) + '\n');

            // --- Stream the model response ---
            const streamer = new TextStreamer(processor.tokenizer, {
                skip_prompt: true,
                skip_special_tokens: true,
                callback_function: (chunk) => {
                    fullResponse += chunk;
                    res.write(JSON.stringify({ type: 'chunk', data: chunk }) + '\n');
                },
            });
            
            await model.generate({
                ...inputs,
                max_new_tokens: 32000,
                do_sample: false,
                streamer: streamer,
            });

            // Send completion metadata
            res.write(JSON.stringify({ 
                type: 'complete', 
                imageUrl: imageUrl,
                extractedText: extractedText,
                extractedTextLength: extractedText.length,
                fullResponse: fullResponse
            }) + '\n');

        } catch (error) {
            console.error("❌ Error during OCR generation:", error);
            if (!res.headersSent) {
                res.status(500).json({ error: "An internal server error occurred during OCR processing." });
            } else {
                try {
                    res.write(JSON.stringify({ 
                        type: 'error', 
                        error: error.message 
                    }) + '\n');
                } catch (e) {
                    console.error("Failed to send error in stream:", e);
                }
            }
        } finally {
            console.log("🧹 Cleaning up OCR resources...");
            
            // --- Log the full response ---
            if (fullResponse.trim()) {
                console.log("\n" + "=".repeat(80));
                console.log("📝 FULL OCR + GEMMA RESPONSE:");
                console.log("=".repeat(80));
                console.log(fullResponse);
                console.log("=".repeat(80) + "\n");
            }
            
            // --- Dispose of tensors ---
            if (inputs) {
                console.log("🗑️ Disposing of model input tensors...");
                for (const key in inputs) {
                    if (inputs[key] && typeof inputs[key].dispose === 'function') {
                        inputs[key].dispose();
                    }
                }
                console.log("✅ Tensors disposed.");
            }
            
            // Clean up variables
            image = null;
            inputs = null;
            fullResponse = '';

            // Ensure response stream is closed
            if (res.writable && !res.writableEnded) {
                res.end();
            }
            console.log("✅ OCR cleanup complete. Server ready for next request.");
        }
    }
);
// --- Model info endpoint ---
app.get('/model-info', (req, res) => {
    res.json({ gemma: { path: LOCAL_MODEL_PATH, loaded: !!model } });
});

// --- Endpoint to list uploaded images ---
app.get('/uploads/list', (req, res) => {
    try {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            return res.json({ images: [] });
        }
        
        const files = fs.readdirSync(uploadDir);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
        });
        
        const images = imageFiles.map(file => ({
            filename: file,
            url: `http://localhost:${port}/uploads/${file}`,
            uploadTime: fs.statSync(path.join(uploadDir, file)).mtime
        }));
        
        res.json({ images });
    } catch (error) {
        console.error("Error listing uploaded images:", error);
        res.status(500).json({ error: "Failed to list uploaded images" });
    }
});

// =================================================================
// ## 5. Server and WebSocket Initialization
// =================================================================
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('✅ Client connected for real-time pose estimation');

    ws.on('message', async (message) => {
        try {
            // The resources here are scoped to the message event and are garbage collected automatically.
            const processedImageBuffer = await getPoseEstimationFrame(message);
            if (ws.readyState === ws.OPEN) {
                ws.send(processedImageBuffer);
            }
        } catch (e) {
            console.error('❌ Error processing frame via WebSocket:', e.message);
        }
    });

    ws.on('close', () => {
        console.log('🔌 Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

server.listen(port, async () => {
    console.log(`\n🚀 Server starting at http://localhost:${port}`);
    await loadPoseModel();
    console.log("\n✅ All models loaded. Server is ready to accept requests.");
    console.log(`- HTTP Endpoints are active.`);
    console.log(`- WebSocket Endpoint is active at ws://localhost:${port}`);
    console.log(`- Static files served from: http://localhost:${port}/uploads/`);
});