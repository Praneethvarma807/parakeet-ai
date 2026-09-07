import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { Card, Badge, Spinner, ScoreRing } from '../components/ui'
import type { InterviewFeedback } from '../types'

const TYPE_COLORS: Record<string, 'slate' | 'green' | 'red' | 'blue' | 'yellow' | 'brand'> = {
  technical: 'blue',
  behavioral: 'green',
  hr: 'yellow',
  'system-design': 'brand',
  coding: 'red',
  'project-based': 'slate'
}

export default function InterviewReport() {
  const { id } = useParams<{ id: string }>()
  const sessions = useAppStore((s) => s.sessions)
  const session = sessions.find((s) => s.id === id)

  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)

  useEffect(() => {
    if (!session || session.status !== 'ended') return
    const evaluate = async () => {
      setIsEvaluating(true)
      try {
        const result = await window.parakeet.evaluateInterview(session.id)
        setFeedback(result)
      } catch (err) {
        console.error('Evaluation failed:', err)
      } finally {
        setIsEvaluating(false)
      }
    }
    evaluate()
  }, [session?.id, session?.status])

  if (!session) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400">Session not found.</p>
        <Link to="/history" className="btn-primary mt-4 inline-block">Back to history</Link>
      </div>
    )
  }

  const questions = session.questions || []
  const qCount = questions.length

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/history" className="text-sm text-brand-400 hover:text-brand-300">← Back to history</Link>
        <h1 className="text-2xl font-bold text-white mt-2">{session.jobTitle}</h1>
        <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
          <span>{session.company || 'Company'}</span>
          <span>·</span>
          <span className="capitalize">{session.round}</span>
          <span>·</span>
          <span>{session.experienceLevel}</span>
          <span>·</span>
          <span>{new Date(session.startedAt || session.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {isEvaluating ? (
        <Card className="py-12">
          <Spinner label="Evaluating your interview..." />
        </Card>
      ) : feedback ? (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-8">
              <ScoreRing score={feedback.overallScore} size={120} />
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-3 text-lg">Performance Summary</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Communication</div>
                    <div className="text-2xl font-bold text-blue-400">{feedback.communication}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Technical</div>
                    <div className="text-2xl font-bold text-brand-400">{feedback.technical}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Relevance</div>
                    <div className="text-2xl font-bold text-emerald-400">{feedback.relevance}%</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 text-sm text-slate-400">
                  <span>{feedback.questionsAsked} questions asked</span>
                  <span>·</span>
                  <span>Avg answer: ~{Math.round(feedback.averageAnswerLength / 5)}wpm</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <h3 className="font-semibold text-white mb-3">✅ Strengths</h3>
              {feedback.strengths.length > 0 ? (
                <ul className="space-y-2">
                  {feedback.strengths.map((s: string, i: number) => (
                    <li key={i} className="text-sm text-slate-300 flex gap-2">
                      <span className="text-emerald-400 shrink-0">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Practice more to identify strengths.</p>
              )}
            </Card>
            <Card>
              <h3 className="font-semibold text-white mb-3">📈 Improvements</h3>
              {feedback.improvements.length > 0 ? (
                <ul className="space-y-2">
                  {feedback.improvements.map((s: string, i: number) => (
                    <li key={i} className="text-sm text-slate-300 flex gap-2">
                      <span className="text-yellow-400 shrink-0">▶</span>
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Great work - no major gaps identified.</p>
              )}
            </Card>
          </div>

          <Card>
            <h3 className="font-semibold text-white mb-3">💡 Recommendations</h3>
            <ol className="space-y-2 list-decimal list-inside">
              {feedback.recommendations.map((r: string, i: number) => (
                <li key={i} className="text-sm text-slate-300">{r}</li>
              ))}
            </ol>
          </Card>

          {feedback.followUpQuestions.length > 0 && (
            <Card>
              <h3 className="font-semibold text-white mb-3">🔄 Follow-up Practice Questions</h3>
              <div className="space-y-2">
                {feedback.followUpQuestions.map((q: string, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-800 text-sm text-slate-300">
                    Q{i + 1}. {q}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : qCount === 0 ? (
        <Card className="py-12 text-center">
          <div className="text-4xl mb-3">📝</div>
          <h3 className="text-white font-medium mb-2">No questions recorded</h3>
          <p className="text-sm text-slate-400 mb-4">This session ended before any questions were captured.</p>
          <Link to="/new" className="btn-primary">Start a new practice</Link>
        </Card>
      ) : (
        <Card className="py-12 text-center">
          <div className="text-4xl mb-3">⏳</div>
          <h3 className="text-white font-medium mb-2">Session in progress</h3>
          <p className="text-sm text-slate-400 mb-4">End the session to generate your full report.</p>
          <Link to={`/session/${session.id}`} className="btn-secondary">Back to session</Link>
        </Card>
      )}

      {qCount > 0 && (
        <Card className="mt-6">
          <h3 className="font-semibold text-white mb-4">Q&A Review</h3>
          <div className="space-y-4">
            {questions.map((q, i) => {
              const answer = q.answers?.[0]
              return (
                <div key={q.id} className="p-4 rounded-lg bg-slate-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-brand-600/20 text-brand-300 text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    <span className="text-sm text-white">{q.question}</span>
                    <Badge color={TYPE_COLORS[q.questionType] || 'slate'}>{q.questionType}</Badge>
                    <Badge>{q.difficulty}</Badge>
                  </div>
                  {answer ? (
                    <div className="text-sm text-slate-400 mt-2">
                      {answer.answer.slice(0, 300)}
                      {answer.answer.length > 300 && '...'}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600 mt-2">No answer recorded.</div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}