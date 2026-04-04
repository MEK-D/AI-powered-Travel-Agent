import { useState, useCallback, useMemo, useRef } from 'react'
import './index.css'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import { useAgentStream } from './hooks/useAgentStream'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TripForm from './components/TripForm'
import FlightPanel from './components/FlightPanel'
import HotelPanel from './components/HotelPanel'
import ActivitiesPanel from './components/ActivitiesPanel'
import ItineraryPanel from './components/ItineraryPanel'
import HitlPanel from './components/HitlPanel'
import OrchestratorPanel from './components/OrchestratorPanel'
import BookingSimulation from './components/BookingSimulation'

const AGENT_META = [
  { id: 'orchestrator',     name: 'Orchestrator',      icon: '🧠', sub: 'Plans & routes tasks',    phase: 0 },
  { id: 'flight_agent',     name: 'Flight Agent',       icon: '✈️', sub: 'SerpApi Google Flights',  phase: 1 },
  { id: 'train_agent',      name: 'Train Agent',        icon: '🚆', sub: 'Transport alternatives',  phase: 1 },
  { id: 'hotel_agent',      name: 'Hotel Agent',        icon: '🏨', sub: 'SerpApi Google Hotels',   phase: 2 },
  { id: 'weather_agent',    name: 'Weather Agent',      icon: '🌦', sub: 'Live forecast',           phase: 2 },
  { id: 'news_agent',       name: 'News Agent',         icon: '📰', sub: 'Events & local tips',     phase: 2 },
  { id: 'restaurant_agent', name: 'Restaurant Agent',   icon: '🍽', sub: 'Dining finder',           phase: 3 },
  { id: 'site_seeing_agent', name: 'Sightseeing Agent',  icon: '🏛', sub: 'Local attractions',      phase: 3 },
  { id: 'itinerary_agent',  name: 'Itinerary Agent',    icon: '🗺', sub: 'Day-by-day planner',      phase: 4 },
]

const TripSummary = ({ trip }) => {
  if (!trip) return null
  return (
    <div style={{
      padding: '16px 24px',
      background: 'rgba(99,102,241,0.05)',
      borderBottom: '1px solid rgba(99,102,241,0.1)',
      display: 'flex',
      gap: 30,
      alignItems: 'center',
      fontSize: '.9rem',
      color: '#94a3b8',
      borderRadius: '12px 12px 0 0',
      marginBottom: 20
    }}>
       <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
         <span style={{ opacity: 0.7 }}>📍</span> 
         <strong style={{ color: '#e2e8f0' }}>{trip.origin} → {trip.destination}</strong>
       </div>
       <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
         <span style={{ opacity: 0.7 }}>📅</span> 
         <strong style={{ color: '#e2e8f0' }}>{trip.start_date} to {trip.end_date}</strong>
       </div>
       <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
         <span style={{ opacity: 0.7 }}>👥</span> 
         <strong style={{ color: '#e2e8f0' }}>{trip.number_of_travelers} pax</strong>
       </div>
       <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
         <span style={{ opacity: 0.7 }}>💰</span> 
         <strong style={{ color: '#e2e8f0' }}>${trip.total_budget}</strong>
       </div>
    </div>
  )
}

