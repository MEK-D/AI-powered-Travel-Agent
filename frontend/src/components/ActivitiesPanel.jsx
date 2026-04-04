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
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: '0.9rem', fontWeight: 700, color: '#6366f1',
    textTransform: 'uppercase', letterSpacing: '.1rem', marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 8, opacity: 0.8
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 20,
  },
  card: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'rgba(255,255,255,0.05)',
      borderColor: 'rgba(99,102,241,0.3)',
      transform: 'translateY(-4px)'
    }
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  cardName: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.15rem', fontWeight: 700,
    color: '#e2e8f0',
  },
  cardMeta: {
    fontSize: '.9rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 8
  },
  tagContainer: {
    display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8,
  },
  tag: {
    background: 'rgba(99,102,241,0.08)', color: '#818cf8',
    padding: '4px 10px', borderRadius: 8, fontSize: '.75rem', fontWeight: 600,
    border: '1px solid rgba(99,102,241,0.1)'
  },
  rating: {
    background: 'rgba(245,158,11,.15)', color: '#f59e0b',
    padding: '4px 10px', borderRadius: 8, fontSize: '.8rem', fontWeight: 800,
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
  fieldPair: {
    display: 'flex', gap: 10, fontSize: '.85rem',
  },
  fieldName: {
    color: '#64748b', fontWeight: 700, minWidth: 80
  },
  fieldValue: {
    color: '#cbd5e1', flex: 1,
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
        <div style={s.fieldName}>{name}</div>
        <div style={s.fieldValue}>{value}</div>
      </div>
    )
  }

  return (
    <div className="glass-panel" style={{ ...s.panel, padding: 24 }}>
      <h2 style={s.title}>
        <span>🍽️🏛️</span> Activities & Dining
      </h2>

      {isRunning ? (
        <div style={s.loading}>
            <div style={{ fontSize: '3rem', marginBottom: 24, animation: 'pulse 2s infinite' }}>🍴</div>
            <div>Curating local experiences and top-rated dining spots...</div>
        </div>
      ) : (
        <>
          <div style={s.section}>
            <div style={s.sectionTitle}>🍽️ Recommended Restaurants</div>
            <div style={s.grid}>
              {restaurants.map((r, i) => (
                <div key={i} style={s.card}>
                  <div style={s.cardHeader}>
                    <div style={s.cardName}>{r.name}</div>
                    {r.rating && <div style={s.rating}>{r.rating} ⭐</div>}
                  </div>
                  <div style={s.cardMeta}>{r.details || r.description}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {renderField('Type', r.type)}
                    {renderField('Price', r.price_range)}
                    {renderField('Address', r.address)}
                  </div>
                  {r.features?.length > 0 && (
                    <div style={s.tagContainer}>
                      {r.features.map((f, j) => <span key={j} style={s.tag}>{f}</span>)}
                    </div>
                  )}
                </div>
              ))}
              {restaurants.length === 0 && <div style={{ color: '#475569', fontSize: '.9rem' }}>Searching for best local eats...</div>}
            </div>
          </div>

          <div style={s.section}>
            <div style={s.sectionTitle}>🏛️ Sightseeing & Landmarks</div>
            <div style={s.grid}>
              {sites.map((site, i) => (
                <div key={i} style={s.card}>
                  <div style={s.cardHeader}>
                    <div style={s.cardName}>{site.name}</div>
                  </div>
                  <div style={s.cardMeta}>{site.details || site.description}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {renderField('Category', site.category || site.type)}
                    {renderField('Vibe', site.vibe)}
                    {renderField('Address', site.address)}
                    {renderField('Entry', site.entry_fee)}
                    {renderField('Tips', site.suggestions)}
                  </div>
                </div>
              ))}
              {sites.length === 0 && <div style={{ color: '#475569', fontSize: '.9rem' }}>Scanning for hidden gems and landmarks...</div>}
            </div>
          </div>

          {phase3Done && (
            <button
              style={s.approveButton(status === 'running')}
              onClick={onApprove}
              disabled={status === 'running'}
            >
              {status === 'running' ? 'Synthesizing...' : '✅ Approve Experiences & Generate Dossier'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
