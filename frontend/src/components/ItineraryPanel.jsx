const s = {
  panel: {
    background: 'rgba(255,255,255,0.02)', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.05)', padding: 24,
  },
  title: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.3rem', fontWeight: 800,
    color: '#e2e8f0', marginBottom: 20,
  },
  itineraryContent: {
    background: 'rgba(255,255,255,0.03)', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)', padding: 20,
    fontFamily: "'Inter', sans-serif", fontSize: '.95rem',
    lineHeight: 1.7, color: '#e2e8f0',
    whiteSpace: 'pre-wrap',
  },
  loading: {
    textAlign: 'center', padding: 40, color: '#64748b',
    fontSize: '.9rem', fontFamily: "'Inter', sans-serif",
  },
  empty: {
    textAlign: 'center', padding: 40, color: '#64748b',
    fontSize: '.9rem', fontFamily: "'Inter', sans-serif",
  },
  summaryCards: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16, marginBottom: 24,
  },
  summaryCard: {
    background: 'rgba(255,255,255,0.03)', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)', padding: 16,
    textAlign: 'center',
  },
  cardIcon: {
    fontSize: '2rem', marginBottom: 8,
  },
  cardLabel: {
    fontSize: '.8rem', color: '#64748b', marginBottom: 4,
    textTransform: 'uppercase', letterSpacing: '.05em',
  },
  cardValue: {
    fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0',
  },
  weatherInfo: {
    background: 'rgba(6,182,212,.1)', borderRadius: 12,
    border: '1px solid rgba(6,182,212,.2)', padding: 16,
    marginBottom: 20,
  },
  weatherTitle: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1rem', fontWeight: 700,
    color: '#06b6d4', marginBottom: 8,
  },
  weatherDetails: {
    color: '#94a3b8', fontSize: '.9rem',
  },
}

export default function ItineraryPanel({ finalItinerary, isDone, scraped }) {
  const weather = scraped?.weather || []
  const news = scraped?.news || []

  if (!isDone && !finalItinerary) {
    return (
      <div style={s.panel}>
        <h2 style={s.title}>🗺️ Travel Itinerary</h2>
        <div style={s.empty}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>🗺️</div>
          <div>Your itinerary is being prepared...</div>
          <div style={{ fontSize: '.8rem', marginTop: 8, color: '#475569' }}>
            Complete all phases to see your complete travel plan
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.panel}>
      <h2 style={s.title}>🗺️ Complete Travel Itinerary</h2>

      {/* Summary Cards */}
      <div style={s.summaryCards}>
        <div style={s.summaryCard}>
          <div style={s.cardIcon}>✈️</div>
          <div style={s.cardLabel}>Flights</div>
          <div style={s.cardValue}>{scraped?.flights?.length || 0} Options</div>
        </div>
        <div style={s.summaryCard}>
          <div style={s.cardIcon}>🏨</div>
          <div style={s.cardLabel}>Hotels</div>
          <div style={s.cardValue}>{scraped?.hotels?.length || 0} Options</div>
        </div>
        <div style={s.summaryCard}>
          <div style={s.cardIcon}>🍽️</div>
          <div style={s.cardLabel}>Restaurants</div>
          <div style={s.cardValue}>{scraped?.restaurants?.length || 0} Found</div>
        </div>
        <div style={s.summaryCard}>
          <div style={s.cardIcon}>📰</div>
          <div style={s.cardLabel}>Local News</div>
          <div style={s.cardValue}>{news.length} Articles</div>
        </div>
      </div>

      {/* Weather Information */}
      {weather.length > 0 && (
        <div style={s.weatherInfo}>
          <div style={s.weatherTitle}>🌦️ Weather Forecast</div>
          <div style={s.weatherDetails}>
            {weather.map((w, i) => (
              <div key={i}>
                {w.day}: {w.condition}, {w.temperature}°{w.unit || 'C'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Itinerary */}
      {finalItinerary ? (
        <div style={s.itineraryContent}>
          {finalItinerary}
        </div>
      ) : (
        <div style={s.loading}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>⚙️</div>
          <div>Generating your complete itinerary...</div>
          <div style={{ fontSize: '.8rem', marginTop: 8, color: '#475569' }}>
            Our agents are putting together your perfect travel plan
          </div>
        </div>
      )}
    </div>
  )
}
