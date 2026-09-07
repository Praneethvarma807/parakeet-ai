declare global {
  interface Window {
    parakeet: {
      getAppInfo: () => Promise<{ version: string; platform: string }>
      getSettings: () => Promise<import('../src/types/index').Settings>
      saveSettings: (settings: import('../src/types/index').Settings) => Promise<void>
      getResumes: () => Promise<import('../src/types/index').Resume[]>
      saveResume: (resume: import('../src/types/index').Resume) => Promise<void>
      deleteResume: (id: string) => Promise<void>
      parseResumeFile: (filePath: string) => Promise<import('../types/index').Resume>
      parseResumeText: (text: string, filename: string) => Promise<import('../types/index').Resume>
      selectResumeFile: () => Promise<{ path: string; content: string } | null>
      selectJobDescriptionFile: () => Promise<{ path: string; content: string } | null>
      checkMicrophonePermission: () => Promise<boolean>
      getSessions: () => Promise<import('../src/types/index').InterviewSession[]>
      saveSession: (session: import('../src/types/index').InterviewSession) => Promise<void>
      startSession: (sessionId: string) => Promise<{ status: string }>
      endSession: (sessionId: string) => Promise<{ status: string }>
      generateAnswer: (payload: {
        question: string
        questionType: string
        context: {
          resumeText?: string
          jobDescription?: string
          previousAnswers?: string[]
        }
      }) => Promise<import('../src/types/index').AIResponse>
      classifyQuestion: (question: string) => Promise<import('../src/types/index').QuestionClassification>
      evaluateInterview: (sessionId: string) => Promise<import('../src/types/index').InterviewFeedback>
      openExternalLink: (url: string) => Promise<void>
      onGlobalShortcut: (callback: (action: string) => void) => () => void
      sendTranscriptToPopup: (data: { text: string; isFinal: boolean }) => void
      setPopupState: (data: { listening?: boolean; transcribing?: boolean }) => void
      showPopup: () => void
      hidePopup: () => void
      togglePopup: () => void
      clearPopupTranscript: () => void
    }
  }

  interface Window {
    parakeetPopup: {
      toggleListening: () => void
      hide: () => void
      toggle: () => void
      resize: (width: number, height: number) => void
      setMode: (mode: 'full' | 'compact') => void
      getMode: () => Promise<string>
      onTranscript: (
        callback: (data: { text: string; isFinal: boolean; clear?: boolean }) => void
      ) => () => void
      onState: (
        callback: (data: { listening?: boolean; transcribing?: boolean }) => void
      ) => () => void
    }
  }
}

export {}