import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/new', label: 'New Interview', icon: '🎤' },
  { to: '/coding', label: 'Coding Practice', icon: '💻' },
  { to: '/resumes', label: 'Resume', icon: '📄' },
  { to: '/history', label: 'History', icon: '📊' },
  { to: '/settings', label: 'Settings', icon: '⚙️' }
]

export default function DashboardLayout() {
  const user = useAppStore((s) => s.user)
  const sessions = useAppStore((s) => s.sessions)

  const activeSessions = sessions.filter((s) => s.status === 'active').length

  return (
    <div className="flex min-h-screen bg-slate-950">
      <aside className="w-60 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-5 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-lg font-bold">
              🦜
            </div>
            <div>
              <div className="font-bold text-white leading-tight">Parakeet AI</div>
              <div className="text-xs text-slate-400">Interview Prep</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {item.to === '/new' && activeSessions > 0 ? (
                <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center font-bold text-sm">
              {(user?.name || 'U').charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.name || 'User'}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email || ''}</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}