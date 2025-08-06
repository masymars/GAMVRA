#!/bin/bash

echo "🔧 Dr Station - Complete Setup Script"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the dr/ project root directory"
    exit 1
fi

# Step 1: Install main project dependencies
echo "📦 Installing main project dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install main dependencies"
    exit 1
fi

# Step 2: Install server dependencies
echo "🚀 Installing Gemma server dependencies..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install server dependencies"
    exit 1
fi
cd ..

# Step 3: Check for model files
echo "🔍 Checking for AI model files..."
MODEL_DIR="resources/models/gemma-3n-E2B-it-ONNX"
POSE_MODEL="resources/head.onnx"

if [ ! -d "$MODEL_DIR" ]; then
    echo "⚠️  Warning: Gemma model directory not found at $MODEL_DIR"
    echo "   You'll need to download and place the Gemma model files there"
else
    echo "✅ Gemma model directory found"
fi

if [ ! -f "$POSE_MODEL" ]; then
    echo "⚠️  Warning: Pose detection model not found at $POSE_MODEL"
    echo "   You'll need to download and place the pose model file there"
else
    echo "✅ Pose detection model found"
fi

# Step 4: Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p resources/uploads
echo "✅ Uploads directory ready"

# Step 5: Test server startup (optional)
echo ""
echo "🧪 Would you like to test the server startup? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "🚀 Testing server startup..."
    cd server
    timeout 10s npm start &
    SERVER_PID=$!
    sleep 5
    
    # Test health endpoint
    if curl -s http://localhost:3010/health > /dev/null; then
        echo "✅ Server test successful!"
        kill $SERVER_PID 2>/dev/null
    else
        echo "⚠️  Server started but health check failed (may be due to missing models)"
        kill $SERVER_PID 2>/dev/null
    fi
    cd ..
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Ensure AI model files are in the resources/models/ directory"
echo "2. Run 'npm run dev' to start the full application"
echo "3. Or run 'npm run server:start' to test just the server"
echo ""
echo "For more information, see GEMMA_SERVER_SETUP.md"
