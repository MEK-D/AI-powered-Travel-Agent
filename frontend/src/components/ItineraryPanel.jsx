import React from 'react'

const s = {
  panel: {
    padding: 0, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  header: {
    padding: '24px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    marginBottom: 30
  },
  title: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.8rem', fontWeight: 900,
    color: '#e2e8f0', margin: 0, display: 'flex', alignItems: 'center', gap: 12,
  },
  subTitle: {
    fontSize: '0.95rem', color: '#64748b', marginTop: 6, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.05em'
  },
  scrollContent: {
    flex: 1,
  },
  itineraryText: {
    background: 'rgba(255,255,255,0.03)', borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.08)', padding: 40,
    fontFamily: "'Inter', sans-serif", fontSize: '1.1rem',
    lineHeight: 1.8, color: '#e2e8f0',
    whiteSpace: 'pre-wrap', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.2)',
  },
  summaryGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20, marginBottom: 40,
  },
  card: {
    background: 'rgba(255,255,255,0.02)', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.06)', padding: 20,
    display: 'flex', flexDirection: 'column', gap: 12,
    position: 'relative', overflow: 'hidden'
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 12,
  },
  cardIcon: { fontSize: '1.5rem' },
  cardTitle: { fontSize: '.75rem', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '.12em' },
  cardValue: { fontSize: '1.1rem', fontWeight: 700, color: '#fff' },
  cardSub: { fontSize: '.85rem', color: '#94a3b8', lineHeight: 1.5 },
  loading: {
    textAlign: 'center', padding: 80, color: '#64748b',
    fontSize: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
  },
}

export default function ItineraryPanel({ finalItinerary, isDone, scraped }) {
  if (!isDone && !finalItinerary) {
    return (
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={s.loading}>
            <div style={{ fontSize: '4rem', animation: 'bounce 2s infinite' }}>🗺️</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.2rem', color: '#e2e8f0' }}>Synthesizing Master Itinerary...</div>
            <div style={{ maxWidth: 400, opacity: 0.7 }}>Our agents are combining flights, accommodation, and local insights into a cohesive travel dossier.</div>
        </div>
      </div>
    )
  }

  const f = scraped?.flights?.[0]
  const tr = scraped?.trains?.[0]
  const h = scraped?.hotels?.[0]
  const w = scraped?.weather?.[0]

  return (
    <div className="glass-panel" style={{ padding: '24px 32px' }}>
      <div style={s.header}>
        <h2 style={s.title}>
          <span>🗺️</span> Complete Travel Dossier
        </h2>
        <div style={s.subTitle}>Synthesized by AI Concierge Team</div>
      </div>

      <div style={s.scrollContent}>
        {/* Core Logistics Summary */}
        <div style={s.summaryGrid}>
          <div style={s.card}>
            <div style={s.cardHeader}>
               <span style={s.cardIcon}>✈️</span>
               <span style={s.cardTitle}>Primary Transport</span>
            </div>
            {f ? (
                <>
                    <div style={s.cardValue}>{f.airline}</div>
                    <div style={s.cardSub}>{f.departure} ⎯ {f.arrival}</div>
                    <div style={{color: '#10b981', fontSize: '.9rem', fontWeight: 900, marginTop: 'auto'}}>${f.cost} USD</div>
                </>
            ) : tr ? (
                <>
                    <div style={s.cardValue}>{tr.train_name}</div>
                    <div style={s.cardSub}>{tr.departure} ⎯ {tr.arrival}</div>
                    <div style={{color: '#10b981', fontSize: '.9rem', fontWeight: 900, marginTop: 'auto'}}>₹{tr.cost}</div>
                </>
            ) : <div style={s.cardSub}>No transport selected</div>}
          </div>

          <div style={s.card}>
            <div style={s.cardHeader}>
               <span style={s.cardIcon}>🏨</span>
               <span style={s.cardTitle}>Basecamp</span>
            </div>
            {h ? (
                <>
                    <div style={s.cardValue}>{h.name}</div>
                    <div style={s.cardSub}>{h.location} • {h.rating} ⭐</div>
                    <div style={{fontSize: '.8rem', color: '#64748b', marginTop: 'auto'}}>{h.nearby_places?.slice(0, 2).join(', ')}</div>
                </>
            ) : <div style={s.cardSub}>No hotel selected</div>}
          </div>

          <div style={s.card}>
            <div style={s.cardHeader}>
               <span style={s.cardIcon}>🌦</span>
               <span style={s.cardTitle}>Local Conditions</span>
            </div>
            {w ? (
                <>
                    <div style={s.cardValue}>{w.max_temp}{w.symbol} / {w.min_temp}{w.symbol}</div>
                    <div style={s.cardSub}>{w.conditions}</div>
                    <div style={{fontSize: '.8rem', color: '#06b6d4', fontStyle: 'italic', marginTop: 'auto'}}>{w.travel_advice?.substring(0, 40)}...</div>
                </>
            ) : <div style={s.cardSub}>N/A</div>}
          </div>
        </div>

        {/* Master Itinerary Document */}
        <div style={{ marginBottom: 40 }}>
            <div style={{...s.cardTitle, marginBottom: 20, fontSize: '0.9rem', color: '#e2e8f0'}}>Generated Plan</div>
            {finalItinerary ? (
                <div style={s.itineraryText}>
                {finalItinerary}
                </div>
            ) : (
                <div style={s.loading}>Generating final document structure...</div>
            )}
        </div>
      </div>
    </div>
  )
}
