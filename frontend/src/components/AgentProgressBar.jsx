import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const s = {
  progressContainer: {
    padding: '4px 2px',
  },
  progressTitle: {
    fontFamily: "'Playfair Display', sans-serif", fontSize: '.7rem', fontWeight: 800,
    color: '#64748b', marginBottom: 14, textTransform: 'uppercase',
    letterSpacing: '.12em', display: 'flex', justifyContent: 'space-between'
  },
  phasesContainer: {
    display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10
  },
  phase: (active, completed) => ({
    flex: 1, height: 4, borderRadius: 2,
    background: completed ? 'linear-gradient(90deg, #10b981, #34d399)' : active ? 'linear-gradient(90deg, #556B2F, #6B8E23)' : 'rgba(255,255,255,0.05)',
    transition: 'all .6s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative',
    overflow: 'hidden',
    boxShadow: active ? '0 0 10px rgba(85,107,47,0.3)' : 'none',
  }),
  phaseLabels: {
    display: 'flex', justifyContent: 'space-between', marginBottom: 20
  },
  phaseLabel: (active, completed) => ({
    fontSize: '.62rem', 
    color: completed ? '#10b981' : active ? '#a5b4fc' : '#475569', 
    fontWeight: (active || completed) ? 800 : 500,
    textTransform: 'uppercase', letterSpacing: '.05em',
    transition: 'all .3s ease'
  }),
  agentStatus: {
    marginTop: 8, padding: '14px 16px', background: 'rgba(255,255,255,0.02)',
    borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
  },
  agentStatusTitle: {
    fontSize: '.65rem', color: '#64748b', marginBottom: 12, fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '.1em'
  },
  agentItems: {
    display: 'flex', flexWrap: 'wrap', gap: 8,
  },
  agentBadge: (status) => ({
    padding: '5px 10px', borderRadius: 8, fontSize: '.65rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.05em',
    transition: 'all .3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'default',
    ...(status === 'running' ? {
      background: 'rgba(85,107,47,.15)', color: '#6B8E23',
      border: '1px solid rgba(85,107,47,.3)',
      boxShadow: '0 0 12px rgba(85,107,47,0.2)',
    } : status === 'done' ? {
      background: 'rgba(16,185,129,.12)', color: '#34d399',
      border: '1px solid rgba(16,185,129,.25)',
    } : status === 'error' ? {
      background: 'rgba(239,68,68,.12)', color: '#f87171',
      border: '1px solid rgba(239,68,68,.25)',
    } : {
      background: 'rgba(255,255,255,0.03)', color: '#475569',
      border: '1px solid rgba(255,255,255,0.05)',
    }),
  }),
}

const PHASES = [
  { id: 0, name: 'Plan', agents: ['orchestrator'] },
  { id: 1, name: 'Transport', agents: ['flight_agent', 'train_agent'] },
  { id: 2, name: 'Basecamp', agents: ['hotel_agent', 'weather_agent', 'news_agent'] },
  { id: 3, name: 'Activities', agents: ['restaurant_agent', 'site_seeing_agent'] },
  { id: 4, name: 'Itinerary', agents: ['itinerary_agent'] },
]

export default function AgentProgressBar({ agentStates, status }) {
  const [currentPhase, setCurrentPhase] = useState(0)
  const [phaseProgress, setPhaseProgress] = useState([0, 0, 0, 0, 0])

  useEffect(() => {
    let newPhase = 0
    let newProgress = [0, 0, 0, 0, 0]

    PHASES.forEach((phase, index) => {
      const phaseAgents = phase.agents
      const phaseDone = phaseAgents.filter(agent => agentStates[agent] === 'done').length
      const phaseRunning = phaseAgents.filter(agent => agentStates[agent] === 'running').length
      
      if (phaseRunning > 0 || (phaseDone > 0 && phaseDone < phaseAgents.length)) {
        newPhase = index
      } else if (phaseDone === phaseAgents.length && index >= newPhase) {
        newPhase = Math.min(index + 1, PHASES.length - 1)
      }
      
      newProgress[index] = (phaseDone / phaseAgents.length) * 100
    })

    setCurrentPhase(newPhase)
    setPhaseProgress(newProgress)
  }, [agentStates])

  const getAgentStatus = (agentId) => {
    return agentStates[agentId] || 'idle'
  }

  return (
    <div style={s.progressContainer}>
      <div style={s.progressTitle}>
        <span>System Traversal</span>
        <span style={{color: '#475569'}}>{Math.round(phaseProgress.reduce((a,b)=>a+b,0)/5)}%</span>
      </div>
      
      <div style={s.phasesContainer}>
        {PHASES.map((phase, index) => (
          <motion.div
            key={phase.id}
            initial={false}
            animate={{
              background: phaseProgress[index] === 100 
                ? 'linear-gradient(90deg, #10b981, #34d399)' 
                : index === currentPhase 
                  ? ['linear-gradient(90deg, #556B2F, #6B8E23)', 'linear-gradient(90deg, #6B8E23, #556B2F)'] 
                  : 'rgba(255,255,255,0.05)'
            }}
            transition={{
              background: { repeat: index === currentPhase ? Infinity : 0, duration: 2, ease: "linear" }
            }}
            style={s.phase(index === currentPhase, phaseProgress[index] === 100)}
          />
        ))}
      </div>

      <div style={s.phaseLabels}>
        {PHASES.map((phase, index) => (
          <div key={phase.id} style={s.phaseLabel(index === currentPhase, phaseProgress[index] === 100)}>
            {phase.name}
          </div>
        ))}
      </div>

      <div style={s.agentStatus}>
        <div style={s.agentStatusTitle}>Active Nodes</div>
        <div style={s.agentItems}>
          {PHASES.flatMap(phase => 
            phase.agents.map(agentId => (
              <motion.div 
                key={agentId} 
                animate={getAgentStatus(agentId) === 'running' ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                style={s.agentBadge(getAgentStatus(agentId))}
              >
                {agentId.replace('_agent', '').replace('_', ' ')}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
