const s = {
  panel: {
    background: 'rgba(255,255,255,0.02)', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.05)', padding: 24,
  },
  title: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.3rem', fontWeight: 800,
    color: '#e2e8f0', marginBottom: 20,
  },
  planCard: {
    background: 'rgba(99,102,241,0.1)', borderRadius: 12,
    border: '2px solid rgba(99,102,241,0.3)', padding: 20,
    marginBottom: 24,
  },
  planTitle: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', fontWeight: 700,
    color: '#818cf8', marginBottom: 12,
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
    background: disabled ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: '1rem', fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all .3s', opacity: disabled ? 0.5 : 1,
    boxShadow: disabled ? 'none' : '0 4px 20px rgba(99,102,241,0.3)',
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
    fontFamily: "'Outfit', sans-serif", fontSize: '1rem', fontWeight: 700,
    color: '#f59e0b', marginBottom: 8,
  },
  instructionText: {
    color: '#94a3b8', fontSize: '.9rem', lineHeight: 1.5,
  },
}

export default function OrchestratorPanel({ onApprove, status, agentStates, finalItinerary }) {
  const isDone = status === 'done'
  const isFinalReview = !!finalItinerary

  // Mock orchestrator plan data - in real app this would come from the backend
  const mockPlan = {
    title: '🧠 Orchestrator Execution Plan',
    description: `Trip Planning Strategy:
1. Search for flights and trains from Goa to Srinagar
2. Find hotels with good amenities in Srinagar
3. Check weather conditions and local news
4. Discover restaurants and sightseeing spots
5. Generate complete day-by-day itinerary

Required Agents:
- Flight Agent: Find best flight options
- Train Agent: Check train alternatives
- Hotel Agent: Search for accommodations
- Weather Agent: Get weather forecast
- News Agent: Find local events
- Restaurant Agent: Discover dining options
- Itinerary Agent: Create final plan`,
    agents: ['Flight Agent', 'Train Agent', 'Hotel Agent', 'Weather Agent', 'News Agent', 'Restaurant Agent', 'Itinerary Agent']
  }

  if (status === 'running') {
    return (
      <div style={s.panel}>
        <h2 style={s.title}>🧠 Orchestrator Planning</h2>
        <div style={s.loading}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>🧠</div>
          <div>Orchestrator is creating your travel plan...</div>
          <div style={{ fontSize: '.8rem', marginTop: 8, color: '#475569' }}>
            Analyzing your request and determining the best approach
          </div>
        </div>
      </div>
    )
  }

  if (isFinalReview) {
    return (
      <div style={s.panel}>
        <h2 style={s.title}>🧠 Orchestration complete</h2>
        
        <div style={{...s.instructionBox, background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)'}}>
          <div style={{...s.instructionTitle, color: '#10b981'}}>🗺️ Itinerary Generated</div>
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

  return (
    <div style={s.panel}>
      <h2 style={s.title}>🧠 Orchestrator Plan</h2>
      
      <div style={s.instructionBox}>
        <div style={s.instructionTitle}>📋 Review & Approve</div>
        <div style={s.instructionText}>
          The orchestrator has created an execution plan for your trip. Review the plan below and click "Approve Plan" to continue, or provide feedback to make changes.
        </div>
      </div>

      <div style={s.planCard}>
        <div style={s.planTitle}>{mockPlan.title}</div>
        <div style={s.planContent}>{mockPlan.description}</div>
        <div style={s.agentList}>
          {mockPlan.agents.map((agent, i) => (
            <div key={i} style={s.agentItem}>{agent}</div>
          ))}
        </div>
      </div>

      <button
        style={s.approveButton(status === 'running')}
        onClick={() => onApprove(0)}
        disabled={status === 'running'}
      >
        {status === 'running' ? 'Processing...' : '✅ Approve Plan & Start Agents'}
      </button>
    </div>
  )
}
