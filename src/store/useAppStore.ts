import { create } from 'zustand'
import type { Settings, User, Resume, InterviewSession } from '../types'

interface AppState {
  user: User | null
  settings: Settings | null
  resumes: Resume[]
  sessions: InterviewSession[]
  isLoading: boolean
  setLoading: (loading: boolean) => void
  setUser: (user: User | null) => void
  setSettings: (settings: Settings) => void
  setResumes: (resumes: Resume[]) => void
  addResume: (resume: Resume) => void
  removeResume: (id: string) => void
  setSessions: (sessions: InterviewSession[]) => void
  addSession: (session: InterviewSession) => void
  updateSession: (session: InterviewSession) => void
  saveSession: (session: InterviewSession) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  settings: null,
  resumes: [],
  sessions: [],
  isLoading: true,
  setLoading: (loading) => set({ isLoading: loading }),
  setUser: (user) => set({ user }),
  setSettings: (settings) => set({ settings }),
  setResumes: (resumes) => set({ resumes }),
  addResume: (resume) => set((state) => ({ resumes: [resume, ...state.resumes] })),
  removeResume: (id) => set((state) => ({ resumes: state.resumes.filter((r) => r.id !== id) })),
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((state) => ({ sessions: [session, ...state.sessions] })),
  updateSession: (session) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === session.id ? session : s))
    })),
  saveSession: (session) =>
    set((state) => {
      const exists = state.sessions.some((s) => s.id === session.id)
      if (exists) {
        return { sessions: state.sessions.map((s) => (s.id === session.id ? session : s)) }
      }
      return { sessions: [session, ...state.sessions] }
    }),
}))

export default useAppStore