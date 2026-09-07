import type { ElectronStore } from '../store'
import type { InterviewSession } from '../../src/types'

export class SessionManager {
  private store: ElectronStore

  constructor(store: ElectronStore) {
    this.store = store
  }

  startSession(sessionId: string): InterviewSession {
    const session = this.store.getSession(sessionId)
    if (!session) throw new Error('Session not found')
    const updated: InterviewSession = {
      ...session,
      status: 'active',
      startedAt: new Date().toISOString()
    }
    this.store.saveSession(updated)
    return updated
  }

  pauseSession(sessionId: string): InterviewSession {
    const session = this.store.getSession(sessionId)
    if (!session) throw new Error('Session not found')
    const updated: InterviewSession = {
      ...session,
      status: 'paused'
    }
    this.store.saveSession(updated)
    return updated
  }

  endSession(sessionId: string): InterviewSession {
    const session = this.store.getSession(sessionId)
    if (!session) throw new Error('Session not found')
    const updated: InterviewSession = {
      ...session,
      status: 'ended',
      endedAt: new Date().toISOString()
    }
    this.store.saveSession(updated)
    return updated
  }
}