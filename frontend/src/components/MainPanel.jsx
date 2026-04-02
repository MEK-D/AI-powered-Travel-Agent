import { useState } from 'react'
import OrchestratorPanel from './OrchestratorPanel'
import FlightPanel from './FlightPanel'
import HotelPanel from './HotelPanel'
import ItineraryPanel from './ItineraryPanel'
import ChatPanel from './ChatPanel'
import HitlPanel from './HitlPanel'
import ExecutionFlow from './ExecutionFlow'

const s = {
  mainPanel: {
    flex: 1, display: 'flex', flexDirection: 'column',
    background: '#0a0f1a', overflow: 'hidden',
  },
  tabBar: {
    display: 'flex', background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.07)',
    padding: '0 24px',
  },
  tab: (active) => ({
    padding: '18px 24px', background: 'none', border: 'none', borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
    color: active ? '#e2e8f0' : '#64748b', fontFamily: "'Outfit', sans-serif", fontSize: '.95rem', fontWeight: 700,
    cursor: 'pointer', transition: 'all .2s', marginRight: 8,
    '&:hover': { color: active ? '#e2e8f0' : '#94a3b8' },
  }),
  content: {
    flex: 1, overflow: 'hidden', position: 'relative',
  },
  panelContainer: {
    position: 'absolute', inset: 0, padding: 24,
    overflowY: 'auto',
  },
}

const TABS = [
  { id: 0, label: '🧠 Plan', icon: '🧠' },
  { id: 1, label: '✈️ Flights', icon: '✈️' },
  { id: 2, label: '🏨 Hotels', icon: '🏨' },
  { id: 3, label: '🗺️ Itinerary', icon: '🗺️' },
  { id: 4, label: '💬 Chat', icon: '💬' },
]

export default function MainPanel({
  activeTab,
  setActiveTab,
  scraped,
  phase1Done,
  phase2Done,
  isDone,
  finalItinerary,
  onApprove,
  onHitlSend,
  hitl,
  selectedFlight,
  setSelectedFlight,
  selectedHotel,
  setSelectedHotel,
  status,
  agentStates,
  timeline,
}) {
  if (status === 'paused' && hitl) {
    return (
      <main style={s.mainPanel}>
        <div style={s.tabBar}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              style={s.tab(activeTab === tab.id)}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={s.content}>
          <div style={s.panelContainer}>
            <HitlPanel hitl={hitl} onSend={onHitlSend} disabled={false} />
            <div style={{ marginTop: 24 }}>
               <ExecutionFlow timeline={timeline} />
            </div>
          </div>
        </div>
      </main>
    )
  }

  const renderPanel = () => {
    switch (activeTab) {
      case 0:
        return (
          <OrchestratorPanel
            onApprove={onApprove}
            status={status}
            agentStates={agentStates}
          />
        )
      case 1:
        return (
          <FlightPanel
            scraped={scraped}
            phase1Done={phase1Done}
            onApprove={() => onApprove(1)}
            selectedFlight={selectedFlight}
            setSelectedFlight={setSelectedFlight}
            status={status}
          />
        )
      case 2:
        return (
          <HotelPanel
            scraped={scraped}
            phase2Done={phase2Done}
            onApprove={() => onApprove(2)}
            selectedHotel={selectedHotel}
            setSelectedHotel={setSelectedHotel}
            status={status}
          />
        )
      case 3:
        return (
          <ItineraryPanel
            finalItinerary={finalItinerary}
            isDone={isDone}
            scraped={scraped}
          />
        )
      case 4:
        return (
          <ChatPanel
            status={status}
            isDone={isDone}
          />
        )
      default:
        return null
    }
  }

  return (
    <main style={s.mainPanel}>
      <div style={s.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            style={s.tab(activeTab === tab.id)}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={s.content}>
        <div style={s.panelContainer}>
          {renderPanel()}
          {timeline.length > 0 && (
            <div style={{ marginTop: 24 }}>
               <ExecutionFlow timeline={timeline} />
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
