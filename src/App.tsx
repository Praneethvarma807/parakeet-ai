import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewInterview from './pages/NewInterview'
import LiveSession from './pages/LiveSession'
import ResumeManager from './pages/ResumeManager'
import DashboardLayout from './components/layout/DashboardLayout'
import InterviewHistory from './pages/InterviewHistory'
import InterviewReport from './pages/InterviewReport'
import CodingInterview from './pages/CodingInterview'
import Settings from './pages/Settings'

export default function App() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const setSettings = useAppStore((s) => s.setSettings)
  const setResumes = useAppStore((s) => s.setResumes)
  const setSessions = useAppStore((s) => s.setSessions)
  const isLoading = useAppStore((s) => s.isLoading)
  const setLoading = useAppStore((s) => s.setLoading)

  useEffect(() => {
    const init = async () => {
      try {
        if (window.parakeet) {
          const [settings, resumes, sessions] = await Promise.all([
            window.parakeet.getSettings(),
            window.parakeet.getResumes(),
            window.parakeet.getSessions()
          ])
          setSettings(settings)
          setResumes(resumes)
          setSessions(sessions)
        } else {
          const defaultSettings = {
            theme: 'dark' as const,
            aiProvider: 'both' as const,
            anthropicApiKey: '',
            openaiApiKey: '',
            deepgramApiKey: '',
            sttProvider: 'browser' as const,
            defaultLanguage: 'en',
            defaultAnswerStyle: 'natural' as const
          }
          setSettings(defaultSettings)
        }

        if (!localStorage.getItem('parakeet_user')) {
          localStorage.setItem(
            'parakeet_user',
            JSON.stringify({ id: 'local-user', name: 'Local User', email: 'user@local.dev' })
          )
        }
        const storedUser = localStorage.getItem('parakeet_user')
        if (storedUser) setUser(JSON.parse(storedUser))
      } catch (err) {
        console.error('Failed to initialize app:', err)
      }
      setLoading(false)
    }
    init()
  }, [setLoading, setSettings, setResumes, setSessions, setUser])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-400">Loading Parakeet...</p>
        </div>
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route element={user ? <DashboardLayout /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<NewInterview />} />
          <Route path="/session/:id" element={<LiveSession />} />
          <Route path="/coding" element={<CodingInterview />} />
          <Route path="/resumes" element={<ResumeManager />} />
          <Route path="/history" element={<InterviewHistory />} />
          <Route path="/report/:id" element={<InterviewReport />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  )
}