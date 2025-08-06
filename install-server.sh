#!/bin/bash

echo "🚀 Installing Gemma Server dependencies..."

# Navigate to server directory
cd "$(dirname "$0")/server"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing npm packages..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Server dependencies installed successfully!"
    echo "🎉 Gemma Server is ready to run as a standalone process."
else
    echo "❌ Failed to install server dependencies."
    exit 1
fi
