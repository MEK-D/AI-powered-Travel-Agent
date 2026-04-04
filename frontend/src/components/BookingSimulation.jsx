import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const s = {
  container: {
    marginTop: 40,
    padding: '32px',
    borderRadius: 24,
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
    fontFamily: "'Inter', sans-serif",
  },
  title: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  receipt: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    border: '1px dashed rgba(255,255,255,0.1)',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  label: { color: '#94a3b8', fontSize: '0.9rem' },
  val: { color: '#e2e8f0', fontWeight: 700, textAlign: 'right' },
  total: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 16,
    fontSize: '1.4rem',
    fontWeight: 900,
    color: '#10b981',
  },
  btn: (booking) => ({
    width: '100%',
    padding: '20px',
    borderRadius: 16,
    border: 'none',
    background: booking ? 'rgba(16,185,129,0.1)' : 'linear-gradient(135deg, #10b981, #059669)',
    color: booking ? '#10b981' : '#fff',
    fontSize: '1.2rem',
    fontWeight: 800,
    fontFamily: "'Outfit', sans-serif",
    cursor: booking ? 'wait' : 'pointer',
    transition: 'all 0.3s',
    boxShadow: booking ? 'none' : '0 10px 30px rgba(16,185,129,0.3)',
  }),
  progress: {
    marginTop: 20,
    textAlign: 'center',
    color: '#6366f1',
    fontWeight: 700,
    fontSize: '1.1rem',
  }
}

export default function BookingSimulation({ selectedFlight, selectedHotel, tripDetails }) {
  const [bookingState, setBookingState] = useState('idle') // idle | booking | done
  const [progressMsg, setProgressMsg] = useState('')

  const flightPrice = selectedFlight?.cost || selectedFlight?.price_usd || 0
  const hotelPrice = selectedHotel?.cost_per_night || selectedHotel?.total_price || 0
  const nights = useMemo(() => {
    if (!tripDetails?.start_date || !tripDetails?.end_date) return 3
    const start = new Date(tripDetails.start_date)
    const end = new Date(tripDetails.end_date)
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 1
  }, [tripDetails])

  const travelers = tripDetails?.number_of_travelers || 1
  const total = (flightPrice * travelers) + (hotelPrice * nights)

  const handleBook = () => {
    setBookingState('booking')
    
    const steps = [
      { msg: "Initiating booking...", delay: 1000 },
      { msg: "Confirming flights with airline...", delay: 2000 },
      { msg: "Securing hotel reservations...", delay: 2000 },
      { msg: "✅ Booking Complete! Have a great trip!", delay: 1000 }
    ]

    let currentDelay = 0
    steps.forEach((step, i) => {
      setTimeout(() => {
        setProgressMsg(step.msg)
        if (i === steps.length - 1) setBookingState('done')
      }, currentDelay + step.delay)
      currentDelay += step.delay
    })
  }

  if (!selectedFlight || !selectedHotel) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={s.container}
    >
      <h2 style={s.title}>Trip Summary & Checkout</h2>
      
      <div style={s.receipt}>
        <div style={s.row}>
          <span style={s.label}>Flight ({selectedFlight.airline})</span>
          <span style={s.val}>${flightPrice.toFixed(2)}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Hotel ({selectedHotel.name || selectedHotel.hotel_name})</span>
          <span style={s.val}>${hotelPrice.toFixed(2)} x {nights} nights</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Departure Date</span>
          <span style={s.val}>{tripDetails?.start_date}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Destination</span>
          <span style={s.val}>{tripDetails?.destination}</span>
        </div>
        
        <div style={s.total}>
          <span>Est. Total Cost</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <button 
        style={s.btn(bookingState !== 'idle')}
        onClick={bookingState === 'idle' ? handleBook : undefined}
        disabled={bookingState !== 'idle'}
      >
        <AnimatePresence mode="wait">
          {bookingState === 'idle' && (
            <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Book Entire Trip
            </motion.span>
          )}
          {bookingState === 'booking' && (
            <motion.span key="booking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Processing...
            </motion.span>
          )}
          {bookingState === 'done' && (
            <motion.span key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              🎉 Booking Confirmed
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {bookingState === 'booking' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={s.progress}
        >
          <div style={{ marginBottom: 10 }}>{progressMsg}</div>
          <div style={{ height: 4, background: 'rgba(16,185,129,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 6 }}
              style={{ height: '100%', background: '#10b981' }}
            />
          </div>
        </motion.div>
      )}

      {bookingState === 'done' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ ...s.progress, color: '#10b981', fontSize: '1.4rem', marginTop: 30 }}
        >
          {progressMsg}
        </motion.div>
      )}
    </motion.div>
  )
}
