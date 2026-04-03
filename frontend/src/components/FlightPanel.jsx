import React from 'react'

const s = {
  panel: {
    background: 'rgba(255,255,255,0.02)', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.05)', padding: 24,
  },
  title: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.3rem', fontWeight: 800,
    color: '#e2e8f0', marginBottom: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: '1rem', fontWeight: 700, color: '#6366f1',
    textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16,
  },
  card: (selected) => ({
    background: selected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
    border: selected ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 16,
    cursor: 'pointer', transition: 'all .3s',
  }),
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', fontWeight: 700,
    color: '#e2e8f0',
  },
  price: {
    fontSize: '1.2rem', fontWeight: 800, color: '#10b981',
  },
  details: {
    color: '#94a3b8', fontSize: '.85rem', lineHeight: 1.5,
  },
  time: {
    fontWeight: 700, color: '#e2e8f0',
  },
  meta: {
    fontSize: '.75rem', color: '#64748b', marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10,
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
}

export default function FlightPanel({ scraped, phase1Done, onApprove, selectedFlight, setSelectedFlight, status }) {
  const flights = scraped?.flights || []
  const trains  = scraped?.trains || []

  const isDisabled = status === 'running' || !phase1Done

  return (
    <div style={s.panel}>
      <h2 style={s.title}>✈️🚆 Transportation Options</h2>
      
      {(status === 'running' && !phase1Done) ? (
        <div style={s.loading}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>🌐</div>
          <div>Scanning routes and fares...</div>
        </div>
      ) : (
        <>
          {flights.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>✈️ Flights</div>
              <div style={s.grid}>
                {flights.map((f, i) => (
                  <div key={i} style={s.card(selectedFlight === f)} onClick={() => setSelectedFlight(f)}>
                    <div style={s.cardHeader}>
                      <div style={s.cardTitle}>{f.airline}</div>
                      <div style={s.price}>${f.cost}</div>
                    </div>
                    <div style={s.details}>
                      <span style={s.time}>{f.departure}</span> → <span style={s.time}>{f.arrival}</span>
                    </div>
                    <div style={{...s.details, marginTop: 8, fontStyle: 'italic'}}>{f.timing_notes}</div>
                    <div style={{...s.details, marginTop: 4}}>{f.details}</div>
                    {f.duration && <div style={s.meta}>⏱ {f.duration}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {trains.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>🚆 Trains</div>
              <div style={s.grid}>
                {trains.map((t, i) => (
                  <div key={i} style={s.card(selectedFlight === t)} onClick={() => setSelectedFlight(t)}>
                    <div style={s.cardHeader}>
                      <div style={s.cardTitle}>{t.train_name}</div>
                      <div style={s.price}>₹{t.cost}</div>
                    </div>
                    <div style={s.details}>
                        <span style={s.time}>{t.departure}</span> → <span style={s.time}>{t.arrival}</span>
                    </div>
                    <div style={{...s.details, marginTop: 8}}>{t.details}</div>
                    {t.duration && <div style={s.meta}>⏱ {t.duration}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!flights.length && !trains.length && (
             <div style={s.loading}>No transportation options available yet.</div>
          )}

          {phase1Done && (
            <button
              style={s.approveButton(isDisabled)}
              onClick={onApprove}
              disabled={isDisabled}
            >
              {isDisabled ? 'Processing...' : '✅ Approve Transportation & Continue'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
