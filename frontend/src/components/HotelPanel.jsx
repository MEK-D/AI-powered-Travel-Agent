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
    textTransform: 'uppercase', letterSpacing: '.1rem', marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 8, opacity: 0.8
  },
  hotelGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, marginBottom: 24,
  },
  hotelCard: (selected) => ({
    background: selected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
    border: selected ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: selected ? 24 : 16,
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    transform: selected ? 'scale(1.02)' : 'scale(1)',
    boxShadow: selected ? '0 10px 30px rgba(99,102,241,0.2)' : 'none',
    position: 'relative',
    overflow: 'hidden'
  }),
  hotelHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 12,
  },
  hotelName: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.2rem', fontWeight: 700,
    color: '#e2e8f0', flex: 1,
  },
  rating: {
    background: 'rgba(245,158,11,.15)', color: '#f59e0b',
    padding: '4px 8px', borderRadius: 8, fontSize: '.8rem', fontWeight: 700,
  },
  hotelDetails: {
    color: '#94a3b8', fontSize: '.9rem', marginBottom: 16, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12,
  },
  tagContainer: {
    display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12,
  },
  tag: {
    background: 'rgba(99,102,241,0.1)', color: '#818cf8',
    padding: '4px 10px', borderRadius: 8, fontSize: '.75rem', fontWeight: 600,
  },
  price: {
    fontSize: '1.4rem', fontWeight: 900, color: '#10b981', marginTop: 12,
  },
  selectedBadge: {
    position: 'absolute', top: 0, right: 0, background: '#6366f1', color: '#fff',
    padding: '4px 12px', fontSize: '0.7rem', fontWeight: 900, borderRadius: '0 0 0 12px',
    textTransform: 'uppercase', letterSpacing: '0.05em', zIndex: 10
  },
  weatherGrid: {
     display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12,
  },
  weatherCard: {
     padding: 16, background: 'rgba(14,165,233,0.06)', borderRadius: 12, border: '1px solid rgba(14,165,233,0.12)',
  },
  weatherDate: { fontWeight: 800, fontSize: '.95rem', color: '#e2e8f0', marginBottom: 6 },
  weatherTemps: { display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', color: '#94a3b8' },
  weatherAdvice: { marginTop: 10, fontSize: '.8rem', color: '#64748b', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 },
  newsCard: {
     padding: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 10, fontSize: '.9rem', color: '#e2e8f0',
     lineHeight: 1.5
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

export default function HotelPanel({ allHotels, selectedH, scraped, phase2Done, onApprove, status }) {
  const weather = scraped?.weather || []
  const news    = scraped?.news || []

  const isDisabled = status === 'running' || !phase2Done

  const isChosen = (h) => {
    if (!selectedH) return false;
    return h.name === selectedH.name || h.name === selectedH.hotel_name;
  }

  return (
    <div className="glass-panel" style={{ ...s.panel, padding: 24 }}>
      <h2 style={s.title}>
        <span>🏨⛈️</span> Basecamp & Local Insights
      </h2>
      
      {(status === 'running' && !phase2Done) ? (
        <div style={s.loading}>
            <div style={{ fontSize: '3.5rem', marginBottom: 24, animation: 'pulse 2s infinite' }}>🏢</div>
            Scanning top-rated accommodations and local conditions...
        </div>
      ) : (
        <>
          <div style={s.section}>
            <div style={s.sectionTitle}>🏨 All Retrieved Accommodations</div>
            <div style={s.hotelGrid}>
              {allHotels.map((h, i) => {
                const isSelected = isChosen(h);
                return (
                  <div key={i} style={s.hotelCard(isSelected)}>
                    {isSelected && <div style={s.selectedBadge}>AI Selected 🪄</div>}
                    <div style={s.hotelHeader}>
                      <div style={s.hotelName}>{h.name}</div>
                      <div style={s.rating}>{h.user_rating || h.rating} ⭐</div>
                    </div>
                    {isSelected && (
                      <div style={s.hotelDetails}>
                        <div style={{color: '#a5b4fc'}}><strong>AI Insights:</strong> {selectedH.details || selectedH.vibe_match_reasoning}</div>
                      </div>
                    )}
                    {h.nearby_places?.length > 0 && (
                       <div style={s.tagContainer}>
                          {h.nearby_places.map((p, j) => <span key={j} style={s.tag}>📍 {p}</span>)}
                       </div>
                    )}
                    <div style={s.price}>
                      ${h.price_per_night_usd || h.cost_per_night} 
                      <span style={{fontSize: '.8rem', fontWeight: 400, color: '#64748b'}}>/ night</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32, marginBottom: 32 }}>
            <div style={s.section}>
              <div style={s.sectionTitle}>🌦 Trip Forecast</div>
              <div style={s.weatherGrid}>
                {weather.map((w, i) => (
                  <div key={i} style={s.weatherCard}>
                    <div style={s.weatherDate}>{w.date}</div>
                    <div style={{ fontSize: '.9rem', color: '#6366f1', fontWeight: 800, marginBottom: 8 }}>{w.conditions}</div>
                    <div style={s.weatherTemps}>
                      <span style={{color: '#ef4444'}}>High: {w.max_temp}{w.symbol}</span>
                      <span style={{color: '#3b82f6'}}>Low: {w.min_temp}{w.symbol}</span>
                    </div>
                    {w.travel_advice && <div style={s.weatherAdvice}>{w.travel_advice}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div style={s.section}>
              <div style={s.sectionTitle}>📰 Local Briefing</div>
              <div>
                {news.map((item, i) => (
                  <div key={i} style={s.newsCard}>
                    {typeof item === 'string' ? item : item.headline}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {phase2Done && (
            <button
              style={s.approveButton(isDisabled)}
              onClick={onApprove}
              disabled={isDisabled}
            >
              {isDisabled ? 'Syncing preferences...' : '✅ Approve basecamp & Continue'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
