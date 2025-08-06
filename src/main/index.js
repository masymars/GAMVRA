import { app, BrowserWindow, shell, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { spawn } from 'child_process' // Correctly import 'spawn'
import path from 'path'

// Global reference to the main window and the spawned process
// to prevent them from being garbage collected.
let mainWindow
let gemmaServer

/**
 * Starts the background gemma.js server process using spawn.
 * This function contains all the logic for spawning the process
 * and setting up listeners for its output, errors, and lifecycle.
 */
function startGemmaServer() {
  // Prevent starting the server if it's already running
  if (gemmaServer) {
    console.log('[Gemma Loader]: Server is already running. Aborting new start.')
    return
  }

  // --- Gemma Server Spawning Logic ---
  const gemmaServerPath = is.dev
    ? path.join(__dirname, '../../resources/gemma.js')
    : path.join(process.resourcesPath, 'gemma.js') // Try without /resources/ first

  // Alternative paths to check in production
  const alternativePaths = [
    path.join(process.resourcesPath, 'gemma.js'),
    path.join(process.resourcesPath, 'resources/gemma.js'),
    path.join(process.resourcesPath, 'app/resources/gemma.js'),
    path.join(__dirname, '../resources/gemma.js'),
    path.join(__dirname, '../../resources/gemma.js')
  ]

  // Check if the primary path exists
  const fs = require('fs')
  let finalPath = gemmaServerPath
  let pathExists = fs.existsSync(gemmaServerPath)

  // If primary path doesn't exist in production, try alternatives
  if (!pathExists && !is.dev) {
    for (const altPath of alternativePaths) {
      if (fs.existsSync(altPath)) {
        finalPath = altPath
        pathExists = true
        break
      }
    }
  }

  // Calculate additional paths that the server will use
  const gemmaServerDir = path.dirname(finalPath)
  const uploadsDir = path.join(gemmaServerDir, 'uploads')
  const modelPath = path.join(gemmaServerDir, 'models/gemma-3n-E2B-it-ONNX')
  
  // Simulate what __dirname will be inside gemma.js using ES modules
  const serverDirname = gemmaServerDir

  // Show popup alert with all relevant paths and file existence
  dialog.showMessageBox(mainWindow, {
    type: pathExists ? 'info' : 'error',
    title: 'Gemma Server Paths Debug',
    message: pathExists ? 'Paths Information' : 'FILE NOT FOUND ERROR',
    detail: `Primary Path: ${gemmaServerPath}\n` +
           `File Exists: ${fs.existsSync(gemmaServerPath) ? '✅ YES' : '❌ NO'}\n\n` +
           `Final Path Used: ${finalPath}\n` +
           `Final Path Exists: ${pathExists ? '✅ YES' : '❌ NO'}\n\n` +
           `Server __dirname: ${serverDirname}\n` +
           `Uploads Dir: ${uploadsDir}\n` +
           `Model Path: ${modelPath}\n\n` +
           `Electron __dirname: ${__dirname}\n` +
           `process.resourcesPath: ${process.resourcesPath || 'N/A'}\n` +
           `Environment: ${is.dev ? 'Development' : 'Production'}\n\n` +
           `Alternative paths checked:\n${alternativePaths.map(p => `${fs.existsSync(p) ? '✅' : '❌'} ${p}`).join('\n')}`,
    buttons: ['OK']
  })

  // Don't proceed if file doesn't exist
  if (!pathExists) {
    console.error('[Gemma Loader]: CRITICAL - gemma.js file not found at any expected location')
    dialog.showErrorBox('File Not Found', `Could not find gemma.js server file.\nLooked in:\n${alternativePaths.join('\n')}`)
    return
  }

  console.log(`[Gemma Loader]: Attempting to spawn server from: ${finalPath}`)

  // Find the correct Node.js executable
  let nodeCommand
  
  if (is.dev) {
    // In development, use system node
    nodeCommand = process.platform === 'win32' ? 'node.exe' : 'node'
  } else {
    // In production, try to find Node.js bundled with Electron
    const electronDir = path.dirname(process.execPath)
    
    // Different possible locations of Node.js in Electron bundles
    const possibleNodePaths = [
      // macOS App bundle
      path.join(electronDir, '../Frameworks/Electron Framework.framework/Versions/A/Resources/node'),
      path.join(electronDir, 'node'),
      // Windows
      path.join(electronDir, 'node.exe'),
      // Linux
      path.join(electronDir, 'resources/node'),
      // Fallback to system node (might not work but worth trying)
      'node'
    ]
    
    // Find the first existing Node.js executable
    const fs = require('fs')
    nodeCommand = 'node' // fallback
    
    for (const nodePath of possibleNodePaths) {
      if (fs.existsSync(nodePath)) {
        nodeCommand = nodePath
        console.log(`[Gemma Loader]: Found Node.js at: ${nodePath}`)
        break
      }
    }
    
    console.log(`[Gemma Loader]: Checked Node.js paths: ${possibleNodePaths.map(p => fs.existsSync(p) ? '✅' : '❌').join(', ')}`)
  }

  const spawnArgs = [finalPath]
  
  console.log(`[Gemma Loader]: Using Node command: ${nodeCommand}`)
  console.log(`[Gemma Loader]: Electron execPath: ${process.execPath}`)
  console.log(`[Gemma Loader]: Spawn arguments: ${JSON.stringify(spawnArgs)}`)

  try {
    // Spawn the server process
    gemmaServer = spawn(nodeCommand, spawnArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' }
    })
  } catch (error) {
    console.error('[Gemma Loader]: CRITICAL - Failed to spawn gemma.js process.', error)
    dialog.showErrorBox('Fatal Error', 'Could not start the backend server. The application will now close.')
    app.quit()
    return
  }

  // Attach listeners to the spawned process's streams and events.
  // This is crucial for debugging and lifecycle management.

  // Listen for data from the server's standard output
  gemmaServer.stdout.on('data', (data) => {
    // Trim to remove trailing newlines for cleaner logs
    console.log(`[Gemma Server LOG]: ${data.toString().trim()}`)
  })

  // Listen for data from the server's standard error
  gemmaServer.stderr.on('data', (data) => {
    console.error(`[Gemma Server ERROR]: ${data.toString().trim()}`)
  })

  // Handle errors in the spawning process itself (e.g., command not found)
  gemmaServer.on('error', (err) => {
    console.error('[Gemma Loader]: Process reported a fatal spawn error.', err)
    
    // Show detailed error information
    dialog.showErrorBox('Backend Spawn Error', 
      `Failed to start the backend server.\n\n` +
      `Error: ${err.message}\n` +
      `Code: ${err.code || 'Unknown'}\n` +
      `Path: ${finalPath}\n` +
      `Node Command: ${nodeCommand}\n\n` +
      `Possible causes:\n` +
      `• Node.js not found in PATH\n` +
      `• File permissions issue\n` +
      `• ES module compatibility\n` +
      `• Missing dependencies`
    )
    gemmaServer = null // Clear the reference
  })

  // Handle the server process exiting
  gemmaServer.on('close', (code) => {
    console.log(`[Gemma Server]: Process exited with code ${code}`)
    // Notify the user if the server stops unexpectedly while the app is running.
    if (code !== 0 && mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox(
        'Backend Process Closed',
        `The backend server process stopped unexpectedly with exit code: ${code}. Please restart the application.`
      )
    }
    gemmaServer = null // Reset server reference when it closes
  })

  console.log('[Gemma Loader]: Server process spawned successfully and listeners are attached.')
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: is.dev 
        ? join(__dirname, '../preload/index.js') 
        : join(__dirname, '../../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    console.log('[Electron App]: UI is visible. Starting the server.')
    startGemmaServer()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    // Use the absolute path for production build - make sure we're looking in the 'out' directory
    const rendererPath = join(__dirname, '../renderer/index.html')
    console.log(`[Electron App]: Loading renderer from: ${rendererPath}`)
    // Add a hash to force it to load the home route
    mainWindow.loadFile(rendererPath, { hash: '/home' })
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron.gemma-app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Ensure the server process is killed when the app quits.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit() // This will trigger the 'will-quit' event
  }
})

app.on('will-quit', () => {
  if (gemmaServer) {
    console.log('[Electron App]: App is quitting. Killing Gemma server process.')
    gemmaServer.kill()
  }
})
