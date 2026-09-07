import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { Settings, Resume, InterviewSession, User } from '../src/types'

interface StoreData {
  settings: Settings
  resumes: Resume[]
  sessions: InterviewSession[]
  users: User[]
  popup: PopupState
}

export interface PopupState {
  x?: number
  y?: number
  mode?: 'full' | 'compact'
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  aiProvider: 'both',
  anthropicApiKey: '',
  openaiApiKey: '',
  deepgramApiKey: '',
  sttProvider: 'browser',
  defaultLanguage: 'en',
  defaultAnswerStyle: 'natural'
}

export class ElectronStore {
  private dataDir: string
  private dataPath: string
  private data: StoreData

  constructor() {
    this.dataDir = path.join(app.getPath('userData'))
    this.dataPath = path.join(this.dataDir, 'data.json')
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true })
    }
    this.data = this.load()
  }

  private load(): StoreData {
    try {
      if (fs.existsSync(this.dataPath)) {
        const raw = fs.readFileSync(this.dataPath, 'utf-8')
        const parsed = JSON.parse(raw)
        return {
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          resumes: parsed.resumes || [],
          sessions: parsed.sessions || [],
          users: parsed.users || [],
          popup: parsed.popup || {}
        }
      }
    } catch (err) {
      console.error('Failed to load store data:', err)
    }
    return {
      settings: { ...DEFAULT_SETTINGS },
      resumes: [],
      sessions: [],
      users: [],
      popup: {}
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (err) {
      console.error('Failed to save store data:', err)
    }
  }

  getSettings(): Settings {
    return this.data.settings
  }

  setSettings(settings: Settings): void {
    this.data.settings = settings
    this.save()
  }

  getResumes(): Resume[] {
    return this.data.resumes
  }

  saveResume(resume: Resume): void {
    const existing = this.data.resumes.findIndex((r) => r.id === resume.id)
    if (existing >= 0) {
      this.data.resumes[existing] = resume
    } else {
      this.data.resumes.push({ ...resume, id: resume.id || uuidv4() })
    }
    this.save()
  }

  deleteResume(id: string): void {
    this.data.resumes = this.data.resumes.filter((r) => r.id !== id)
    this.save()
  }

  getSessions(): InterviewSession[] {
    return this.data.sessions
  }

  getSession(id: string): InterviewSession | undefined {
    return this.data.sessions.find((s) => s.id === id)
  }

  saveSession(session: InterviewSession): void {
    const existing = this.data.sessions.findIndex((s) => s.id === session.id)
    if (existing >= 0) {
      this.data.sessions[existing] = session
    } else {
      this.data.sessions.push({ ...session, id: session.id || uuidv4() })
    }
    this.save()
  }

  getUsers(): User[] {
    return this.data.users
  }

  getPopupState(): PopupState {
    return this.data.popup || {}
  }

  setPopupState(state: PopupState): void {
    this.data.popup = { ...this.data.popup, ...state }
    this.save()
  }

  saveUser(user: User): void {
    const existing = this.data.users.findIndex((u) => u.id === user.id)
    if (existing >= 0) {
      this.data.users[existing] = user
    } else {
      this.data.users.push(user)
    }
    this.save()
  }
}