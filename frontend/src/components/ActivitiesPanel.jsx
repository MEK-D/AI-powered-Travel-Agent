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
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 16,
  },
  card: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8,
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardName: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', fontWeight: 700,
    color: '#e2e8f0',
  },
  cardMeta: {
    fontSize: '.85rem', color: '#94a3b8', marginBottom: 8, lineheight: 1.5,
  },
  tagContainer: {
    display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4,
  },
  tag: {
    background: 'rgba(99,102,241,0.1)', color: '#818cf8',
    padding: '4px 8px', borderRadius: 6, fontSize: '.72rem', fontWeight: 600,
  },
  rating: {
    background: 'rgba(245,158,11,.15)', color: '#f59e0b',
    padding: '4px 8px', borderRadius: 8, fontSize: '.8rem', fontWeight: 700,
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
  fieldPair: {
    display: 'flex', gap: 8, fontSize: '.8rem',
  },
  fieldName: {
    color: '#52617a', fontWeight: 700,
  },
  fieldValue: {
    color: '#e2e8f0', flex: 1,
  },
}

export default function ActivitiesPanel({ scraped, phase3Done, onApprove, status }) {
  const restaurants = scraped?.restaurants || []
  const sites       = scraped?.sites || scraped?.sightseeing || []

  const isRunning = status === 'running' && !phase3Done

  const renderField = (name, value) => {
    if (!value) return null
    return (
      <div style={s.fieldPair} key={name}>
        <div style={s.fieldName}>{name}:</div>
        <div style={s.fieldValue}>{value}</div>
      </div>
    )
  }

  return (
    <div style={s.panel}>
      <h2 style={s.title}>🍽️🏛️ Activities & Dining</h2>

      {isRunning ? (
        <div style={s.loading}>
            <div style={{ fontSize: '2rem', marginBottom: 16 }}>🍽️</div>
            <div>Scanned potential activities...</div>
        </div>
      ) : (
        <>
          <div style={s.section}>
            <div style={s.sectionTitle}>🍽️ Restaurants</div>
            <div style={s.grid}>
              {restaurants.map((r, i) => (
                <div key={i} style={s.card}>
                  <div style={s.cardHeader}>
                    <div style={s.cardName}>{r.name}</div>
                    {r.rating && <div style={s.rating}>{r.rating} ⭐</div>}
                  </div>
                  <div style={s.cardMeta}>{r.details || r.description}</div>
                  {renderField('Type', r.type)}
                  {renderField('Price range', r.price_range)}
                  {renderField('Address', r.address)}
                  {r.features?.length > 0 && (
                    <div style={s.tagContainer}>
                      {r.features.map((f, j) => <span key={j} style={s.tag}>{f}</span>)}
                    </div>
                  )}
                </div>
              ))}
              {restaurants.length === 0 && <div style={{ color: '#475569' }}>No restaurants found yet.</div>}
            </div>
          </div>

          <div style={s.section}>
            <div style={s.sectionTitle}>🏛️ Sightseeing</div>
            <div style={s.grid}>
              {sites.map((site, i) => (
                <div key={i} style={s.card}>
                  <div style={s.cardHeader}>
                    <div style={s.cardName}>{site.name}</div>
                  </div>
                  <div style={s.cardMeta}>{site.details || site.description}</div>
                  {renderField('Category', site.category || site.type)}
                  {renderField('Vibe', site.vibe)}
                  {renderField('Address', site.address)}
                  {renderField('Entry Fee', site.entry_fee)}
                  {renderField('Hours', site.opening_times)}
                  {renderField('Tips', site.suggestions)}
                </div>
              ))}
              {sites.length === 0 && <div style={{ color: '#475569' }}>No sightseeing sites found yet.</div>}
            </div>
          </div>

          {phase3Done && (
            <button
              style={s.approveButton(status === 'running')}
              onClick={onApprove}
              disabled={status === 'running'}
            >
              {status === 'running' ? 'Processing...' : '✅ Approve Activities & Generate Itinerary'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
