import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('settings:save', settings),
  getResumes: () => ipcRenderer.invoke('resumes:getAll'),
  saveResume: (resume: unknown) => ipcRenderer.invoke('resumes:save', resume),
  deleteResume: (id: string) => ipcRenderer.invoke('resumes:delete', id),
  selectResumeFile: () => ipcRenderer.invoke('resumes:selectFile'),
  parseResumeFile: (filePath: string) => ipcRenderer.invoke('resumes:parseFile', filePath),
  parseResumeText: (text: string, filename: string) =>
    ipcRenderer.invoke('resumes:parseText', text, filename),
  selectJobDescriptionFile: () => ipcRenderer.invoke('docs:selectJobDescription'),
  checkMicrophonePermission: () => ipcRenderer.invoke('media:checkMicrophonePermission'),
  getSessions: () => ipcRenderer.invoke('sessions:getAll'),
  saveSession: (session: unknown) => ipcRenderer.invoke('sessions:save', session),
  startSession: (sessionId: string) => ipcRenderer.invoke('sessions:start', sessionId),
  endSession: (sessionId: string) => ipcRenderer.invoke('sessions:end', sessionId),
  generateAnswer: (payload: unknown) => ipcRenderer.invoke('ai:generateAnswer', payload),
  classifyQuestion: (question: string) => ipcRenderer.invoke('ai:classifyQuestion', question),
  evaluateInterview: (sessionId: string) => ipcRenderer.invoke('ai:evaluateInterview', sessionId),
  openExternalLink: (url: string) => ipcRenderer.invoke('app:openExternal', url),

  // Global shortcuts + listening popup
  onGlobalShortcut: (callback: (action: string) => void) => {
    const listener = (_e: unknown, action: string) => callback(action)
    ipcRenderer.on('global-shortcut', listener)
    return () => {
      ipcRenderer.removeListener('global-shortcut', listener)
    }
  },
  sendTranscriptToPopup: (data: { text: string; isFinal: boolean }) =>
    ipcRenderer.send('popup:transcript', data),
  setPopupState: (data: { listening?: boolean; transcribing?: boolean }) =>
    ipcRenderer.send('popup:state', data),
  showPopup: () => ipcRenderer.send('popup:show'),
  hidePopup: () => ipcRenderer.send('popup:hide'),
  togglePopup: () => ipcRenderer.send('popup:toggle'),
  clearPopupTranscript: () => ipcRenderer.send('popup:clear')
}

contextBridge.exposeInMainWorld('parakeet', api)