import { useRef, useEffect, useMemo } from 'react'
import AgentItem from './AgentItem'
import AnimatedLog from './AnimatedLog'
import AgentProgressBar from './AgentProgressBar'
import { motion } from 'framer-motion'

const s = {
  sidebar: {
    width: 340, flexShrink: 0,
    background: '#0d1117',
    borderRight: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  searchPanel: { padding: '20px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.2)' },
  label: { display: 'block', fontSize: '.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10 },
  textarea: {
    width: '100%', background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
    color: '#e2e8f0', fontFamily: "'Inter', sans-serif", fontSize: '.88rem',
    padding: '14px 16px', resize: 'none', height: 110, outline: 'none', transition: 'all .3s',
    '&:focus': { borderColor: '#6366f1', boxShadow: '0 0 0 2px rgba(99,102,241,0.2)' },
  },
  btn: (disabled) => ({
    width: '100%', marginTop: 12, padding: '14px 0', border: 'none', borderRadius: 14,
    background: disabled ? 'rgba(99,102,241,0.25)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: '.98rem', fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : '0 10px 20px rgba(99,102,241,0.25)',
    transition: 'all .3s', opacity: disabled ? .7 : 1, letterSpacing: '.02em',
  }),
  progressPanel: { padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  agentsPanel: { padding: '22px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 },
  panelLabel: { fontSize: '.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 12, display: 'flex', justifyContent: 'space-between' },
  phaseGroup: { marginBottom: 10 },
  logPanel: { padding: '16px 22px', borderTop: '1px solid rgba(255,255,255,0.07)', height: 220, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' },
}

export default function Sidebar({ prompt, setPrompt, onStart, agents, agentStates, logs, disabled, status }) {
  const logRef = useRef(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  const agentsByPhase = useMemo(() => {
    const groups = {}
    agents.forEach(a => {
      groups[a.phase] = groups[a.phase] || []
      groups[a.phase].push(a)
    })
    return groups
  }, [agents])

  return (
    <aside style={s.sidebar}>
      {/* User Input */}
      <div style={s.searchPanel}>
        <label style={s.label}>Trip Objective</label>
        <textarea
          style={s.textarea}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="I want to explore India..."
        />
        <button style={s.btn(disabled)} onClick={onStart} disabled={disabled}>
          {disabled ? '⏳ Agent Orchestration in Progress...' : '🚀 Launch Planning Agents'}
        </button>
      </div>

      {/* Progress */}
      <div style={s.progressPanel}>
        <AgentProgressBar agentStates={agentStates} status={status} />
      </div>

      {/* Agents System */}
      <div style={s.agentsPanel}>
        <div>
          <div style={s.panelLabel}>
            <span>Network Status</span>
            {status === 'running' && <span style={{ color: '#10b981' }}>● ONLINE</span>}
          </div>
          
          {Object.keys(agentsByPhase).map(phase => (
            <div key={phase} style={s.phaseGroup}>
              <div style={{ fontSize: '.6rem', color: '#475569', marginBottom: 8, fontWeight: 900 }}>PHASE {phase}</div>
              {agentsByPhase[phase].map(a => (
                <AgentItem key={a.id} agent={a} state={agentStates[a.id] || 'idle'} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Log - Telemetry */}
      <div style={s.logPanel}>
        <div style={s.panelLabel}>System Telemetry</div>
        <AnimatedLog logs={logs} />
      </div>
    </aside>
  )
}
