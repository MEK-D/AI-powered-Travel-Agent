import React from 'react'

const s = {
  panel: {
    background: 'rgba(255,255,255,0.02)', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.05)', padding: 24,
  },
  title: {
    fontFamily: "'Playfair Display', sans-serif", fontSize: '1.3rem', fontWeight: 800,
    color: '#e2e8f0', marginBottom: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: '1.1rem', fontWeight: 700, color: '#556B2F',
    textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8,
  },
  hotelGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 24,
  },
  hotelCard: (selected) => ({
    background: selected ? 'rgba(85,107,47,0.1)' : 'rgba(255,255,255,0.03)',
    border: selected ? '2px solid #556B2F' : '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 16,
    cursor: 'pointer', transition: 'all .3s',
  }),
  hotelHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 12,
  },
  hotelName: {
    fontFamily: "'Playfair Display', sans-serif", fontSize: '1.1rem', fontWeight: 700,
    color: '#e2e8f0', flex: 1,
  },
  rating: {
    background: 'rgba(245,158,11,.15)', color: '#f59e0b',
    padding: '4px 8px', borderRadius: 8, fontSize: '.8rem', fontWeight: 700,
  },
  hotelDetails: {
    color: '#94a3b8', fontSize: '.9rem', marginBottom: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12, lineheight: 1.5,
  },
  tagContainer: {
    display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12,
  },
  tag: {
    background: 'rgba(85,107,47,0.1)', color: '#6B8E23',
    padding: '4px 8px', borderRadius: 6, fontSize: '.72rem', fontWeight: 600,
  },
  price: {
    fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginTop: 8,
  },
  weatherGrid: {
     display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12,
  },
  weatherCard: {
     padding: 12, background: 'rgba(85,107,47,0.05)', borderRadius: 10, border: '1px solid rgba(85,107,47,0.1)',
  },
  weatherDate: { fontWeight: 800, fontSize: '.9rem', color: '#e2e8f0', marginBottom: 4 },
  weatherTemps: { display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', color: '#64748b' },
  weatherAdvice: { marginTop: 8, fontSize: '.8rem', color: '#94a3b8', fontStyle: 'italic' },
  newsCard: {
     padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8, fontSize: '.85rem',
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
}

export default function HotelPanel({ scraped, phase2Done, onApprove, selectedHotel, setSelectedHotel, status }) {
  const hotels  = scraped?.hotels || []
  const allHotels = scraped?.all_hotels || []
  const weather = scraped?.weather || []
  const news    = scraped?.news || []

  const isDisabled = status === 'running' || !phase2Done

  const renderHotelCard = (h, i) => (
    <div key={i} style={s.hotelCard(selectedHotel === h)} onClick={() => setSelectedHotel(h)}>
      <div style={s.hotelHeader}>
        <div style={s.hotelName}>{h.name}</div>
        <div style={s.rating}>{h.rating} ⭐</div>
      </div>
      <div style={s.hotelDetails}>
          <div><strong>Vibe Match:</strong> {h.details}</div>
          <div style={{marginTop: 8}}><strong>Location:</strong> {h.location}</div>
      </div>
      {h.nearby_places?.length > 0 && (
         <div style={s.tagContainer}>
            {h.nearby_places.map((p, j) => <span key={j} style={s.tag}>📍 {p}</span>)}
         </div>
      )}
      {h.gps_coordinates && <div style={{...s.tag, marginTop: 12, background: 'none', padding: 0}}>🧭 {h.gps_coordinates.latitude}, {h.gps_coordinates.longitude}</div>}
      <div style={s.price}>${h.cost_per_night}/night</div>
    </div>
  )

  return (
    <div style={s.panel}>
      <h2 style={s.title}>🛖 basecamp & Local Insights</h2>
      
      {(status === 'running' && !phase2Done) ? (
        <div style={s.loading}>Scanning hotels, checking weather, and gathering local news...</div>
      ) : (
        <>
          {hotels.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>⭐ AI Selected Accommodations</div>
              <div style={s.hotelGrid}>
                {hotels.map(renderHotelCard)}
              </div>
            </div>
          )}

          {allHotels.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>🛖 All Available Accommodations (Top 10)</div>
              <div style={s.hotelGrid}>
                {allHotels.map(renderHotelCard)}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 32 }}>
            <div style={s.section}>
              <div style={s.sectionTitle}>🌦 Forecast</div>
              <div style={s.weatherGrid}>
                {weather.map((w, i) => (
                  <div key={i} style={s.weatherCard}>
                    <div style={s.weatherDate}>{w.date}</div>
                    <div style={{ fontSize: '.85rem', color: '#6B8E23', fontWeight: 700 }}>{w.conditions}</div>
                    <div style={s.weatherTemps}>
                      <span>MAX: {w.max_temp}{w.symbol}</span>
                      <span>MIN: {w.min_temp}{w.symbol}</span>
                    </div>
                    {w.travel_advice && <div style={s.weatherAdvice}>{w.travel_advice}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div style={s.section}>
              <div style={s.sectionTitle}>��️ Local News</div>
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
              {isDisabled ? 'Processing...' : '✅ Approve basecamp & Continue'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
