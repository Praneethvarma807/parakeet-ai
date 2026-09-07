import { contextBridge, ipcRenderer } from 'electron'

const api = {
  toggleListening: () => ipcRenderer.send('popup:toggleListening'),
  hide: () => ipcRenderer.send('popup:hide'),
  toggle: () => ipcRenderer.send('popup:toggle'),
  resize: (width: number, height: number) => ipcRenderer.send('popup:resize', { width, height }),
  setMode: (mode: 'full' | 'compact') => ipcRenderer.send('popup:setMode', mode),
  getMode: () => ipcRenderer.invoke('popup:getMode'),
  onTranscript: (callback: (data: { text: string; isFinal: boolean; clear?: boolean }) => void) => {
    const listener = (_e: unknown, data: { text: string; isFinal: boolean; clear?: boolean }) => callback(data)
    ipcRenderer.on('transcript', listener)
    return () => {
      ipcRenderer.removeListener('transcript', listener)
    }
  },
  onState: (callback: (data: { listening?: boolean; transcribing?: boolean }) => void) => {
    const listener = (_e: unknown, data: { listening?: boolean; transcribing?: boolean }) => callback(data)
    ipcRenderer.on('state', listener)
    return () => {
      ipcRenderer.removeListener('state', listener)
    }
  }
}

contextBridge.exposeInMainWorld('parakeetPopup', api)