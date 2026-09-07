import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { Card, Badge } from '../components/ui'
import type { InterviewRound, InterviewSession } from '../types'

const ROUNDS: { value: InterviewRound; label: string }[] = [
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'hr', label: 'HR' },
  { value: 'system-design', label: 'System Design' },
  { value: 'coding', label: 'Coding' },
  { value: 'project-based', label: 'Project-Based' }
]

const EXPERIENCE_LEVELS = ['Entry', '1-2 years', '3-5 years', '5-8 years', '8+ years']
const LANGUAGES = ['en', 'hi', 'es', 'fr', 'de', 'ta', 'te', 'ja', 'ko']

export default function NewInterview() {
  const navigate = useNavigate()
  const resumes = useAppStore((s) => s.resumes)
  const addSession = useAppStore((s) => s.addSession)
  const saveSession = useAppStore((s) => s.saveSession)

  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [round, setRound] = useState<InterviewRound>('technical')
  const [experienceLevel, setExperienceLevel] = useState('3-5 years')
  const [resumeId, setResumeId] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [answerStyle, setAnswerStyle] = useState<'concise' | 'natural' | 'detailed'>('natural')
  const [language, setLanguage] = useState('en')
  const [jdFile, setJdFile] = useState<string>('')
  const [isCreating, setIsCreating] = useState(false)

  const handleUploadResume = async () => {
    const result = await window.parakeet.selectResumeFile()
    if (result) {
      try {
        const parsed = await window.parakeet.parseResumeFile(result.path)
        setResumeId(parsed.id)
      } catch (err) {
        console.error('Resume parsing failed:', err)
        const parsed = await window.parakeet.parseResumeText(result.content, result.path.split(/[\\/]/).pop() || 'resume.txt')
        setResumeId(parsed.id)
      }
    }
  }

  const handleUploadJD = async () => {
    const result = await window.parakeet.selectJobDescriptionFile()
    if (result) {
      setJdFile(result.path)
      setJobDescription(result.content.slice(0, 8000))
    }
  }

  const startSession = async () => {
    if (!jobTitle.trim()) return
    setIsCreating(true)

    const session: InterviewSession = {
      id: crypto.randomUUID(),
      userId: 'local-user',
      jobTitle: jobTitle.trim(),
      company: company.trim(),
      round,
      experienceLevel,
      jobDescription: jobDescription || undefined,
      resumeId: resumeId || undefined,
      status: 'waiting',
      language,
      answerStyle,
      questions: [],
      createdAt: new Date().toISOString()
    }

    await saveSession(session)
    addSession(session)
    await window.parakeet.saveSession(session)
    navigate(`/session/${session.id}`)
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">New Interview</h1>
      <p className="text-slate-400 mb-8">Configure your practice session</p>

      <div className="space-y-6">
        <Card className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Job Title *</label>
              <input
                className="input"
                placeholder="Senior Software Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Company</label>
              <input
                className="input"
                placeholder="Example Technologies"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Interview Round</label>
              <select className="input" value={round} onChange={(e) => setRound(e.target.value as InterviewRound)}>
                {ROUNDS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Experience</label>
              <select
                className="input"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
              >
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Resume</label>
            {resumes.length > 0 || resumeId ? (
              <div className="flex items-center gap-3">
                {resumes.filter((r) => r.id === resumeId).map((r) => (
                  <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <span>📄</span>
                    <span className="text-sm text-emerald-300">{r.filename}</span>
                    <Badge color="green">Parsed</Badge>
                  </div>
                ))}
                {!resumeId && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
                    <span>📄</span>
                    <select
                      className="bg-transparent text-sm focus:outline-none"
                      value={resumeId}
                      onChange={(e) => setResumeId(e.target.value)}
                    >
                      <option value="">Select resume...</option>
                      {resumes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.filename}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button onClick={handleUploadResume} className="text-sm text-brand-400 hover:text-brand-300">
                  Upload new
                </button>
              </div>
            ) : (
              <button onClick={handleUploadResume} className="btn-secondary w-full py-6 flex flex-col items-center gap-2">
                <span className="text-2xl">📄</span>
                <span className="text-sm text-slate-300">Upload Resume (PDF, DOCX, TXT)</span>
                <span className="text-xs text-slate-500">We extract your skills, experience & projects</span>
              </button>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Job Description</label>
              <button onClick={handleUploadJD} className="text-xs text-brand-400 hover:text-brand-300">
                {jdFile ? 'Replace file' : 'Upload JD'}
              </button>
            </div>
            {jdFile && (
              <div className="flex items-center gap-2 mb-2 text-sm text-slate-300">
                <span>📋</span> {jdFile.split(/[\\/]/).pop()}
                <Badge color="blue">Loaded</Badge>
              </div>
            )}
            <textarea
              className="input min-h-[120px] resize-y"
              placeholder="Paste the job description here or upload a file..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Answer Style</label>
              <div className="flex gap-2">
                {(['concise', 'natural', 'detailed'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setAnswerStyle(style)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors capitalize ${
                      answerStyle === style
                        ? 'bg-brand-600/20 border-brand-600/50 text-brand-300'
                        : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Language</label>
              <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <button
          onClick={startSession}
          disabled={!jobTitle.trim() || isCreating}
          className="btn-primary w-full py-3 text-base"
        >
          {isCreating ? 'Creating session...' : 'Start Practice →'}
        </button>
      </div>
    </div>
  )
}