const s = {
  panel: {
    background: 'rgba(255,255,255,0.02)', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.05)', padding: 24,
  },
  title: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.3rem', fontWeight: 800,
    color: '#e2e8f0', marginBottom: 20,
  },
  flightGrid: {
    display: 'grid', gap: 16, marginBottom: 24,
  },
  flightCard: (selected) => ({
    background: selected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
    border: selected ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 16,
    cursor: 'pointer', transition: 'all .3s',
    '&:hover': {
      background: selected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
      borderColor: selected ? '#6366f1' : 'rgba(99,102,241,0.3)',
    },
  }),
  flightHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  airline: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1rem', fontWeight: 700,
    color: '#e2e8f0',
  },
  price: {
    fontSize: '1.2rem', fontWeight: 800, color: '#10b981',
  },
  flightDetails: {
    display: 'flex', gap: 16, alignItems: 'center',
    color: '#94a3b8', fontSize: '.9rem',
  },
  route: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  time: {
    fontFamily: "'Courier New', monospace", fontWeight: 700,
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
  empty: {
    textAlign: 'center', padding: 40, color: '#64748b',
    fontSize: '.9rem', fontFamily: "'Inter', sans-serif",
  },
}

export default function FlightPanel({ scraped, phase1Done, onApprove, selectedFlight, setSelectedFlight, status }) {
  const flights = scraped?.flights || []

  const handleSelectFlight = (flight) => {
    setSelectedFlight(flight)
  }

  const isDisabled = status === 'running' || !phase1Done

  return (
    <div style={s.panel}>
      <h2 style={s.title}>✈️ Flight Options</h2>
      
      {status === 'running' && !phase1Done ? (
        <div style={s.loading}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>🔍</div>
          <div>Searching for the best flights...</div>
          <div style={{ fontSize: '.8rem', marginTop: 8, color: '#475569' }}>
            Our agents are comparing prices and routes across multiple airlines
          </div>
        </div>
      ) : flights.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>✈️</div>
          <div>No flights available yet</div>
          <div style={{ fontSize: '.8rem', marginTop: 8, color: '#475569' }}>
            Start a new trip planning session to see flight options
          </div>
        </div>
      ) : (
        <>
          <div style={s.flightGrid}>
            {flights.map((flight, index) => (
              <div
                key={index}
                style={s.flightCard(selectedFlight === flight)}
                onClick={() => handleSelectFlight(flight)}
              >
                <div style={s.flightHeader}>
                  <div style={s.airline}>{flight.airline || 'Airline'}</div>
                  <div style={s.price}>{flight.price || 'Price TBD'}</div>
                </div>
                <div style={s.flightDetails}>
                  <div style={s.route}>
                    <span style={s.time}>{flight.departure || 'Dep'}</span>
                    <span>→</span>
                    <span style={s.time}>{flight.arrival || 'Arr'}</span>
                  </div>
                  <div>{flight.duration || 'Duration'}</div>
                  <div>{flight.stops || 'Non-stop'}</div>
                </div>
              </div>
            ))}
          </div>

          {phase1Done && (
            <button
              style={s.approveButton(isDisabled)}
              onClick={onApprove}
              disabled={isDisabled}
            >
              {isDisabled ? 'Processing...' : '✅ Approve Flight Selection & Continue'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
