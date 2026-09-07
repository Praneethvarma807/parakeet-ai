const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3456

app.use(cors())
app.use(express.json({ limit: '25mb' }))

const dbPath = path.join(__dirname, 'db', 'data.json')

function readDb() {
  try {
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    }
  } catch (err) {
    console.error('Failed to read DB:', err)
  }
  return { sessions: [], resumes: [], users: [] }
}

function writeDb(data) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'parakeet-ai-backend', time: new Date().toISOString() })
})

app.post('/api/interviews', (req, res) => {
  const db = readDb()
  const session = {
    id: req.body.id || `session_${Date.now()}`,
    jobTitle: req.body.jobTitle || 'Untitled',
    company: req.body.company || '',
    round: req.body.round || 'technical',
    experienceLevel: req.body.experienceLevel || '',
    resumeId: req.body.resumeId,
    jobDescription: req.body.jobDescription || '',
    status: 'waiting',
    questions: [],
    createdAt: new Date().toISOString()
  }
  db.sessions.unshift(session)
  writeDb(db)
  res.status(201).json(session)
})

app.get('/api/interviews', (req, res) => {
  const db = readDb()
  res.json(db.sessions)
})

app.get('/api/interviews/:id', (req, res) => {
  const db = readDb()
  const session = db.sessions.find((s) => s.id === req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })
  res.json(session)
})

app.post('/api/interviews/:id/start', (req, res) => {
  const db = readDb()
  const session = db.sessions.find((s) => s.id === req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })
  session.status = 'active'
  session.startedAt = new Date().toISOString()
  writeDb(db)
  res.json(session)
})

app.post('/api/interviews/:id/end', (req, res) => {
  const db = readDb()
  const session = db.sessions.find((s) => s.id === req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })
  session.status = 'ended'
  session.endedAt = new Date().toISOString()
  writeDb(db)
  res.json(session)
})

app.post('/api/transcription', (req, res) => {
  const { sessionId } = req.body
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' })
  const db = readDb()
  const session = db.sessions.find((s) => s.id === sessionId)
  if (session && !session.transcripts) session.transcripts = []
  if (session) session.transcripts.push({
    id: `t_${Date.now()}`,
    text: req.body.transcript || '',
    timestamp: new Date().toISOString()
  })
  writeDb(db)
  res.json({ status: 'ok' })
})

app.post('/api/answers', (req, res) => {
  const db = readDb()
  const session = db.sessions.find((s) => s.id === req.body.sessionId)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const question = {
    id: `q_${Date.now()}`,
    question: req.body.question,
    questionType: req.body.questionType || 'behavioral',
    answers: [
      {
        id: `a_${Date.now()}`,
        answer: req.body.answer || '',
        keyPoints: req.body.keyPoints || []
      }
    ],
    createdAt: new Date().toISOString()
  }
  session.questions = session.questions || []
  session.questions.push(question)
  writeDb(db)

  res.json({
    answer: question.answers[0].answer,
    questionType: question.questionType,
    keyPoints: question.answers[0].keyPoints,
    questionId: question.id
  })
})

app.post('/api/interviews/:id/evaluate', (req, res) => {
  const db = readDb()
  const session = db.sessions.find((s) => s.id === req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const questions = session.questions || []
  const answered = questions.filter((q) => (q.answers || []).length > 0)
  const base = 78

  res.json({
    overallScore: Math.min(98, base + answered.length * 2),
    communication: 82,
    technical: 79,
    relevance: 85,
    questionsAsked: questions.length,
    recommendations: [
      'Give more measurable project outcomes',
      'Explain technical decisions more clearly',
      'Practice system-design trade-off discussions'
    ]
  })
})

app.post('/api/resumes', (req, res) => {
  const db = readDb()
  const resume = {
    id: req.body.id || `resume_${Date.now()}`,
    filename: req.body.filename || 'resume.pdf',
    rawText: req.body.rawText || '',
    skills: req.body.skills || [],
    experience: req.body.experience || [],
    projects: req.body.projects || [],
    education: req.body.education || [],
    technologies: req.body.technologies || [],
    createdAt: new Date().toISOString()
  }
  db.resumes = db.resumes || []
  db.resumes.unshift(resume)
  writeDb(db)
  res.status(201).json(resume)
})

app.get('/api/resumes', (req, res) => {
  const db = readDb()
  res.json(db.resumes || [])
})

app.listen(PORT, () => {
  console.log(`Parakeet AI backend listening on http://localhost:${PORT}`)
})

module.exports = app