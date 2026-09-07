import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'path'
import fs from 'fs'
import os from 'os'
import { ElectronStore } from './store'
import { AIService } from './services/ai-service'
import { ResumeParser } from './services/resume-parser'
import { SessionManager } from './services/session-manager'
import { FeedbackService } from './services/feedback-service'

let mainWindow: BrowserWindow | null = null
let store: ElectronStore
let aiService: AIService
let resumeParser: ResumeParser
let sessionManager: SessionManager
let feedbackService: FeedbackService

const isDev = process.env.VITE_DEV_SERVER_URL

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
      sandbox: false
    },
    autoHideMenuBar: true
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
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
}

app.whenReady().then(() => {
  initServices()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})