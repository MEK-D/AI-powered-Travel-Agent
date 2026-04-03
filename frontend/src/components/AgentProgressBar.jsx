import { useEffect, useState } from 'react'

const s = {
  progressContainer: {
    padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  progressTitle: {
    fontFamily: "'Outfit', sans-serif", fontSize: '.85rem', fontWeight: 700,
    color: '#64748b', marginBottom: 12, textTransform: 'uppercase',
    letterSpacing: '.05em',
  },
  phasesContainer: {
    display: 'flex', gap: 8, alignItems: 'center',
  },
  phase: (active, completed) => ({
    flex: 1, height: 6, borderRadius: 3,
    background: completed ? '#10b981' : active ? '#f59e0b' : 'rgba(255,255,255,0.1)',
    transition: 'all .5s ease', position: 'relative',
    overflow: 'hidden',
  }),
  phaseActive: {
    '&::after': {
      content: '""', position: 'absolute', inset: 0,
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
      animation: 'shimmer 2s infinite',
    },
  },
  phaseLabels: {
    display: 'flex', justifyContent: 'space-between', marginTop: 8,
  },
  phaseLabel: {
    fontSize: '.7rem', color: '#64748b', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '.03em',
  },
  agentStatus: {
    marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.02)',
    borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)',
  },
  agentStatusTitle: {
    fontSize: '.75rem', color: '#64748b', marginBottom: 8, fontWeight: 600,
  },
  agentItems: {
    display: 'flex', flexWrap: 'wrap', gap: 6,
  },
  agentBadge: (status) => ({
    padding: '4px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.03em',
    ...(status === 'running' ? {
      background: 'rgba(245,158,11,.15)', color: '#f59e0b',
      border: '1px solid rgba(245,158,11,.3)',
      animation: 'pulse 2s infinite',
    } : status === 'done' ? {
      background: 'rgba(16,185,129,.15)', color: '#10b981',
      border: '1px solid rgba(16,185,129,.3)',
    } : status === 'error' ? {
      background: 'rgba(239,68,68,.15)', color: '#ef4444',
      border: '1px solid rgba(239,68,68,.3)',
    } : {
      background: 'rgba(99,102,241,.08)', color: '#6366f1',
      border: '1px solid rgba(99,102,241,.2)',
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
    // Calculate current phase based on agent states
    const runningAgents = Object.entries(agentStates).filter(([_, state]) => state === 'running')
    
    // Determine which phase we're in
    let newPhase = 0
    let newProgress = [0, 0, 0, 0, 0]

    PHASES.forEach((phase, index) => {
      const phaseAgents = phase.agents
      const phaseDone = phaseAgents.filter(agent => agentStates[agent] === 'done').length
      const phaseRunning = phaseAgents.filter(agent => agentStates[agent] === 'running').length
      
      if (phaseRunning > 0) {
        newPhase = index
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
      <div style={s.progressTitle}>📊 Trip Planning Progress</div>
      
      <div style={s.phasesContainer}>
        {PHASES.map((phase, index) => (
          <div
            key={phase.id}
            style={{
              ...s.phase(index === currentPhase, phaseProgress[index] === 100),
              ...(index === currentPhase && s.phaseActive)
            }}
          />
        ))}
      </div>

      <div style={s.phaseLabels}>
        {PHASES.map((phase, index) => (
          <div key={phase.id} style={s.phaseLabel}>
            {phase.name}
          </div>
        ))}
      </div>

      <div style={s.agentStatus}>
        <div style={s.agentStatusTitle}>🤖 Agent Status</div>
        <div style={s.agentItems}>
          {PHASES.flatMap(phase => 
            phase.agents.map(agentId => (
              <div key={agentId} style={s.agentBadge(getAgentStatus(agentId))}>
                {agentId.replace('_agent', '').replace('_', ' ')}
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
