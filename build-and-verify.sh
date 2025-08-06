#!/bin/bash

# build-and-verify.sh
# Run this script to build and verify your app

echo "🔨 Building the application..."
npm run build

echo "📦 Building the Mac app..."
npm run build:mac

echo "🔍 Verifying the built app..."

# Check if the app was created
APP_PATH="./dist/mac/DR Station.app"
if [ -d "$APP_PATH" ]; then
    echo "✅ App found at: $APP_PATH"
    
    # Check Resources directory
    RESOURCES_PATH="$APP_PATH/Contents/Resources"
    echo "📁 Checking Resources directory: $RESOURCES_PATH"
    
    if [ -d "$RESOURCES_PATH" ]; then
        echo "📋 Contents of Resources directory:"
        ls -la "$RESOURCES_PATH"
        
        # Check for our specific files
        if [ -f "$RESOURCES_PATH/resources/gemma.js" ]; then
            echo "✅ gemma.js found at: $RESOURCES_PATH/resources/gemma.js"
        elif [ -f "$RESOURCES_PATH/gemma.js" ]; then
            echo "✅ gemma.js found at: $RESOURCES_PATH/gemma.js"
        else
            echo "❌ gemma.js NOT FOUND!"
        fi
        
        if [ -d "$RESOURCES_PATH/resources/models" ]; then
            echo "✅ models directory found at: $RESOURCES_PATH/resources/models"
        elif [ -d "$RESOURCES_PATH/models" ]; then
            echo "✅ models directory found at: $RESOURCES_PATH/models"
        else
            echo "❌ models directory NOT FOUND!"
        fi
        
    else
        echo "❌ Resources directory not found!"
    fi
else
    echo "❌ App not found at: $APP_PATH"
fi

echo "✨ Build verification complete!"
