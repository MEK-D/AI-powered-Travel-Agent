import { useRef, useEffect, useMemo } from 'react'
import AgentItem from './AgentItem'
import AnimatedLog from './AnimatedLog'
import AgentProgressBar from './AgentProgressBar'
import { motion, AnimatePresence } from 'framer-motion'

const s = {
  sidebar: {
    width: 320, flexShrink: 0,
    background: '#0d1117',
    borderRight: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '10px 0 30px rgba(0,0,0,0.3)',
  },
  header: {
    padding: '24px 22px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    background: 'linear-gradient(180deg, rgba(99,102,241,0.05) 0%, transparent 100%)',
  },
  label: { 
    display: 'block', fontSize: '.65rem', fontWeight: 900, color: '#475569', 
    textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 12 
  },
  newChatBtn: {
    width: '100%', padding: '12px', border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 14, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', fontSize: '.85rem',
    fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    transition: 'all .3s ease',
    '&:hover': { background: 'rgba(99,102,241,0.2)', transform: 'translateY(-1px)' }
  },
  progressPanel: { padding: '20px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  agentsPanel: { 
    padding: '22px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24,
    scrollbarWidth: 'none', msOverflowStyle: 'none',
  },
  panelLabel: { 
    fontSize: '.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', 
    letterSpacing: '.12em', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  phaseGroup: { marginBottom: 16 },
  phaseLabel: { 
    fontSize: '.6rem', color: '#334155', marginBottom: 10, fontWeight: 900, 
    display: 'flex', alignItems: 'center', gap: 8 
  },
  logPanel: { 
    padding: '16px 22px', borderTop: '1px solid rgba(255,255,255,0.07)', 
    height: 180, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)' 
  },
  historyPanel: { 
    padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)', 
    maxHeight: 220, overflowY: 'auto' 
  },
  historyItem: (active) => ({
    padding: '10px 14px', borderRadius: 12, cursor: 'pointer', marginBottom: 8,
    background: active ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))' : 'transparent',
    border: active ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
    color: active ? '#fff' : '#94a3b8', fontSize: '.78rem', transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex', alignItems: 'center', gap: 12,
    '&:hover': { background: 'rgba(255,255,255,0.03)', transform: 'translateX(4px)' }
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
      <div style={s.header}>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={s.newChatBtn} 
          onClick={onNewChat}
        >
          <span style={{fontSize: '1rem'}}>✨</span> New Itinerary Plan
        </motion.button>
      </div>

      {/* Chat History */}
      {threadList?.length > 0 && (
        <div style={s.historyPanel} className="custom-scrollbar">
          <div style={s.panelLabel}>Recent Expeditions</div>
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
                   Plan {t.id.substring(0, 8)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Progress section removed as per user request */}

      {/* Agents System */}
      <div style={s.agentsPanel} className="custom-scrollbar">
        <div>
          <div style={s.panelLabel}>
            <span>Agent Neural Network</span>
            {status === 'running' && (
              <motion.span 
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{ color: '#10b981', fontSize: '.65rem', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <div style={{width: 6, height: 6, borderRadius: '50%', background: '#10b981'}} />
                PROCESSING
              </motion.span>
            )}
          </div>
          
          {Object.keys(agentsByPhase).map(phase => (
            <div key={phase} style={s.phaseGroup}>
              <div style={s.phaseLabel}>
                <div style={{height: 1, flex: 1, background: 'rgba(255,255,255,0.03)'}} />
                <span>PHASE {phase}</span>
                <div style={{height: 1, flex: 1, background: 'rgba(255,255,255,0.03)'}} />
              </div>
              {agentsByPhase[phase].map(a => (
                <AgentItem key={a.id} agent={a} state={agentStates[a.id] || 'idle'} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* System Telemetry moved to the main panel as requested */}
    </aside>
  )
}
