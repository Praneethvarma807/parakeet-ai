import { app, BrowserWindow, ipcMain, shell, dialog, globalShortcut } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { ElectronStore } from './store'
import type { PopupState } from './store'
import { AIService } from './services/ai-service'
import { ResumeParser } from './services/resume-parser'
import { SessionManager } from './services/session-manager'
import { FeedbackService } from './services/feedback-service'

let mainWindow: BrowserWindow | null = null
let popupWindow: BrowserWindow | null = null
let store: ElectronStore
let aiService: AIService
let resumeParser: ResumeParser
let sessionManager: SessionManager
let feedbackService: FeedbackService

const isDev = !!process.env.VITE_DEV_SERVER_URL

const POPUP_MIN_W = 280
const POPUP_MIN_H = 56
const POPUP_MAX_W = 420
const POPUP_MAX_H = 260

const SHORTCUT_ACTIONS: Record<string, string> = {
  'CommandOrControl+Shift+Space': 'toggle-listening',
  'CommandOrControl+Shift+A': 'generate-answer',
  'CommandOrControl+Shift+R': 'regenerate-answer',
  'CommandOrControl+Shift+S': 'toggle-popup',
  'CommandOrControl+Shift+P': 'pause-transcription',
  'CommandOrControl+Shift+C': 'clear-question',
  'CommandOrControl+Shift+M': 'toggle-microphone',
  'CommandOrControl+Shift+Q': 'end-session',
  'CommandOrControl+Shift+H': 'show-shortcuts'
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'Parakeet AI - Interview Assistant',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    },
    autoHideMenuBar: true
  })

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

