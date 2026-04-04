import { useRef, useEffect, useMemo } from 'react'
import AgentItem from './AgentItem'
import AnimatedLog from './AnimatedLog'
import AgentProgressBar from './AgentProgressBar'
import { motion, AnimatePresence } from 'framer-motion'

const s = {
  sidebar: {
    height: '100%',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    gap: 20
  },
  glassCard: {
    background: 'var(--glass)',
    backdropFilter: 'blur(12px)',
    border: '1px solid var(--glass-border)',
    borderRadius: 20,
    display: 'flex', flexDirection: 'column', overflow: 'hidden'
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: 'linear-gradient(180deg, rgba(99,102,241,0.03) 0%, transparent 100%)',
  },
  label: { 
    display: 'block', fontSize: '.7rem', fontWeight: 900, color: '#475569', 
    textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 12 
  },
  newChatBtn: {
    width: '100%', padding: '14px', border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 14, background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', fontSize: '0.9rem',
    fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    transition: 'all 0.3s ease',
  },
  progressPanel: { padding: '20px 24px' },
  agentsPanel: { 
    padding: '0 24px 24px 24px', flex: 1.5, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24,
  },
  panelLabel: { 
    fontSize: '.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', 
    letterSpacing: '.12em', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  phaseGroup: { marginBottom: 20 },
  phaseLabel: { 
    fontSize: '.65rem', color: '#334155', marginBottom: 12, fontWeight: 900, 
    display: 'flex', alignItems: 'center', gap: 8 
  },
  logPanel: { 
    padding: '24px', height: 280, display: 'flex', flexDirection: 'column',
    background: 'rgba(0,0,0,0.2)'
  },
  historyPanel: { 
    padding: '20px 24px', maxHeight: 200, overflowY: 'auto', borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  historyItem: (active) => ({
    padding: '12px 16px', borderRadius: 12, cursor: 'pointer', marginBottom: 8,
    background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
    border: active ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
    color: active ? '#fff' : '#94a3b8', fontSize: '.8rem', transition: 'all .25s ease',
    display: 'flex', alignItems: 'center', gap: 12,
  }),
}

export default function Sidebar({ 
  agents, agentStates, logs, disabled, status,
  threadList, activeThreadId, onSelectThread, onNewChat 
}) {
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
      {/* Session Management Card */}
      <div style={s.glassCard}>
        <div style={s.header}>
          <motion.button 
            whileHover={{ scale: 1.02, background: 'rgba(99,102,241,0.15)' }}
            whileTap={{ scale: 0.98 }}
            style={s.newChatBtn} 
            onClick={onNewChat}
          >
            <span style={{fontSize: '1.1rem'}}>✨</span> New Trip Expedition
          </motion.button>
        </div>

        {threadList?.length > 0 && (
          <div style={s.historyPanel} className="custom-scrollbar">
            <div style={s.panelLabel}>Recent Plans</div>
            <AnimatePresence>
              {threadList.map((t, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={t.id} 
                  style={s.historyItem(t.id === activeThreadId)}
                  onClick={() => onSelectThread(t.id)}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', 
                    background: t.id === activeThreadId ? '#6366f1' : 'rgba(255,255,255,0.1)'
                  }} />
                  <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight: t.id === activeThreadId ? 600 : 400}}>
                     Analysis {t.id.substring(0, 8)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Agents Network Card */}
      <div style={{ ...s.glassCard, flex: 1 }}>
        <div style={s.progressPanel}>
          <div style={s.panelLabel}>Network Sync Status</div>
          <AgentProgressBar agentStates={agentStates} status={status} />
        </div>

        <div style={s.agentsPanel} className="custom-scrollbar">
          <div style={s.panelLabel}>
            <span>Agent Neural Network</span>
            {status === 'running' && (
              <motion.span 
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{ color: '#10b981', fontSize: '.65rem', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <div style={{width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981'}} />
                LIVE PROCESSING
              </motion.span>
            )}
          </div>
          
          {Object.keys(agentsByPhase).map(phase => (
            <div key={phase} style={s.phaseGroup}>
              <div style={s.phaseLabel}>
                <div style={{height: 1, flex: 1, background: 'rgba(255,255,255,0.05)'}} />
                <span>PHASE {phase} Sequence</span>
                <div style={{height: 1, flex: 1, background: 'rgba(255,255,255,0.05)'}} />
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {agentsByPhase[phase].map(a => (
                  <AgentItem key={a.id} agent={a} state={agentStates[a.id] || 'idle'} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Telemetry Card */}
      <div style={s.glassCard}>
        <div style={s.logPanel}>
          <div style={s.panelLabel}>System Telemetry Logs</div>
          <AnimatedLog logs={logs} />
        </div>
      </div>
    </aside>
  )
}