const LoadingOverlay = ({ status, agentStates }) => {
  const activeAgentId = Object.keys(agentStates).find(id => agentStates[id] === 'running')
  const activeAgent = AGENT_META.find(a => a.id === activeAgentId) || AGENT_META[0]

  if (status !== 'running') return null

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: 'rgba(7, 9, 15, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        borderRadius: 16
      }}
    >
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <motion.div
           animate={{ rotate: 360 }}
           transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
           style={{
             position: 'absolute', inset: 0,
             border: '4px solid transparent',
             borderTopColor: '#6366f1',
             borderBottomColor: '#a855f7',
             borderRadius: '50%'
           }}
        />
        <div style={{ 
          position: 'absolute', inset: 0, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.5rem'
        }}>
          {activeAgent.icon}
        </div>
      </div>
      <motion.div 
        animate={{ y: [10, 0, 10], opacity: [0.7, 1, 0.7] }}
        transition={{ repeat: Infinity, duration: 2 }}
        style={{ marginTop: 24, textAlign: 'center' }}
      >
        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>
          {activeAgent.name} is working...
        </div>
        <div style={{ fontSize: '.9rem', color: '#64748b', marginTop: 4 }}>
          {activeAgent.sub}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function App() {
  const [selectedFlight, setSelectedFlight] = useState(null)
  const [selectedHotel, setSelectedHotel]   = useState(null)
  const [currentTrip, setCurrentTrip]       = useState(null)

  const handleFlights = useCallback(f => {
    if (!selectedFlight) setSelectedFlight(f[0] || null)
  }, [selectedFlight])

  const handleHotels = useCallback(h => {
    if (!selectedHotel) setSelectedHotel(h[0] || null)
  }, [selectedHotel])

  const {
    threadId, status, error, hitl, logs, agentStates, scraped,
    allFlights, selectedF, allHotels, selectedH, tripDetails,
    phase1Done, phase2Done, phase3Done, isDone, finalItinerary,
    threadList,
    startSession, approve, resume, reset, retry, fetchThreads, loadThread,
  } = useAgentStream({ 
    onFlights: handleFlights,
    onHotels:  handleHotels 
  })

  const restoredRef = useRef(false)
  useEffect(() => {
    fetchThreads()
    if (!restoredRef.current) {
      const savedThreadId = localStorage.getItem('travel_agent_thread_id')
      if (savedThreadId) loadThread(savedThreadId)
      restoredRef.current = true
    }
  }, [fetchThreads, loadThread])

  useEffect(() => {
    if (threadId) localStorage.setItem('travel_agent_thread_id', threadId)
    else {
      // Don't accidentally clear it if we're just initializing
      if (restoredRef.current) localStorage.removeItem('travel_agent_thread_id')
    }
  }, [threadId])

  const handleStart = useCallback(async (promptVal, tripDetails) => {
    if (!promptVal.trim()) return
    reset()
    setSelectedFlight(null)
    setSelectedHotel(null)
    setCurrentTrip(tripDetails)
    await startSession(promptVal, tripDetails)
  }, [startSession, reset])

  const handleResetAll = useCallback(() => {
    reset()
    setSelectedFlight(null)
    setSelectedHotel(null)
    setCurrentTrip(null)
    localStorage.removeItem('travel_agent_thread_id')
  }, [reset])

  const handleSelectThread = useCallback((tid) => {
    loadThread(tid)
  }, [loadThread])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header status={status} />
      
      {error && (
        <div style={{
          padding: '10px 16px', background: 'rgba(239,68,68,0.10)',
          borderBottom: '1px solid rgba(239,68,68,0.22)', color: '#fecaca',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <div style={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>❌ Connection Error</div>
          <div style={{ color: '#fca5a5', fontSize: '.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {String(error)}
          </div>
          <button onClick={retry} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#bbf7d0', cursor: 'pointer', fontWeight: 800 }}>Retry</button>
          <button onClick={handleResetAll} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', cursor: 'pointer', fontWeight: 800 }}>Reset</button>
        </div>
      )}

      <main className="dashboard-layout">
        {/* Panel A: Planning Workspace */}
        <section className="planning-workspace glass-panel">
          <div className="scroll-area custom-scrollbar" style={{ padding: 24 }}>
            {status === 'idle' ? (
              <div style={{ minHeight: '100%', display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
                <TripForm onStart={handleStart} />
              </div>
            ) : (
              <>
                <TripSummary trip={currentTrip} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                  <AnimatePresence>
                    <LoadingOverlay status={status} agentStates={agentStates} />
                  </AnimatePresence>

                  <OrchestratorPanel 
                    onApprove={() => approve(0)} 
                    status={status} 
                    agentStates={agentStates} 
                  />

                  {(phase1Done || allFlights.length > 0 || scraped?.flights?.length > 0) && (
                    <FlightPanel
                      allFlights={allFlights.length > 0 ? allFlights : (scraped?.flights || [])}
                      selectedF={selectedF}
                      phase1Done={phase1Done}
                      onApprove={() => approve(1)}
                      status={status}
                    />
                  )}

                  {(phase2Done || allHotels.length > 0 || scraped?.hotels?.length > 0) && (
                    <HotelPanel
                      allHotels={allHotels.length > 0 ? allHotels : (scraped?.hotels || [])}
                      selectedH={selectedH}
                      phase2Done={phase2Done}
                      onApprove={() => approve(2)}
                      status={status}
                    />
                  )}

                  {(phase3Done || scraped?.activities?.length > 0 || (scraped?.restaurants?.length > 0)) && (
                    <ActivitiesPanel
                      scraped={scraped}
                      phase3Done={phase3Done}
                      onApprove={() => approve(3)}
                      status={status}
                    />
                  )}

                  {(isDone || finalItinerary) && (
                    <ItineraryPanel
                      finalItinerary={finalItinerary}
                      isDone={isDone}
                      scraped={scraped}
                    />
                  )}

                  {isDone && (
                    <BookingSimulation 
                      selectedFlight={selectedF}
                      selectedHotel={selectedH}
                      tripDetails={tripDetails || currentTrip}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {/* HITL Controls at Bottom */}
          {status === 'paused' && hitl && (
            <div className="hitl-footer" style={{ padding: '0 24px 24px 24px' }}>
              <HitlPanel hitl={hitl} onSend={resume} disabled={status === 'running'} />
            </div>
          )}
        </section>

        {/* Panel B: Working Agents & Telemetry */}
        <section className="agents-telemetry">
           <Sidebar
              agents={AGENT_META}
              agentStates={agentStates}
              logs={logs}
              disabled={status === 'running'}
              status={status}
              threadList={threadList}
              activeThreadId={threadId}
              onSelectThread={handleSelectThread}
              onNewChat={handleResetAll}
            />
        </section>
      </main>
    </div>
  )
}
