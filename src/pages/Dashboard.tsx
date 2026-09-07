import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { Card, Badge } from '../components/ui'

export default function Dashboard() {
  const user = useAppStore((s) => s.user)
  const sessions = useAppStore((s) => s.sessions)
  const resumes = useAppStore((s) => s.resumes)

  const stats = useMemo(() => {
    const ended = sessions.filter((s) => s.status === 'ended')
    const avgScore = ended.length
      ? Math.round(ended.reduce((acc, s) => acc + (s.questions?.length || 0) * 80, 0) / Math.max(1, ended.length) / 100 * 100)
      : 0
    return {
      totalSessions: sessions.length,
      practiceCount: sessions.filter((s) => s.status === 'ended').length,
      resumeCount: resumes.length,
      avgScore
    }
  }, [sessions, resumes])

  const recent = sessions.slice(0, 4)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back{user?.name !== 'Local User' ? `, ${user?.name.split(' ')[0]}` : ''} 👋
        </h1>
        <p className="text-slate-400 mt-1">Prepare for your next interview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="text-3xl font-bold text-white">{stats.totalSessions}</div>
          <div className="text-sm text-slate-400 mt-1">Total Sessions</div>
        </Card>
        <Card className="p-4">
          <div className="text-3xl font-bold text-white">{stats.practiceCount}</div>
          <div className="text-sm text-slate-400 mt-1">Completed</div>
        </Card>
        <Card className="p-4">
          <div className="text-3xl font-bold text-white">{stats.resumeCount}</div>
          <div className="text-sm text-slate-400 mt-1">Resumes</div>
        </Card>
        <Card className="p-4">
          <div className="text-3xl font-bold text-emerald-400">{stats.avgScore}%</div>
          <div className="text-sm text-slate-400 mt-1">Avg Score</div>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card className="md:col-span-2 p-6 flex flex-col items-start justify-center bg-gradient-to-br from-brand-600/20 to-slate-900 border-brand-600/30">
          <h3 className="text-lg font-semibold text-white mb-2">Ready to practice?</h3>
          <p className="text-sm text-slate-300 mb-5">
            Run a mock interview. Parakeet listens, suggests answers grounded in your resume, and gives you feedback.
          </p>
          <div className="flex gap-3">
            <Link to="/new" className="btn-primary px-6 py-2.5">
              🎤 New Session
            </Link>
            <Link to="/coding" className="btn-secondary px-6 py-2.5">
              💻 Coding Practice
            </Link>
          </div>
        </Card>
        <Card className="p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Quick Stats</h3>
          <div className="space-y-3 flex-1">
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">Resumes uploaded</span>
              <span className="font-medium text-white">{stats.resumeCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">Practice sessions</span>
              <span className="font-medium text-white">{stats.practiceCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">Active now</span>
              <span className="font-medium text-emerald-400">
                {sessions.filter((s) => s.status === 'active').length}
              </span>
            </div>
          </div>
          <Link to="/settings" className="text-sm text-brand-400 hover:text-brand-300 mt-4">
            Configure API keys →
          </Link>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Interviews</h2>
          <Link to="/history" className="text-sm text-brand-400 hover:text-brand-300">
            View all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <Card className="py-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-white font-medium mb-1">No interviews yet</h3>
            <p className="text-sm text-slate-400 mb-4">
              Start your first practice session to see results here.
            </p>
            <Link to="/new" className="btn-primary inline-block">
              Start a session
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {recent.map((session) => (
              <Link
                key={session.id}
                to={`/report/${session.id}`}
                className="card p-4 flex items-center gap-4 hover:border-brand-600/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-600/20 flex items-center justify-center text-lg">
                  🎤
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{session.jobTitle}</div>
                  <div className="text-xs text-slate-500">
                    {session.company} · {session.round} · {new Date(session.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.status === 'active' && <Badge color="green">● LIVE</Badge>}
                  {(session.questions?.length || 0) > 0 && (
                    <span className="text-xs text-slate-500">{session.questions?.length} questions</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}