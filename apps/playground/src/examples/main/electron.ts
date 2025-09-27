// Electron App Example - TypeScript exercises
import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { readFile, writeFile, existsSync } from 'fs/promises'
import { watch } from 'chokidar'

// Type definitions
interface AppConfig {
  theme: 'light' | 'dark' | 'auto'
  windowState: {
    width: number
    height: number
    x?: number
    y?: number
    maximized: boolean
  }
  recentFiles: string[]
  autoSave: boolean
  fontSize: number
}

interface FileInfo {
  path: string
  name: string
  size: number
  modified: Date
  content?: string
}

interface SearchResult {
  file: string
  line: number
  column: number
  text: string
  match: string
}

// Global state
let mainWindow: BrowserWindow | null = null
let config: AppConfig = {
  theme: 'auto',
  windowState: {
    width: 1200,
    height: 800,
    maximized: false,
  },
  recentFiles: [],
  autoSave: true,
  fontSize: 14,
}

// Utility functions
const getConfigPath = (): string => {
  return join(app.getPath('userData'), 'config.json')
}

const loadConfig = async (): Promise<void> => {
  try {
    const configPath = getConfigPath()
    if (existsSync(configPath)) {
      const configData = await readFile(configPath, 'utf-8')
      config = { ...config, ...JSON.parse(configData) }
    }
  } catch (error) {
    console.error('Failed to load config:', error)
  }
}

const saveConfig = async (): Promise<void> => {
  try {
    const configPath = getConfigPath()
    await writeFile(configPath, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('Failed to save config:', error)
  }
}

const createWindow = (): void => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: config.windowState.width,
    height: config.windowState.height,
    x: config.windowState.x,
    y: config.windowState.y,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: join(__dirname, 'preload.js'),
    },
  })

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()

    if (config.windowState.maximized) {
      mainWindow?.maximize()
    }
  })

  // Handle window state changes
  mainWindow.on('resize', () => {
    if (mainWindow && !mainWindow.isMaximized()) {
      const [width, height] = mainWindow.getSize()
      config.windowState.width = width
      config.windowState.height = height
    }
  })

  mainWindow.on('move', () => {
    if (mainWindow && !mainWindow.isMaximized()) {
      const [x, y] = mainWindow.getPosition()
      config.windowState.x = x
      config.windowState.y = y
    }
  })

  mainWindow.on('maximize', () => {
    config.windowState.maximized = true
  })

  mainWindow.on('unmaximize', () => {
    config.windowState.maximized = false
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Menu setup
const createMenu = (): void => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu-new-file')
          },
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow!, {
              properties: ['openFile'],
              filters: [
                {
                  name: 'Text Files',
                  extensions: ['txt', 'md', 'js', 'ts', 'json'],
                },
                { name: 'All Files', extensions: ['*'] },
              ],
            })

            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow?.webContents.send(
                'menu-open-file',
                result.filePaths[0]
              )
            }
          },
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu-save-file')
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// IPC handlers
const setupIpcHandlers = (): void => {
  // Get app config
  ipcMain.handle('get-config', async (): Promise<AppConfig> => {
    return config
  })

  // Update app config
  ipcMain.handle(
    'update-config',
    async (event, newConfig: Partial<AppConfig>): Promise<void> => {
      config = { ...config, ...newConfig }
      await saveConfig()
    }
  )

  // Read file
  ipcMain.handle(
    'read-file',
    async (event, filePath: string): Promise<FileInfo> => {
      try {
        const content = await readFile(filePath, 'utf-8')
        const stats = await import('fs').then((fs) =>
          fs.promises.stat(filePath)
        )

        return {
          path: filePath,
          name: filePath.split('/').pop() || '',
          size: stats.size,
          modified: stats.mtime,
          content,
        }
      } catch (error) {
        throw new Error(
          `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  )

  // Write file
  ipcMain.handle(
    'write-file',
    async (event, filePath: string, content: string): Promise<void> => {
      try {
        await writeFile(filePath, content, 'utf-8')

        // Add to recent files
        const recentIndex = config.recentFiles.indexOf(filePath)
        if (recentIndex > -1) {
          config.recentFiles.splice(recentIndex, 1)
        }
        config.recentFiles.unshift(filePath)
        config.recentFiles = config.recentFiles.slice(0, 10) // Keep only 10 recent files

        await saveConfig()
      } catch (error) {
        throw new Error(
          `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  )

  // Get recent files
  ipcMain.handle('get-recent-files', async (): Promise<string[]> => {
    return config.recentFiles
  })

  // Search in files
  ipcMain.handle(
    'search-files',
    async (
      event,
      searchTerm: string,
      directory: string
    ): Promise<SearchResult[]> => {
      const results: SearchResult[] = []

      try {
        const watcher = watch(directory, {
          ignored: /(^|[\/\\])\../, // ignore dotfiles
          persistent: false,
        })

        const searchInFile = async (filePath: string): Promise<void> => {
          try {
            const content = await readFile(filePath, 'utf-8')
            const lines = content.split('\n')

            lines.forEach((line, index) => {
              const regex = new RegExp(searchTerm, 'gi')
              let match
              while ((match = regex.exec(line)) !== null) {
                results.push({
                  file: filePath,
                  line: index + 1,
                  column: match.index + 1,
                  text: line.trim(),
                  match: match[0],
                })
              }
            })
          } catch (error) {
            // Skip files that can't be read
          }
        }

        watcher.on('add', searchInFile)
        watcher.on('change', searchInFile)

        // Wait for initial scan
        await new Promise((resolve) => setTimeout(resolve, 1000))
        watcher.close()
      } catch (error) {
        console.error('Search error:', error)
      }

      return results
    }
  )

  // Open external link
  ipcMain.handle('open-external', async (event, url: string): Promise<void> => {
    await shell.openExternal(url)
  })

  // Show save dialog
  ipcMain.handle(
    'show-save-dialog',
    async (
      event,
      options: Electron.SaveDialogOptions
    ): Promise<string | null> => {
      const result = await dialog.showSaveDialog(mainWindow!, options)
      return result.canceled ? null : result.filePath || null
    }
  )

  // Show open dialog
  ipcMain.handle(
    'show-open-dialog',
    async (
      event,
      options: Electron.OpenDialogOptions
    ): Promise<string[] | null> => {
      const result = await dialog.showOpenDialog(mainWindow!, options)
      return result.canceled ? null : result.filePaths
    }
  )
}

// App event handlers
app.whenReady().then(async () => {
  await loadConfig()
  createWindow()
  createMenu()
  setupIpcHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await saveConfig()
})

// Handle protocol for deep linking
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('electron-app', process.execPath, [
      process.argv[1],
    ])
  }
} else {
  app.setAsDefaultProtocolClient('electron-app')
}

// Export for testing
export { config, mainWindow }