function createPopup(): void {
  const saved = store.getPopupState() as PopupState

  popupWindow = new BrowserWindow({
    width: 360,
    height: saved.mode === 'compact' ? 56 : 130,
    minWidth: POPUP_MIN_W,
    minHeight: POPUP_MIN_H,
    maxWidth: POPUP_MAX_W,
    maxHeight: POPUP_MAX_H,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, 'popup-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  })

  popupWindow.setAlwaysOnTop(true, 'screen-saver')
  popupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (saved.x != null && saved.y != null) {
    popupWindow.setPosition(saved.x, saved.y)
  }

  if (isDev) {
    popupWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL!}popup.html`)
  } else {
    popupWindow.loadFile(join(__dirname, '../dist/popup.html'))
  }

  popupWindow.on('moved', () => {
    if (popupWindow && popupWindow.isVisible()) {
      const [x, y] = popupWindow.getPosition()
      store.setPopupState({ x, y })
    }
  })

  popupWindow.on('close', (e) => {
    e.preventDefault()
    popupWindow?.hide()
  })

  popupWindow.on('closed', () => {
    popupWindow = null
  })
}

function showPopup(): void {
  if (!popupWindow) createPopup()
  popupWindow?.show()
  popupWindow?.moveTop()
}

function hidePopup(): void {
  popupWindow?.hide()
}

function togglePopup(): void {
  if (popupWindow?.isVisible()) {
    hidePopup()
  } else {
    showPopup()
  }
}

function sendToMain(action: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('global-shortcut', action)
  }
}

function handleGlobalAction(action: string): void {
  switch (action) {
    case 'toggle-popup':
      togglePopup()
      break
    case 'show-shortcuts':
      sendToMain('show-shortcuts')
      break
    default:
      sendToMain(action)
  }
}

function registerGlobalShortcuts(): void {
  for (const [accelerator, action] of Object.entries(SHORTCUT_ACTIONS)) {
    const ok = globalShortcut.register(accelerator, () => handleGlobalAction(action))
    if (!ok) {
      console.warn(`Failed to register global shortcut: ${accelerator}`)
    }
  }
}

function initServices(): void {
  store = new ElectronStore()
  aiService = new AIService(store)
  resumeParser = new ResumeParser(store)
  sessionManager = new SessionManager(store)
  feedbackService = new FeedbackService(store, aiService)
}

function registerIpcHandlers(): void {
  ipcMain.handle('app:getInfo', () => ({
    version: app.getVersion(),
    platform: process.platform
  }))

  ipcMain.handle('settings:get', () => store.getSettings())
  ipcMain.handle('settings:save', (_e, settings) => {
    store.setSettings(settings)
  })

  ipcMain.handle('resumes:getAll', () => store.getResumes())
  ipcMain.handle('resumes:save', (_e, resume) => {
    store.saveResume(resume)
  })
  ipcMain.handle('resumes:delete', (_e, id) => {
    store.deleteResume(id)
  })
  ipcMain.handle('resumes:selectFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'md'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const content = fs.readFileSync(filePath, 'utf-8')
    return { path: filePath, content }
  })
  ipcMain.handle('resumes:parseFile', async (_e, filePath) => {
    return resumeParser.parseFile(filePath)
  })
  ipcMain.handle('resumes:parseText', async (_e, text, filename) => {
    return resumeParser.parseText(text, filename)
  })

  ipcMain.handle('docs:selectJobDescription', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'md'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const content = fs.readFileSync(filePath, 'utf-8')
    return { path: filePath, content }
  })

  ipcMain.handle('media:checkMicrophonePermission', async () => {
    const { systemPreferences } = await import('electron')
    if (process.platform === 'darwin') {
      return systemPreferences.getMediaAccessStatus('microphone') !== 'denied'
    }
    return true
  })

  ipcMain.handle('sessions:getAll', () => store.getSessions())
  ipcMain.handle('sessions:save', (_e, session) => {
    store.saveSession(session)
  })
  ipcMain.handle('sessions:start', (_e, sessionId) => {
    sessionManager.startSession(sessionId)
    return { status: 'started' }
  })
  ipcMain.handle('sessions:end', (_e, sessionId) => {
    sessionManager.endSession(sessionId)
    return { status: 'ended' }
  })

  ipcMain.handle('ai:generateAnswer', async (_e, payload) => {
    return aiService.generateAnswer(payload)
  })
  ipcMain.handle('ai:classifyQuestion', async (_e, question) => {
    return aiService.classifyQuestion(question)
  })

  ipcMain.handle('ai:evaluateInterview', async (_e, sessionId) => {
    const session = store.getSession(sessionId)
    if (!session) throw new Error('Session not found')
    return feedbackService.evaluate(session)
  })

  ipcMain.handle('app:openExternal', (_e, url) => {
    shell.openExternal(url)
  })

  // ---- Popup bridge ----
  ipcMain.on('popup:transcript', (_e, data) => {
    popupWindow?.webContents.send('transcript', data)
  })
  ipcMain.on('popup:state', (_e, data) => {
    popupWindow?.webContents.send('state', data)
  })
  ipcMain.on('popup:clear', () => {
    popupWindow?.webContents.send('transcript', { text: '', isFinal: true, clear: true })
  })
  ipcMain.on('popup:toggleListening', () => {
    sendToMain('toggle-listening')
  })
  ipcMain.on('popup:hide', () => {
    hidePopup()
  })
  ipcMain.on('popup:toggle', () => {
    togglePopup()
  })
  ipcMain.on('popup:show', () => {
    showPopup()
  })
  ipcMain.on('popup:resize', (_e, size) => {
    if (!popupWindow || !size) return
    const w = Math.min(POPUP_MAX_W, Math.max(POPUP_MIN_W, Math.round(size.width ?? 360)))
    const h = Math.min(POPUP_MAX_H, Math.max(POPUP_MIN_H, Math.round(size.height ?? 130)))
    popupWindow.setSize(w, h, true)
  })
  ipcMain.on('popup:setMode', (_e, mode) => {
    const saved = store.getPopupState() as PopupState
    store.setPopupState({ ...saved, mode })
  })
  ipcMain.handle('popup:getMode', () => {
    return (store.getPopupState() as PopupState).mode || 'full'
  })
}

app.whenReady().then(() => {
  initServices()
  registerIpcHandlers()
  createWindow()
  createPopup()
  registerGlobalShortcuts()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})