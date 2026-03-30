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
    threadId, status, logs, agentStates, scraped,
    phase1Done, phase2Done, isDone, finalItinerary,
    startSession, approve, reset,
  } = useAgentStream({ onFlights: f => !selectedFlight && setSelectedFlight(f[0] || null),
                       onHotels:  h => !selectedHotel  && setSelectedHotel (h[0] || null) })

  const handleStart = useCallback(async () => {
    if (!prompt.trim()) return
    reset()
    setSelectedFlight(null)
    setSelectedHotel(null)
    setActiveTab(1)
    await startSession(prompt)
  }, [prompt, startSession, reset])

  const handleApprove = useCallback(async (phase) => {
    await approve(phase)
    setActiveTab(phase + 1)
  }, [approve])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header status={status} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          prompt={prompt}
          setPrompt={setPrompt}
          onStart={handleStart}
          agents={AGENT_META}
          agentStates={agentStates}
          logs={logs}
          disabled={status === 'running'}
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
          selectedFlight={selectedFlight}
          setSelectedFlight={setSelectedFlight}
          selectedHotel={selectedHotel}
          setSelectedHotel={setSelectedHotel}
          status={status}
        />
      </div>
    </div>
  )
}
