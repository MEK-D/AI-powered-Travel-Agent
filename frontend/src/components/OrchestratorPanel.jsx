const s = {
  panel: {
    background: 'rgba(255,255,255,0.02)', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.05)', padding: 24,
  },
  title: {
    fontFamily: "'Playfair Display', sans-serif", fontSize: '1.3rem', fontWeight: 800,
    color: '#e2e8f0', marginBottom: 20,
  },
  planCard: {
    background: 'rgba(85,107,47,0.1)', borderRadius: 12,
    border: '2px solid rgba(85,107,47,0.3)', padding: 20,
    marginBottom: 24,
  },
  planTitle: {
    fontFamily: "'Playfair Display', sans-serif", fontSize: '1.1rem', fontWeight: 700,
    color: '#6B8E23', marginBottom: 12,
  },
  planContent: {
    color: '#e2e8f0', fontSize: '.95rem', lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },
  agentList: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 12, marginTop: 16,
  },
  agentItem: {
    background: 'rgba(255,255,255,0.05)', borderRadius: 8,
    padding: '8px 12px', fontSize: '.85rem', color: '#94a3b8',
    textAlign: 'center',
  },
  approveButton: (disabled) => ({
    width: '100%', padding: '16px', border: 'none', borderRadius: 12,
    background: disabled ? 'rgba(85,107,47,0.2)' : 'linear-gradient(135deg, #556B2F, #3e4f20)',
    color: '#fff', fontFamily: "'Playfair Display', sans-serif", fontSize: '1rem', fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all .3s', opacity: disabled ? 0.5 : 1,
    boxShadow: disabled ? 'none' : '0 4px 20px rgba(85,107,47,0.3)',
  }),
  loading: {
    textAlign: 'center', padding: 40, color: '#64748b',
    fontSize: '.9rem', fontFamily: "'Inter', sans-serif",
  },
  instructionBox: {
    background: 'rgba(245,158,11,.1)', borderRadius: 8,
    border: '1px solid rgba(245,158,11,.2)', padding: 16,
    marginBottom: 20,
  },
  instructionTitle: {
    fontFamily: "'Playfair Display', sans-serif", fontSize: '1rem', fontWeight: 700,
    color: '#f59e0b', marginBottom: 8,
  },
  instructionText: {
    color: '#94a3b8', fontSize: '.9rem', lineHeight: 1.5,
  },
}

export default function OrchestratorPanel({ onApprove, status, agentStates, finalItinerary }) {
  const isDone = status === 'done'
  const isFinalReview = !!finalItinerary



  if (status === 'running') {
    const AGENT_LABELS = {
      orchestrator: '♟️ Orchestrator',
      flight_agent: '🛩️ Flight Agent',
      train_agent: '🚂 Train Agent',
      hotel_agent: '🛖 Hotel Agent',
      weather_agent: '🌦 Weather Agent',
      news_agent: '��️ News Agent',
      restaurant_agent: '🍽 Restaurant Agent',
      site_seeing_agent: '🏛 Sightseeing Agent',
      itinerary_agent: '🗺 Itinerary Agent',
    };

    const runningAgents = Object.entries(agentStates || {})
      .filter(([_, st]) => st === 'running')
      .map(([name]) => AGENT_LABELS[name] || name.replace('_agent', '').toUpperCase() + ' AGENT');

    // Default to orchestrator if none found but status is 'running'
    if (runningAgents.length === 0) runningAgents.push('♟️ Orchestrator');

    return (
      <div style={s.panel}>
        <h2 style={s.title}>✨ System Processing</h2>
        <div style={s.loading}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
            {runningAgents.map((agentLabel, i) => (
              <div key={i} style={{
                padding: '10px 20px', 
                background: 'rgba(16,185,129,0.1)', 
                border: '1px solid rgba(16,185,129,0.4)', 
                color: '#34d399', 
                borderRadius: 24, 
                fontWeight: 800, 
                fontSize: '1rem',
                boxShadow: '0 0 15px rgba(16,185,129,0.15)'
              }}>
                ⚙️ {agentLabel} RUNNING...
              </div>
            ))}
          </div>
          <div style={{ fontSize: '1.1rem', color: '#e2e8f0', marginBottom: 8, fontWeight: 700 }}>
            {runningAgents.length > 1 ? 'Multiple agents are concurrently working on your trip.' : 'Your travel agent is gathering data...'}
          </div>
          <div style={{ fontSize: '.9rem', color: '#64748b' }}>
            Fetching real-time API integrations and applying AI coordination in the background.
          </div>
        </div>
      </div>
    )
  }

  if (isFinalReview) {
    return (
      <div style={s.panel}>
        <h2 style={s.title}>♟️ Orchestration complete</h2>
        
        <div style={{...s.instructionBox, background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)'}}>
          <div style={{...s.instructionTitle, color: '#10b981'}}>📜 Itinerary Generated</div>
          <div style={s.instructionText}>
            The orchestrator and agents have finished your travel plan. You can see the full details in the Dossier tab.
          </div>
        </div>

        <div style={s.planCard}>
          <div style={s.planTitle}>📋 Execution complete</div>
          <div style={{...s.planContent, maxHeight: 200, overflowY: 'auto'}}>{finalItinerary}</div>
        </div>

        {!isDone && (
          <button
            style={s.approveButton(false)}
            onClick={() => onApprove(4)}
          >
            ✅ Final Approval & Finish
          </button>
        )}
        {isDone && (
          <div style={{ textAlign: 'center', padding: 20, color: '#10b981', fontWeight: 700 }}>
            🎉 This trip is fully planned and approved!
          </div>
        )}
      </div>
    )
  }

  return null;
}
