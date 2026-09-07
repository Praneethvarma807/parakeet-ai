import { Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { Card, EmptyState, Badge } from '../components/ui'

const TYPE_COLORS: Record<string, 'slate' | 'green' | 'red' | 'blue' | 'yellow' | 'brand'> = {
  technical: 'blue',
  behavioral: 'green',
  hr: 'yellow',
  'system-design': 'brand',
  coding: 'red',
  'project-based': 'slate'
}

export default function InterviewHistory() {
  const sessions = useAppStore((s) => s.sessions)

  if (sessions.length === 0) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Card>
          <EmptyState
            icon="📊"
            title="No interview history"
            subtitle="Complete practice sessions to see your history and progress here."
            action={<Link to="/new" className="btn-primary">Start a practice</Link>}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Interview History</h1>
      <p className="text-slate-400 mb-8">Your past practice sessions</p>

      <div className="space-y-4">
        {sessions.map((session) => {
          const qCount = session.questions?.length || 0
          const hasAnswers = session.questions?.some((q) => q.answers?.length) || false
          const statusColor =
            session.status === 'ended' ? 'slate' : session.status === 'active' ? 'green' : 'yellow'

          return (
            <Link key={session.id} to={`/report/${session.id}`} className="card p-5 hover:border-brand-600/40 transition-colors block">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{session.jobTitle}</span>
                    <Badge color={TYPE_COLORS[session.round] || 'slate'}>{session.round}</Badge>
                    <Badge color={statusColor}>
                      {session.status === 'ended' ? 'Completed' : session.status === 'active' ? 'In Progress' : 'Prepared'}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-400">
                    {session.company || 'Company unspecified'} · {session.experienceLevel} ·{' '}
                    {new Date(session.createdAt).toLocaleDateString()}
                    {session.startedAt && ` · Started ${new Date(session.startedAt).toLocaleTimeString()}`}
                    {session.endedAt && ` · Ended ${new Date(session.endedAt).toLocaleTimeString()}`}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-white">{qCount}</div>
                  <div className="text-xs text-slate-500">questions</div>
                </div>
                {hasAnswers && (
                  <div className="text-right shrink-0">
                    <div className="text-sm text-emerald-400 font-medium">Report ready</div>
                    <div className="text-xs text-slate-500 flex items-center justify-end gap-1">
                      View report <span>→</span>
                    </div>
                  </div>
                )}
              </div>

              {qCount > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-1.5">
                  {session.questions!.slice(-5).map((q) => (
                    <span key={q.id} className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded-lg truncate max-w-[240px]">
                      "{q.question.slice(0, 40)}..."
                    </span>
                  ))}
                  {qCount > 5 && <span className="text-xs text-slate-600">+{qCount - 5} more</span>}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}