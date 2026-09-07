import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

export default function Login() {
  const setUser = useAppStore((s) => s.setUser)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isLocal, setIsLocal] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const user = {
      id: crypto.randomUUID(),
      name: name || 'Local User',
      email: email || 'local@parakeet.local',
      createdAt: new Date().toISOString()
    }
    localStorage.setItem('parakeet_user', JSON.stringify(user))
    setUser(user)
    setTimeout(() => {
      setSaving(false)
      navigate('/')
    }, 300)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/20 via-slate-950 to-emerald-900/10" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-brand-600/30">
            🦜
          </div>
          <h1 className="text-3xl font-bold text-white">Parakeet AI</h1>
          <p className="text-slate-400 mt-2">Your AI interview preparation assistant</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsLocal(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                isLocal
                  ? 'bg-brand-600/20 border-brand-600/50 text-brand-300'
                  : 'border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Local Mode
            </button>
            <button
              type="button"
              onClick={() => setIsLocal(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                !isLocal
                  ? 'bg-brand-600/20 border-brand-600/50 text-brand-300'
                  : 'border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Sign Up
            </button>
          </div>

          {!isLocal ? (
            <div className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" className="input" placeholder="••••••••" required />
              </div>
            </div>
          ) : (
            <div>
              <label className="label">Your Name</label>
              <input
                className="input"
                placeholder="Jane Candidate"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
            {saving ? 'Signing in...' : isLocal ? 'Start Practicing' : 'Create Account'}
          </button>

          <p className="text-xs text-slate-500 text-center">
            Designed for interview practice. Answers are grounded in your resume and are never auto-submitted.
          </p>
        </form>
      </div>
    </div>
  )
}