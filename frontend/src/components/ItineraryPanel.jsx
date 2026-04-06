import React from 'react'

const s = {
  panel: {
    background: 'rgba(255,255,255,0.01)', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.05)', padding: 0, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  header: {
    padding: '24px 30px', background: 'linear-gradient(90deg, rgba(85,107,47,0.08), transparent)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  title: {
    fontFamily: "'Playfair Display', sans-serif", fontSize: '1.5rem', fontWeight: 900,
    color: '#e2e8f0', margin: 0, display: 'flex', alignItems: 'center', gap: 12,
  },
  subTitle: {
    fontSize: '.9rem', color: '#64748b', marginTop: 4, fontWeight: 600,
  },
  scrollContent: {
    padding: 30, overflowY: 'auto', flex: 1,
  },
  itineraryText: {
    background: 'rgba(255,255,255,0.03)', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.08)', padding: 30,
    fontFamily: "'Inter', sans-serif", fontSize: '1rem',
    lineHeight: 1.8, color: '#e2e8f0',
    whiteSpace: 'pre-wrap', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.2)',
  },
  summaryGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20, marginBottom: 40,
  },
  card: {
    background: 'rgba(255,255,255,0.02)', borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.06)', padding: 20,
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 10,
  },
  cardIcon: { fontSize: '1.4rem' },
  cardTitle: { fontSize: '.8rem', fontWeight: 900, color: '#556B2F', textTransform: 'uppercase', letterSpacing: '.1em' },
  cardValue: { fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' },
  cardSub: { fontSize: '.8rem', color: '#64748b', lineheight: 1.4 },
  loading: {
    textAlign: 'center', padding: 100, color: '#64748b',
    fontSize: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
  },
}

export default function ItineraryPanel({ finalItinerary, isDone, scraped }) {
  if (!isDone && !finalItinerary) {
    return (
      <div style={s.panel}>
        <div style={s.loading}>
          <div style={{ fontSize: '3rem', opacity: 0.5 }}>📜</div>
          <div>Your master travel plan is being synthesized...</div>
        </div>
      </div>
    )
  }

  const f = scraped?.flights?.[0]
  const tr = scraped?.trains?.[0]
  const h = scraped?.hotels?.[0]
  const w = scraped?.weather?.[0]

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <h2 style={s.title}>📜 Complete Travel Dossier</h2>
        <div style={s.subTitle}>Synthesized by your AI Concierge team</div>
      </div>

      <div style={s.scrollContent}>
        {/* Core Logistics Summary */}
        <div style={s.summaryGrid}>
          <div style={s.card}>
            <div style={s.cardHeader}>
               <span style={s.cardIcon}>🛩️</span>
               <span style={s.cardTitle}>Primary Transport</span>
            </div>
            {f ? (
                <>
                    <div style={s.cardValue}>{f.airline}</div>
                    <div style={s.cardSub}>{f.departure} → {f.arrival}</div>
                    <div style={{color: '#10b981', fontSize: '.8rem', fontWeight: 800}}>${f.cost} USD</div>
                </>
            ) : tr ? (
                <>
                    <div style={s.cardValue}>{tr.train_name}</div>
                    <div style={s.cardSub}>{tr.departure} → {tr.arrival}</div>
                    <div style={{color: '#10b981', fontSize: '.8rem', fontWeight: 800}}>₹{tr.cost}</div>
                </>
            ) : <div style={s.cardSub}>No transport data</div>}
          </div>

          <div style={s.card}>
            <div style={s.cardHeader}>
               <span style={s.cardIcon}>🛖</span>
               <span style={s.cardTitle}>Basecamp</span>
            </div>
            {h ? (
                <>
                    <div style={s.cardValue}>{h.name}</div>
                    <div style={s.cardSub}>{h.location} • {h.rating} ⭐</div>
                    <div style={{fontSize: '.75rem', color: '#94a3b8'}}>{h.nearby_places?.slice(0, 2).join(', ')}</div>
                </>
            ) : <div style={s.cardSub}>No hotel selected</div>}
          </div>

          <div style={s.card}>
            <div style={s.cardHeader}>
               <span style={s.cardIcon}>🌦</span>
               <span style={s.cardTitle}>Arrival Weather</span>
            </div>
            {w ? (
                <>
                    <div style={s.cardValue}>{w.max_temp}{w.symbol} / {w.min_temp}{w.symbol}</div>
                    <div style={s.cardSub}>{w.conditions}</div>
                    <div style={{fontSize: '.75rem', color: '#06b6d4', fontStyle: 'italic'}}>{w.travel_advice}</div>
                </>
            ) : <div style={s.cardSub}>N/A</div>}
          </div>
        </div>

        {/* Master Itinerary Document */}
        <div style={{ marginBottom: 40 }}>
            <div style={{...s.cardTitle, marginBottom: 16}}>Full Itinerary</div>
            {finalItinerary ? (
                <div style={s.itineraryText}>
                {finalItinerary}
                </div>
            ) : (
                <div style={s.loading}>Generating document...</div>
            )}
        </div>

        {/* Raw Data Appendices could go here, but since the user can switch tabs we focus on the synthesis */}
      </div>
    </div>
  )
}
