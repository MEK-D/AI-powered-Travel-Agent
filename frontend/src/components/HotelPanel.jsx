const s = {
  panel: {
    background: 'rgba(255,255,255,0.02)', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.05)', padding: 24,
  },
  title: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.3rem', fontWeight: 800,
    color: '#e2e8f0', marginBottom: 20,
  },
  hotelGrid: {
    display: 'grid', gap: 16, marginBottom: 24,
  },
  hotelCard: (selected) => ({
    background: selected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
    border: selected ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 16,
    cursor: 'pointer', transition: 'all .3s',
    '&:hover': {
      background: selected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
      borderColor: selected ? '#6366f1' : 'rgba(99,102,241,0.3)',
    },
  }),
  hotelHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 12,
  },
  hotelName: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', fontWeight: 700,
    color: '#e2e8f0', flex: 1,
  },
  rating: {
    background: 'rgba(245,158,11,.15)', color: '#f59e0b',
    padding: '4px 8px', borderRadius: 8, fontSize: '.8rem', fontWeight: 700,
  },
  hotelDetails: {
    color: '#94a3b8', fontSize: '.9rem', marginBottom: 8,
  },
  amenities: {
    display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8,
  },
  amenity: {
    background: 'rgba(99,102,241,0.1)', color: '#818cf8',
    padding: '4px 8px', borderRadius: 6, fontSize: '.75rem', fontWeight: 600,
  },
  price: {
    fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginTop: 8,
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

export default function HotelPanel({ scraped, phase2Done, onApprove, selectedHotel, setSelectedHotel, status }) {
  const hotels = scraped?.hotels || []

  const handleSelectHotel = (hotel) => {
    setSelectedHotel(hotel)
  }

  const isDisabled = status === 'running' || !phase2Done

  return (
    <div style={s.panel}>
      <h2 style={s.title}>🏨 Hotel Options</h2>
      
      {status === 'running' && !phase2Done ? (
        <div style={s.loading}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>🏨</div>
          <div>Finding the perfect accommodations...</div>
          <div style={{ fontSize: '.8rem', marginTop: 8, color: '#475569' }}>
            Our agents are searching for hotels with the best amenities and prices
          </div>
        </div>
      ) : hotels.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>🏨</div>
          <div>No hotels available yet</div>
          <div style={{ fontSize: '.8rem', marginTop: 8, color: '#475569' }}>
            Complete Phase 1 to see hotel recommendations
          </div>
        </div>
      ) : (
        <>
          <div style={s.hotelGrid}>
            {hotels.map((hotel, index) => (
              <div
                key={index}
                style={s.hotelCard(selectedHotel === hotel)}
                onClick={() => handleSelectHotel(hotel)}
              >
                <div style={s.hotelHeader}>
                  <div style={s.hotelName}>{hotel.name || 'Hotel Name'}</div>
                  <div style={s.rating}>{hotel.rating || '⭐⭐⭐⭐'}</div>
                </div>
                <div style={s.hotelDetails}>
                  {hotel.location || 'Location'} • {hotel.type || 'Hotel Type'}
                </div>
                {hotel.amenities && (
                  <div style={s.amenities}>
                    {hotel.amenities.slice(0, 4).map((amenity, i) => (
                      <span key={i} style={s.amenity}>{amenity}</span>
                    ))}
                  </div>
                )}
                <div style={s.price}>{hotel.price || 'Price TBD'}</div>
              </div>
            ))}
          </div>

          {phase2Done && (
            <button
              style={s.approveButton(isDisabled)}
              onClick={onApprove}
              disabled={isDisabled}
            >
              {isDisabled ? 'Processing...' : '✅ Approve Hotel Selection & Continue'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
