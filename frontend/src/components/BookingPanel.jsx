import React, { useState } from 'react';

const s = {
  panel: {
    background: 'rgba(255,255,255,0.02)', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.05)', padding: 24,
    display: 'flex', flexDirection: 'column', gap: 24
  },
  title: {
    fontFamily: "'Playfair Display', sans-serif", fontSize: '1.3rem', fontWeight: 800,
    color: '#e2e8f0', marginBottom: 8,
  },
  subtitle: {
    fontSize: '.9rem', color: '#64748b', marginBottom: 16,
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20,
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 20,
    display: 'flex', flexDirection: 'column',
    position: 'relative', overflow: 'hidden'
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 12
  },
  icon: { fontSize: '1.8rem' },
  cardTitle: { fontFamily: "'Playfair Display', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0' },
  cardType: { fontSize: '.75rem', fontWeight: 800, color: '#556B2F', textTransform: 'uppercase', letterSpacing: '.1em' },
  detailRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '.9rem' },
  detailLabel: { color: '#64748b' },
  detailValue: { color: '#e2e8f0', fontWeight: 600, textAlign: 'right', flex: 1 },
  price: {
    fontSize: '1.5rem', fontWeight: 800, color: '#6B8E23', marginTop: 12, marginBottom: 20
  },
  actionBtn: (status) => ({
    padding: '14px', border: 'none', borderRadius: 12,
    fontFamily: "'Playfair Display', sans-serif", fontSize: '.95rem', fontWeight: 700,
    cursor: status === 'idle' ? 'pointer' : 'not-allowed',
    transition: 'all .3s',
    background: status === 'idle' ? 'linear-gradient(135deg, #556B2F, #3e4f20)' : 
               status === 'loading' ? 'rgba(85,107,47,0.2)' : 'rgba(107,142,35,0.2)',
    color: status === 'idle' ? '#fff' : status === 'loading' ? '#cd5c5c' : '#6B8E23',
    boxShadow: status === 'idle' ? '0 4px 15px rgba(85,107,47,0.3)' : 'none',
  }),
  successBanner: {
    background: 'rgba(107,142,35,0.1)', border: '1px solid rgba(107,142,35,0.3)',
    borderRadius: 12, padding: '16px 20px', marginTop: 12, color: '#6B8E23',
    display: 'flex', flexDirection: 'column', gap: 6,
    animation: 'fadeIn 0.5s ease-out'
  },
}

export default function BookingPanel({ selectedFlight, selectedHotel, scraped, currentTrip, bookingStatus, setBookingStatus }) {
  // Fallbacks if user didn't explicitly select anything in previous views
  const transport = selectedFlight || scraped?.flights?.[0] || scraped?.trains?.[0]
  const hotel = selectedHotel || scraped?.hotels?.[0]

  const simulateBooking = (type) => {
    if (type === 'transport') {
      setBookingStatus(prev => ({ ...prev, transport: 'loading' }))
      setTimeout(() => setBookingStatus(prev => ({ ...prev, transport: 'success' })), 2000)
    } else if (type === 'hotel') {
      setBookingStatus(prev => ({ ...prev, hotel: 'loading' }))
      setTimeout(() => setBookingStatus(prev => ({ ...prev, hotel: 'success' })), 2000)
    }
  }

  const isFlight = transport && typeof transport.cost !== 'undefined' && transport.airline
  const isTrain = transport && transport.train_name

  return (
    <div style={s.panel}>
      <div>
        <h2 style={s.title}>🎟️ Secure Bookings</h2>
        <div style={s.subtitle}>Simulate the booking process for your approved travel options.</div>
      </div>

      <div style={s.grid}>
        {/* TRANSPORT CARD */}
        {transport ? (
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.icon}>{isFlight ? '🛩️' : '🚂'}</div>
              <div>
                <div style={s.cardType}>Primary Transport</div>
                <div style={s.cardTitle}>{isFlight ? transport.airline : transport.train_name}</div>
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Route</span>
                <span style={s.detailValue}>{transport.departure} → {transport.arrival}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Date</span>
                <span style={s.detailValue}>{currentTrip?.start_date || 'N/A'}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Travelers</span>
                <span style={s.detailValue}>{currentTrip?.number_of_travelers || 1}</span>
              </div>
            </div>

            <div style={s.price}>
              {isFlight ? `$${transport.cost}` : `₹${transport.cost}`}
            </div>

            <button 
              style={s.actionBtn(bookingStatus.transport)} 
              onClick={() => simulateBooking('transport')}
              disabled={bookingStatus.transport !== 'idle'}
            >
              {bookingStatus.transport === 'idle' ? 'Book Transport Now' : bookingStatus.transport === 'loading' ? 'Processing Transaction...' : '✅ Booked Successfully'}
            </button>

            {bookingStatus.transport === 'success' && (
              <div style={s.successBanner}>
                <div style={{fontWeight: 800}}>🎉 Hurrah!</div>
                <div style={{fontSize: '.85rem'}}>You have successfully booked your {isFlight ? 'flight ticket' : 'train ticket'} with {isFlight ? transport.airline : transport.train_name} for {currentTrip?.start_date}.</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{...s.card, justifyContent: 'center', alignItems: 'center', color: '#64748b'}}>
            No transport selected yet.
          </div>
        )}

        {/* HOTEL CARD */}
        {hotel ? (
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.icon}>🛖</div>
              <div>
                <div style={s.cardType}>Accommodation</div>
                <div style={s.cardTitle}>{hotel.name}</div>
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Location</span>
                <span style={s.detailValue}>{hotel.location || currentTrip?.destination}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Rating</span>
                <span style={s.detailValue}>{hotel.rating} ⭐</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Dates</span>
                <span style={s.detailValue}>{currentTrip?.start_date} to {currentTrip?.end_date}</span>
              </div>
            </div>

            <div style={s.price}>
              ${hotel.cost_per_night} <span style={{fontSize: '.9rem', color: '#64748b'}}>/ night</span>
            </div>

            <button 
              style={s.actionBtn(bookingStatus.hotel)} 
              onClick={() => simulateBooking('hotel')}
              disabled={bookingStatus.hotel !== 'idle'}
            >
              {bookingStatus.hotel === 'idle' ? 'Book Basecamp Now' : bookingStatus.hotel === 'loading' ? 'Processing Transaction...' : '✅ Booked Successfully'}
            </button>

            {bookingStatus.hotel === 'success' && (
              <div style={s.successBanner}>
                <div style={{fontWeight: 800}}>🎉 Hurrah!</div>
                <div style={{fontSize: '.85rem'}}>You have successfully booked your room at {hotel.name} for the specified dates.</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{...s.card, justifyContent: 'center', alignItems: 'center', color: '#64748b'}}>
            No basecamp selected yet.
          </div>
        )}

      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
