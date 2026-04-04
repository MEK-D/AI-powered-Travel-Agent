import React from 'react'

const s = {
  panel: {
    padding: 0,
  },
  title: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.5rem', fontWeight: 800,
    color: '#e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12
  },
  planCard: {
    background: 'rgba(99,102,241,0.08)', borderRadius: 16,
    border: '1px solid rgba(99,102,241,0.2)', padding: 24,
    marginBottom: 32,
    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
  },
  planTitle: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.2rem', fontWeight: 700,
    color: '#818cf8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10
  },
  planContent: {
    color: '#cbd5e1', fontSize: '1rem', lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
  },
  agentList: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12, marginTop: 24,
  },
  agentItem: {
    background: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: '10px 14px', fontSize: '.8rem', color: '#94a3b8',
    textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)',
    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'
  },
  approveButton: (disabled) => ({
    width: '100%', padding: '20px', border: 'none', borderRadius: 14,
    background: disabled ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all .3s', opacity: disabled ? 0.5 : 1,
    boxShadow: disabled ? 'none' : '0 10px 30px rgba(99,102,241,0.3)',
  }),
  loading: {
    textAlign: 'center', padding: 60, color: '#64748b',
    fontSize: '1rem', fontFamily: "'Inter', sans-serif",
  },
  instructionBox: {
    background: 'rgba(245,158,11,.08)', borderRadius: 14,
    border: '1px solid rgba(245,158,11,.15)', padding: 18,
    marginBottom: 24,
  },
  instructionTitle: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1rem', fontWeight: 800,
    color: '#f59e0b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8
  },
  instructionText: {
    color: '#94a3b8', fontSize: '.9rem', lineHeight: 1.5,
  },
}

export default function OrchestratorPanel({ onApprove, status, agentStates }) {
  const isDisabled = status === 'running'

  // Mock orchestrator plan data
  const mockPlan = {
    title: 'Execution Strategy',
    description: `Multi-Phase Intelligence Gathering:
• Analyzing optimal transit routes (Air/Rail)
• Curating boutique stay experiences
• Monitoring regional climate & real-time advisories
• Synthesizing local culinary & cultural hotspots
• Generating a finalized strategic itinerary`,
    agents: ['Flight Intelligence', 'Hotel Discovery', 'Weather Analytics', 'Local Briefing', 'Itinerary Synthesis']
  }

  if (status === 'running') {
    return (
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={s.loading}>
          <div style={{ fontSize: '3.5rem', marginBottom: 24, animation: 'pulse 2s infinite' }}>🧠</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.2rem', color: '#fff' }}>Orchestrating Workflow...</div>
          <div style={{ fontSize: '.9rem', marginTop: 8, color: '#64748b' }}>
            Determining optimal agent routing for your expedition
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-panel" style={{ padding: 24 }}>
      <h2 style={s.title}>
        <span>🧠</span> Mission Orchestration
      </h2>
      
      <div style={s.instructionBox}>
        <div style={s.instructionTitle}>⚡ Tactical Briefing</div>
        <div style={s.instructionText}>
          The system has formulated a multi-agent execution strategy. Review the proposed roadmap below and initiate the sequence.
        </div>
      </div>

      <div style={s.planCard}>
        <div style={s.planTitle}>
           <span>📋</span> {mockPlan.title}
        </div>
        <div style={s.planContent}>{mockPlan.description}</div>
        <div style={s.agentList}>
          {mockPlan.agents.map((agent, i) => (
            <div key={i} style={s.agentItem}>{agent}</div>
          ))}
        </div>
      </div>

      <button
        style={s.approveButton(isDisabled)}
        onClick={() => onApprove(0)}
        disabled={isDisabled}
      >
        {isDisabled ? 'Initiating Sequence...' : '🚀 Approve & Launch Working Agents'}
      </button>
    </div>
  )
}
