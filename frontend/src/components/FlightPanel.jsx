import React from 'react'

const s = {
  panel: {
    padding: 0, 
  },
  title: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.5rem', fontWeight: 800,
    color: '#e2e8f0', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: '0.9rem', fontWeight: 700, color: '#6366f1',
    textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 8, opacity: 0.8
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20,
  },
  card: (selected) => ({
    background: selected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
    border: selected ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: selected ? 24 : 16,
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    transform: selected ? 'scale(1.02)' : 'scale(1)',
    boxShadow: selected ? '0 10px 30px rgba(99,102,241,0.2)' : 'none',
    position: 'relative',
    overflow: 'hidden'
  }),
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.2rem', fontWeight: 700,
    color: '#e2e8f0',
  },
  price: {
    fontSize: '1.4rem', fontWeight: 900, color: '#10b981',
  },
  details: {
    color: '#94a3b8', fontSize: '.9rem', lineHeight: 1.6,
  },
  time: {
    fontWeight: 700, color: '#fff', fontSize: '1.1rem'
  },
  meta: {
    fontSize: '.8rem', color: '#64748b', marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12,
    display: 'flex', justifyContent: 'space-between'
  },
  selectedBadge: {
    position: 'absolute', top: 0, right: 0, background: '#6366f1', color: '#fff',
    padding: '4px 12px', fontSize: '0.7rem', fontWeight: 900, borderRadius: '0 0 0 12px',
    textTransform: 'uppercase', letterSpacing: '0.05em', zIndex: 10
  },
  approveButton: (disabled) => ({
    width: '100%', padding: '18px', border: 'none', borderRadius: 14,
    background: disabled ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all .3s', opacity: disabled ? 0.5 : 1,
    boxShadow: disabled ? 'none' : '0 8px 25px rgba(99,102,241,0.3)',
    marginTop: 20
  }),
  loading: {
    textAlign: 'center', padding: 60, color: '#64748b',
    fontSize: '1rem', fontFamily: "'Inter', sans-serif",
  },
}

export default function FlightPanel({ allFlights, selectedF, phase1Done, onApprove, status }) {
  const isDisabled = status === 'running' || !phase1Done

  const isChosen = (f) => {
    if (!selectedF) return false;
    // Check if names/times match roughly
    return f.airline === selectedF.airline && 
           (f.departure_time || f.departure) === (selectedF.departure_time || selectedF.departure);
  }

  return (
    <div className="glass-panel" style={{ ...s.panel, padding: 24 }}>
      <h2 style={s.title}>
        <span>✈️</span> Transportation Options
      </h2>
      
      {(status === 'running' && !phase1Done) ? (
        <div style={s.loading}>
          <div style={{ fontSize: '3rem', marginBottom: 20, animation: 'pulse 2s infinite' }}>🌐</div>
          <div>Scanning routes and live fares...</div>
        </div>
      ) : (
        <>
          {allFlights.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>✈️ All Flights Retrieved</div>
              <div style={s.grid}>
                {allFlights.map((f, i) => {
                  const isSelected = isChosen(f);
                  return (
                    <div key={i} style={s.card(isSelected)}>
                      {isSelected && <div style={s.selectedBadge}>AI Selected 🪄</div>}
                      <div style={s.cardHeader}>
                        <div style={s.cardTitle}>{f.airline}</div>
                        <div style={s.price}>${f.price_usd || f.cost}</div>
                      </div>
                      <div style={s.details}>
                        <span style={s.time}>{f.departure_time || f.departure}</span> 
                        <span style={{margin: '0 10px', opacity: 0.3}}>⎯⎯</span>
                        <span style={s.time}>{f.arrival_time || f.arrival}</span>
                      </div>
                      {isSelected && (
                        <div style={{...s.details, marginTop: 12, color: '#a5b4fc', fontSize: '0.85rem'}}>
                           <strong>Why this:</strong> {selectedF.details || selectedF.timing_notes}
                        </div>
                      )}
                      <div style={s.meta}>
                        <span>{f.layovers !== undefined ? `${f.layovers} Layovers` : 'Verified'}</span>
                        <span style={{color: isSelected ? '#10b981' : '#64748b', fontWeight: 600}}>
                          {isSelected ? 'Top Selection' : 'Alternative'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!allFlights.length && (
             <div style={s.loading}>Preparing transportation options...</div>
          )}

          {phase1Done && (
            <button
              style={s.approveButton(isDisabled)}
              onClick={onApprove}
              disabled={isDisabled}
            >
              {isDisabled ? 'Confirming selection...' : '✅ Approve Transport & Search Hotels'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
