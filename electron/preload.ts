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
  openExternalLink: (url: string) => ipcRenderer.invoke('app:openExternal', url)
}

contextBridge.exposeInMainWorld('parakeet', api)