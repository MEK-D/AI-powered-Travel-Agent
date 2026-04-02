import { useEffect, useState } from 'react'

const s = {
  item: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px', marginBottom: 8,
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 12, transition: 'all .3s',
  },
  icon: { fontSize: '1.4rem' },
  info: { flex: 1 },
  name: {
    fontFamily: "'Outfit', sans-serif", fontSize: '.9rem', fontWeight: 700,
    color: '#e2e8f0', marginBottom: 2,
  },
  sub: { fontSize: '.75rem', color: '#64748b', lineHeight: 1.3 },
  status: {
    padding: '4px 10px', borderRadius: 20, fontSize: '.7rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.05em',
  },
  statusRunning: {
    background: 'rgba(245,158,11,.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.3)',
  },
  statusDone: {
    background: 'rgba(16,185,129,.15)', color: '#10b981', border: '1px solid rgba(16,185,129,.3)',
  },
  statusError: {
    background: 'rgba(239,68,68,.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,.3)',
  },
  statusIdle: {
    background: 'rgba(99,102,241,.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,.2)',
  },
  pulse: {
    width: 8, height: 8, borderRadius: '50%', background: '#f59e0b',
    animation: 'pulse 2s infinite', marginRight: 4,
  },
}

const STATUS_CONFIG = {
  running: { label: 'Running', style: s.statusRunning },
  done: { label: 'Complete', style: s.statusDone },
  error: { label: 'Error', style: s.statusError },
  idle: { label: 'Idle', style: s.statusIdle },
}

export default function AgentItem({ agent, state }) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (state === 'running') {
      setIsAnimating(true)
    } else {
      setIsAnimating(false)
    }
  }, [state])

  const statusConfig = STATUS_CONFIG[state] || STATUS_CONFIG.idle

  return (
    <div
      style={{
        ...s.item,
        ...(state === 'running' && {
          background: 'rgba(245,158,11,.05)',
          borderColor: 'rgba(245,158,11,.2)',
          boxShadow: '0 0 20px rgba(245,158,11,.1)',
        }),
      }}
    >
      <div style={s.icon}>{agent.icon}</div>
      <div style={s.info}>
        <div style={s.name}>{agent.name}</div>
        <div style={s.sub}>{agent.sub}</div>
      </div>
      <div style={{ ...s.status, ...statusConfig.style }}>
        {state === 'running' && (
          <>
            <span style={s.pulse} />
            <span style={{ display: 'inline-block', marginLeft: 4 }}>{statusConfig.label}</span>
          </>
        )}
        {state !== 'running' && statusConfig.label}
      </div>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
