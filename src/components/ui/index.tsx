export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>
}

export function Badge({
  children,
  color = 'slate'
}: {
  children: React.ReactNode
  color?: 'slate' | 'green' | 'red' | 'blue' | 'yellow' | 'brand'
}) {
  const colors = {
    slate: 'bg-slate-700/50 text-slate-300',
    green: 'bg-emerald-500/15 text-emerald-400',
    red: 'bg-red-500/15 text-red-400',
    blue: 'bg-blue-500/15 text-blue-400',
    yellow: 'bg-yellow-500/15 text-yellow-400',
    brand: 'bg-brand-600/15 text-brand-300'
  }
  return <span className={`badge ${colors[color]}`}>{children}</span>
}

export function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const circumference = 2 * Math.PI * (size / 2 - 5)
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 5}
          fill="none"
          stroke="#1e293b"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 5}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
        {score}%
      </div>
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      {label && <span className="text-sm text-slate-400">{label}</span>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action
}: {
  icon: string
  title: string
  subtitle: string
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400 mb-6">{subtitle}</p>
      {action}
    </div>
  )
}

export const BUTTON_VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger'
}