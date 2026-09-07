import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { useSTT } from '../hooks/useSTT'
import { Badge, Spinner } from '../components/ui'
import type { AIResponse, QuestionClassification, TranscriptEntry } from '../types'

type SessionStatus = 'waiting' | 'active' | 'paused' | 'ended'

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'Ctrl + Shift + Space', label: 'Start / stop listening' },
  { keys: 'Ctrl + Shift + A', label: 'Generate AI answer' },
  { keys: 'Ctrl + Shift + R', label: 'Regenerate answer' },
  { keys: 'Ctrl + Shift + S', label: 'Show / hide assistant popup' },
  { keys: 'Ctrl + Shift + P', label: 'Pause / resume transcription' },
  { keys: 'Ctrl + Shift + C', label: 'Clear current question' },
  { keys: 'Ctrl + Shift + M', label: 'Toggle microphone' },
  { keys: 'Ctrl + Shift + Q', label: 'End interview session' },
  { keys: 'Ctrl + Shift + H', label: 'Show shortcut help' },
  { keys: 'Esc', label: 'Hide popup' }
]

export default function LiveSession() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const sessions = useAppStore((s) => s.sessions)
  const resumes = useAppStore((s) => s.resumes)
  const updateSession = useAppStore((s) => s.updateSession)

  const session = sessions.find((s) => s.id === id)

  const [status, setStatus] = useState<SessionStatus>(session?.status || 'waiting')
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [classification, setClassification] = useState<QuestionClassification | null>(null)
  const [answer, setAnswer] = useState<AIResponse | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [manualQuestion, setManualQuestion] = useState('')
  const [answerLengthMode, setAnswerLengthMode] = useState<'natural' | 'shorter' | 'technical'>(session?.answerStyle === 'concise' ? 'shorter' : 'natural')
  const [showHelp, setShowHelp] = useState(false)

  const { isListening, isSupported, error: sttError, startListening, stopListening, onTranscript, interimTranscript } = useSTT()

  const shortcutHandlerRef = useRef<(action: string) => void>(() => {})

  useEffect(() => {
    if (!window.parakeet) return
    const off = window.parakeet.onGlobalShortcut((action) => shortcutHandlerRef.current(action))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.parakeet.hidePopup()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      off()
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (!session) {
      navigate('/')
      return
    }
  }, [session, navigate])

  shortcutHandlerRef.current = (action) => {
    switch (action) {
      case 'toggle-listening':
      case 'toggle-microphone':
        if (isListening) stopListening()
        else { window.parakeet?.showPopup(); startListening() }
        break
      case 'generate-answer':
        if (currentQuestion) regenerate()
        else if (manualQuestion.trim()) handleManualSubmit()
        break
      case 'regenerate-answer':
        if (currentQuestion) regenerate()
        break
      case 'pause-transcription':
        if (isListening) stopListening()
        else { window.parakeet?.showPopup(); startListening() }
        break
      case 'clear-question':
        setCurrentQuestion('')
        setAnswer(null)
        setClassification(null)
        window.parakeet?.clearPopupTranscript()
        break
      case 'end-session':
        if (session) endSession()
        break
      case 'show-shortcuts':
        setShowHelp(true)
        break
    }
  }

  const resume = useMemo(() => {
    if (!session?.resumeId) return undefined
    return resumes.find((r) => r.id === session.resumeId)
  }, [session, resumes])

  const getContext = () => ({
    resumeText: resume?.rawText,
    jobDescription: session?.jobDescription,
    previousAnswers: transcript.filter((t) => t.isQuestion).map((t) => t.text)
  })

  useEffect(() => {
    onTranscript(async (text) => {
      const trimmed = text.trim()
      if (!trimmed) return

      const entry: TranscriptEntry = {
        id: crypto.randomUUID(),
        speaker: 'interviewer',
        text: trimmed,
        timestamp: Date.now(),
        isQuestion: /[?？]/.test(trimmed)
      }
      setTranscript((prev) => [...prev, entry])

      if (entry.isQuestion) {
        detectQuestion(trimmed)
      }
    })
  }, [onTranscript, resume, session])

  useEffect(() => {
    if (status !== 'active') return
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(interval)
  }, [status])

  const detectQuestion = async (questionText: string) => {
    setCurrentQuestion(questionText)
    setIsGenerating(true)
    setAnswer(null)

    try {
      const cls = await window.parakeet.classifyQuestion(questionText)
      setClassification(cls)

      const aiResponse = await window.parakeet.generateAnswer({
        question: questionText,
        questionType: cls.type,
        context: getContext()
      })
      setAnswer(aiResponse)
    } catch (err) {
      console.error('Answer generation failed:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleManualSubmit = async () => {
    if (!manualQuestion.trim()) return
    const text = manualQuestion.trim()
    setManualQuestion('')

    const entry: TranscriptEntry = {
      id: crypto.randomUUID(),
      speaker: 'interviewer',
      text,
      timestamp: Date.now(),
      isQuestion: true
    }
    setTranscript((prev) => [...prev, entry])
    detectQuestion(text)
  }

  const regenerate = async () => {
    if (!currentQuestion) return
    setIsGenerating(true)
    setAnswer(null)
    try {
      const cls = classification || (await window.parakeet.classifyQuestion(currentQuestion))
      let question = currentQuestion
      if (answerLengthMode === 'shorter') {
        question = `${currentQuestion} (Also keep the answer under 60 words and very concise.)`
      } else if (answerLengthMode === 'technical') {
        question = `${currentQuestion} (Include technical depth, complexity trade-offs, and concrete implementation details.)`
      }
      const aiResponse = await window.parakeet.generateAnswer({
        question,
        questionType: cls.type,
        context: getContext()
      })
      setAnswer(aiResponse)
    } catch (err) {
      console.error('Regeneration failed:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const saveAnswerToSession = () => {
    if (!session || !currentQuestion || !answer) return

    const currentQuestions = session.questions || []
    const existingIdx = currentQuestions.findIndex((q) => q.question === currentQuestion)
    const now = new Date().toISOString()

    let updated
    if (existingIdx >= 0) {
      updated = {
        ...session,
        questions: currentQuestions.map((q, i) =>
          i === existingIdx
            ? {
                ...q,
                answers: [
                  {
                    id: crypto.randomUUID(),
                    questionId: q.id,
                    answer: answer.answer,
                    keyPoints: answer.keyPoints,
                    confidence: answer.confidence,
                    createdAt: now
                  },
                  ...(q.answers || [])
                ]
              }
            : q
        )
      }
    } else {
      const newQuestion = {
        id: crypto.randomUUID(),
        interviewId: session.id,
        question: currentQuestion,
        questionType: classification?.type || ('behavioral' as const),
        difficulty: classification?.difficulty || ('medium' as const),
        topic: classification?.topic || 'general',
        requiresResumeContext: classification?.requiresResumeContext || false,
        recommendedFramework: classification?.recommendedFramework,
        answers: [
          {
            id: crypto.randomUUID(),
            questionId: '',
            answer: answer.answer,
            keyPoints: answer.keyPoints,
            confidence: answer.confidence,
            createdAt: now
          }
        ],
        createdAt: now
      }
      updated = { ...session, questions: [...currentQuestions, newQuestion] }
    }

    updateSession(updated)
    window.parakeet.saveSession(updated).catch(console.error)
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      window.parakeet?.showPopup()
      startListening()
    }
  }

  const toggleSession = async () => {
    if (!session) return
    let next: SessionStatus
    if (status === 'active') {
      next = 'paused'
      stopListening()
    } else if (status === 'paused') {
      next = 'active'
      window.parakeet?.showPopup()
      startListening()
    } else {
      next = 'active'
      window.parakeet?.showPopup()
    }
    setStatus(next)
    const updated = { ...session, status: next as InterviewSessionStatus }
    updateSession(updated)
    await window.parakeet.saveSession(updated)
  }

  const endSession = async () => {
    if (!session) return
    stopListening()
    setStatus('ended')
    window.parakeet?.hidePopup()
    window.parakeet?.clearPopupTranscript()
    const updated = { ...session, status: 'ended' as const, endedAt: new Date().toISOString() }
    updateSession(updated)
    await window.parakeet.saveSession(updated)
    await window.parakeet.endSession(session.id)
    navigate(`/report/${session.id}`)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (!session) return null

  const lastAnswers = transcript.filter((t) => t.isQuestion).length

  return (
    <div className="h-full flex flex-col">
      <header className="px-8 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-white">{session.jobTitle}</h1>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>{session.company || 'Company'}</span>
            <span>·</span>
            <span className="capitalize">{session.round}</span>
            <span>·</span>
            <span>{session.experienceLevel}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400 font-mono">{formatTime(elapsed)}</span>
          <Badge color={status === 'active' ? 'green' : status === 'paused' ? 'yellow' : 'slate'}>
            {status === 'active' ? '● Live' : status === 'paused' ? '⏸ Paused' : 'Ready'}
          </Badge>
          {status !== 'ended' && (
            <div className="flex gap-2">
              <button
                onClick={toggleSession}
                className="btn-secondary"
              >
                {status === 'active' ? '⏸ Pause' : '▶ Resume'}
              </button>
              <button onClick={endSession} className="btn-danger">
                End Session
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 grid grid-cols-2 gap-4 p-6 overflow-hidden">
        <section className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Live Transcript</h2>
            <div className="flex items-center gap-2">
              {!isSupported ? (
                <Badge color="red">Not supported</Badge>
              ) : (
                <button
                  onClick={toggleListening}
                  className={`btn ${isListening ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                >
                  {isListening ? '⏹ Stop' : '🎙 Listen'}
                </button>
              )}
            </div>
          </div>

          <div className="card flex-1 p-4 overflow-y-auto min-h-0 space-y-3 bg-slate-900/60">
            {sttError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
                {sttError}
              </div>
            )}
            {transcript.length === 0 && !interimTranscript ? (
              <div className="text-center text-sm text-slate-500 py-10">
                <div className="text-3xl mb-2">👂</div>
                Click Listen and speak the question you heard, or paste it below.
              </div>
            ) : (
              <>
                {transcript.map((entry) => (
                  <div key={entry.id} className={entry.isQuestion ? 'question-bubble' : ''}>
                    <div className="text-xs text-slate-500 mb-1">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-200">
                      {entry.text}
                      {entry.isQuestion && <Badge color="brand">question</Badge>}
                    </div>
                  </div>
                ))}
                {interimTranscript && (
                  <div className="px-3 py-2 rounded-lg bg-slate-800/50 text-sm text-slate-500 italic">
                    {interimTranscript}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="input flex-1"
              placeholder="Type or paste the interviewer's question..."
              value={manualQuestion}
              onChange={(e) => setManualQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
            />
            <button onClick={handleManualSubmit} className="btn-primary" disabled={!manualQuestion.trim()}>
              Submit
            </button>
          </div>
        </section>

        <section className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">AI Suggested Response</h2>
            {classification && (
              <Badge color="blue">
                {classification.type} · {classification.difficulty}
              </Badge>
            )}
          </div>

          <div className="card flex-1 p-4 overflow-y-auto min-h-0 bg-slate-900/60">
            {isGenerating ? (
              <Spinner label="Crafting your answer..." />
            ) : answer ? (
              <div className="space-y-4">
                {currentQuestion && (
                  <div className="p-3 rounded-lg bg-brand-600/10 border border-brand-600/30">
                    <div className="text-xs text-brand-300 font-medium mb-1">QUESTION</div>
                    <p className="text-sm text-slate-200">{currentQuestion}</p>
                  </div>
                )}
                <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {answer.answer}
                </div>

                {answer.keyPoints.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 font-medium mb-2">KEY POINTS</div>
                    <div className="flex flex-wrap gap-2">
                      {answer.keyPoints.map((pt: string, i: number) => (
                        <span key={i} className="badge bg-slate-800 text-slate-300 border border-slate-700">
                          {pt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {answer.confidence > 0 && (
                  <div className="text-xs text-slate-500">
                    Confidence: {Math.round(answer.confidence * 100)}%
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button onClick={regenerate} disabled={isGenerating} className="btn-secondary text-sm">
                    🔄 Regenerate
                  </button>
                  <button
                    onClick={() => {
                      setAnswerLengthMode('shorter')
                      regenerate()
                    }}
                    disabled={isGenerating}
                    className="btn-secondary text-sm"
                  >
                    📏 Shorter
                  </button>
                  <button
                    onClick={() => {
                      setAnswerLengthMode('technical')
                      regenerate()
                    }}
                    disabled={isGenerating}
                    className="btn-secondary text-sm"
                  >
                    ⚙️ More Technical
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(answer.answer)
                    }}
                    className="btn-secondary text-sm ml-auto"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-sm text-slate-500 py-10">
                <div className="text-3xl mb-2">🤖</div>
                {currentQuestion ? (
                  'Waiting to generate...'
                ) : (
                  <>
                    Suggested answers will appear here.
                    <br />
                    <span className="text-xs">Grounded in your resume & job description</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 cards">
            <div className="card px-4 py-3 flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                {resume ? <Badge color="green">✓ Resume</Badge> : <Badge color="slate">Resume not added</Badge>}
              </span>
              <span className="flex items-center gap-1.5">
                {session.jobDescription ? <Badge color="green">✓ Job Description</Badge> : <Badge color="slate">No JD</Badge>}
              </span>
              <span className="flex items-center gap-1.5">
                {lastAnswers > 0 ? <Badge color="green">✓ Previous answers</Badge> : <Badge color="slate">No answers yet</Badge>}
              </span>
              <span className="ml-auto">
                {session.language.toUpperCase()} · {session.answerStyle}
              </span>
            </div>
          </div>

          {answer && currentQuestion && (
            <button onClick={saveAnswerToSession} className="btn-primary mt-3 w-full">
              ✓ Save answer to session
            </button>
          )}
        </section>
      </div>

      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowHelp(false)}
        >
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 w-[420px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-white text-xl leading-none px-1"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-800 last:border-0">
                  <span className="text-sm text-slate-300">{s.label}</span>
                  <kbd className="text-xs font-mono bg-slate-800 border border-slate-700 text-slate-400 rounded px-2 py-0.5 shrink-0">{s.keys}</kbd>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4">Shortcuts work globally even when the app is not focused.</p>
          </div>
        </div>
      )}
    </div>
  )
}

type InterviewSessionStatus = 'waiting' | 'active' | 'paused' | 'ended'