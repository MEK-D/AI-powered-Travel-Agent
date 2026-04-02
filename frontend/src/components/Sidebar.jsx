import { useRef, useEffect } from 'react'
import AgentItem from './AgentItem'
import AnimatedLog from './AnimatedLog'
import AgentProgressBar from './AgentProgressBar'

const s = {
  sidebar: {
    width: 320, flexShrink: 0,
    background: '#0d1117',
    borderRight: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  searchPanel: { padding: '20px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  label: { display: 'block', fontSize: '.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 },
  textarea: {
    width: '100%', background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
    color: '#e2e8f0', fontFamily: "'Inter', sans-serif", fontSize: '.88rem',
    padding: '12px 14px', resize: 'none', height: 110, outline: 'none', transition: 'border-color .2s',
  },
  btn: (disabled) => ({
    width: '100%', marginTop: 12, padding: '13px 0', border: 'none', borderRadius: 12,
    background: disabled ? 'rgba(99,102,241,0.35)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: '.98rem', fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : '0 4px 20px rgba(99,102,241,0.38)',
    transition: 'all .3s', opacity: disabled ? .6 : 1, letterSpacing: '.02em',
  }),
  progressPanel: { padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  agentsPanel: { padding: '18px 16px', flex: 1, overflowY: 'auto' },
  panelLabel: { fontSize: '.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 },
  logPanel: { padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', height: 200, display: 'flex', flexDirection: 'column' },
  logScroll: { flex: 1, overflowY: 'auto', fontFamily: "'Courier New', monospace", fontSize: '.72rem', lineHeight: 1.8 },
  logLine: (i, total) => ({ color: i === total - 1 ? '#06b6d4' : '#64748b', padding: '0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }),
}

export default function Sidebar({ prompt, setPrompt, onStart, agents, agentStates, logs, disabled, status }) {
  const logRef = useRef(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  return (
    <aside style={s.sidebar}>
      {/* Search */}
      <div style={s.searchPanel}>
        <label style={s.label}>Your Trip Request</label>
        <textarea
          style={s.textarea}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. I want to fly from Goa to Srinagar for 3 days next week and have great meals..."
          onFocus={e => { e.target.style.borderColor = '#6366f1' }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)' }}
        />
        <button style={s.btn(disabled)} onClick={onStart} disabled={disabled}>
          {disabled ? <><span className="spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', marginRight: 8, verticalAlign: 'middle' }} />Planning...</> : '🚀 Plan My Trip'}
        </button>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>

      {/* Progress */}
      <div style={s.progressPanel}>
        <AgentProgressBar agentStates={agentStates} status={status} />
      </div>

      {/* Agents */}
      <div style={s.agentsPanel}>
        <div style={s.panelLabel}>⚡ Active Agents</div>
        {agents.map(a => (
          <AgentItem key={a.id} agent={a} state={agentStates[a.id] || 'idle'} />
        ))}
      </div>

      {/* Log */}
      <div style={s.logPanel}>
        <div style={s.panelLabel}>📡 Live Agent Log</div>
        <AnimatedLog logs={logs} />
      </div>
    </aside>
  )
}
