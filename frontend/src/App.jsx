import { useState, useCallback } from 'react'
import './index.css'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import MainPanel from './components/MainPanel'
import { useAgentStream } from './hooks/useAgentStream'

const AGENT_META = [
  { id: 'orchestrator',     name: 'Orchestrator',      icon: '🧠', sub: 'Plans & routes tasks',    phase: 0 },
  { id: 'flight_agent',     name: 'Flight Agent',       icon: '✈️', sub: 'SerpApi Google Flights',  phase: 1 },
  { id: 'train_agent',      name: 'Train Agent',        icon: '🚆', sub: 'Transport alternatives',  phase: 1 },
  { id: 'hotel_agent',      name: 'Hotel Agent',        icon: '🏨', sub: 'SerpApi Google Hotels',   phase: 2 },
  { id: 'weather_agent',    name: 'Weather Agent',      icon: '🌦', sub: 'Live forecast',           phase: 2 },
  { id: 'news_agent',       name: 'News Agent',         icon: '📰', sub: 'Events & local tips',     phase: 2 },
  { id: 'restaurant_agent', name: 'Restaurant Agent',   icon: '🍽', sub: 'Dining finder',           phase: 3 },
  { id: 'itinerary_agent',  name: 'Itinerary Agent',    icon: '🗺', sub: 'Day-by-day planner',      phase: 3 },
]

export default function App() {
  const [prompt, setPrompt]               = useState('')
  const [activeTab, setActiveTab]         = useState(1)
  const [selectedFlight, setSelectedFlight] = useState(null)
  const [selectedHotel, setSelectedHotel]   = useState(null)

  const {
    threadId, status, error, hitl, logs, agentStates, scraped, timeline,
    phase1Done, phase2Done, isDone, finalItinerary,
    startSession, approve, resume, reset, retry,
  } = useAgentStream({ onFlights: f => !selectedFlight && setSelectedFlight(f[0] || null),
                       onHotels:  h => !selectedHotel  && setSelectedHotel (h[0] || null) })

  const handleStart = useCallback(async () => {
    if (!prompt.trim()) return
    reset()
    setSelectedFlight(null)
    setSelectedHotel(null)
    setActiveTab(0)
    await startSession(prompt)
  }, [prompt, startSession, reset])

  const handleApprove = useCallback(async (phase) => {
    await approve(phase)
    if (phase === 0) {
      setActiveTab(1) // Move to flights tab after orchestrator approval
    } else if (phase === 1) {
      setActiveTab(2) // Move to hotels tab after phase 1 approval
    } else if (phase === 2) {
      setActiveTab(3) // Move to itinerary tab after phase 2 approval
    }
  }, [approve])

  const handleHitlSend = useCallback(async (text) => {
    await resume(text)
  }, [resume])

  const handleResetAll = useCallback(() => {
    reset()
    setSelectedFlight(null)
    setSelectedHotel(null)
    setActiveTab(0)
  }, [reset])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header status={status} />
      {error && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(239,68,68,0.10)',
          borderBottom: '1px solid rgba(239,68,68,0.22)',
          color: '#fecaca',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>❌ Connection / Runtime Error</div>
          <div style={{ color: '#fca5a5', fontSize: '.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {String(error)}
          </div>
          <button
            onClick={retry}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid rgba(16,185,129,0.3)',
              background: 'rgba(16,185,129,0.1)',
              color: '#bbf7d0',
              cursor: 'pointer',
              fontWeight: 800,
              fontFamily: "'Outfit', sans-serif",
              marginRight: 8,
            }}
          >
            Retry
          </button>
          <button
            onClick={handleResetAll}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e2e8f0',
              cursor: 'pointer',
              fontWeight: 800,
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Reset
          </button>

        </div>
      )}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          prompt={prompt}
          setPrompt={setPrompt}
          onStart={handleStart}
          agents={AGENT_META}
          agentStates={agentStates}
          logs={logs}
          disabled={status === 'running'}
          status={status}
        />
        <MainPanel
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          scraped={scraped}
          phase1Done={phase1Done}
          phase2Done={phase2Done}
          isDone={isDone}
          finalItinerary={finalItinerary}
          onApprove={handleApprove}
          onHitlSend={handleHitlSend}
          hitl={hitl}
          selectedFlight={selectedFlight}
          setSelectedFlight={setSelectedFlight}
          selectedHotel={selectedHotel}
          setSelectedHotel={setSelectedHotel}
          status={status}
          agentStates={agentStates}
          timeline={timeline}
        />
      </div>
    </div>
  )
}
