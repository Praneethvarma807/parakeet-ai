import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Card, EmptyState, Badge } from '../components/ui'

export default function ResumeManager() {
  const resumes = useAppStore((s) => s.resumes)
  const addResume = useAppStore((s) => s.addResume)
  const removeResume = useAppStore((s) => s.removeResume)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const handleUpload = async () => {
    setIsParsing(true)
    try {
      const result = await window.parakeet.selectResumeFile()
      if (result) {
        let parsed
        try {
          parsed = await window.parakeet.parseResumeFile(result.path)
        } catch {
          parsed = await window.parakeet.parseResumeText(result.content, result.path.split(/[\\/]/).pop() || 'resume.txt')
        }
        addResume(parsed)
        await window.parakeet.saveResume(parsed)
      }
    } catch (err) {
      console.error('Resume upload failed:', err)
    } finally {
      setIsParsing(false)
    }
  }

  const handlePaste = async () => {
    if (!pasteText.trim()) return
    setIsParsing(true)
    try {
      const parsed = await window.parakeet.parseResumeText(pasteText, 'pasted-resume.txt')
      addResume(parsed)
      await window.parakeet.saveResume(parsed)
      setPasteText('')
    } catch (err) {
      console.error('Resume parsing failed:', err)
    } finally {
      setIsParsing(false)
    }
  }

  const handleDelete = async (id: string) => {
    removeResume(id)
    await window.parakeet.deleteResume(id)
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Resume Manager</h1>
      <p className="text-slate-400 mb-8">
        Your resume powers answer generation. Answers are grounded in your actual experience - never invented.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={handleUpload}
          disabled={isParsing}
          className="card p-6 text-center hover:border-brand-600/40 transition-colors disabled:opacity-50"
        >
          <div className="text-3xl mb-2">📄</div>
          <div className="text-sm font-medium text-white mb-1">Upload File</div>
          <div className="text-xs text-slate-500">PDF, DOCX, TXT, MD</div>
        </button>

        <Card className="p-6">
          <label className="label">Paste resume text</label>
          <textarea
            className="input min-h-[100px] mb-3"
            placeholder="Paste your resume content here..."
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <button onClick={handlePaste} disabled={!pasteText.trim() || isParsing} className="btn-secondary w-full">
            {isParsing ? 'Parsing...' : 'Parse Pasted Text'}
          </button>
        </Card>
      </div>

      {isParsing && (
        <Card className="py-8 text-center mb-8">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Extracting skills, experience, projects...</p>
        </Card>
      )}

      {resumes.length === 0 ? (
        <Card>
          <EmptyState
            icon="🗂"
            title="No resumes yet"
            subtitle="Upload your resume to get personalized, grounded interview answers."
            action={
              <button onClick={handleUpload} className="btn-primary">
                Upload your first resume
              </button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {resumes.map((resume) => (
            <Card key={resume.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white truncate">📄 {resume.filename}</span>
                    <Badge color="green">Parsed</Badge>
                  </div>
                  <div className="text-xs text-slate-500">
                    Uploaded {new Date(resume.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {resume.skills.slice(0, 12).map((skill) => (
                      <span key={skill} className="badge bg-slate-800 text-slate-300 border border-slate-700">
                        {skill}
                      </span>
                    ))}
                    {resume.skills.length > 12 && (
                      <span className="badge bg-slate-800 text-slate-500">
                        +{resume.skills.length - 12} more
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-3">
                    {resume.experience.length} roles · {resume.projects.length} projects ·{' '}
                    {resume.education.length} education entries
                  </div>
                  <button
                    onClick={() => setExpandedId(expandedId === resume.id ? null : resume.id)}
                    className="text-xs text-brand-400 hover:text-brand-300 mt-3"
                  >
                    {expandedId === resume.id ? 'Hide details ↑' : 'View parsed details ↓'}
                  </button>

                  {expandedId === resume.id && (
                    <div className="mt-4 space-y-4 text-sm">
                      {resume.experience.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Experience</div>
                          {resume.experience.map((exp, i) => (
                            <div key={i} className="mb-4">
                              <div className="font-medium text-white">{exp.title}</div>
                              <div className="text-slate-400 text-xs">
                                {exp.company}
                                {exp.duration && ` · ${exp.duration}`}
                              </div>
                              {exp.description && (
                                <div className="text-slate-400 text-xs mt-1">{exp.description.slice(0, 200)}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {resume.projects.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Projects</div>
                          {resume.projects.map((proj, i) => (
                            <div key={i} className="mb-3">
                              <div className="font-medium text-white">{proj.name}</div>
                              <div className="text-slate-400 text-xs">{proj.description}</div>
                              {proj.technologies && proj.technologies.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {proj.technologies.map((t) => (
                                    <span key={t} className="text-xs text-brand-400">{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {resume.education.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Education</div>
                          {resume.education.map((edu, i) => (
                            <div key={i} className="text-slate-300">
                              {edu.degree} - {edu.institution} ({edu.year})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(resume.id)}
                  className="text-red-400 hover:text-red-300 text-sm px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}